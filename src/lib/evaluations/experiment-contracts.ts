import { z } from "zod";

import type {
  CompletedGenerationProvenance,
  EvaluationGenerationJob,
  GenerationTaskResponse,
} from "@/lib/cloudinary/image-generation-contracts";
import { generationConfigurationSchema } from "@/lib/cloudinary/image-generation-contracts";

import type { EvaluationDataset, ScoreDimension } from "./contracts";
import type { ScoredCaseDecision } from "./visual-scoring";

const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const experimentPlanSchema = z
  .object({
    baseline: generationConfigurationSchema,
    candidate: generationConfigurationSchema,
    caseIds: z.array(identifierSchema).min(1).max(50),
    datasetId: identifierSchema,
    datasetVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
    id: identifierSchema,
    schemaVersion: z.literal("1.0"),
  })
  .strict()
  .superRefine((plan, context) => {
    if (new Set(plan.caseIds).size !== plan.caseIds.length) {
      context.addIssue({
        code: "custom",
        message: "Experiment case IDs must be unique.",
        path: ["caseIds"],
      });
    }

    if (plan.baseline.id === plan.candidate.id) {
      context.addIssue({
        code: "custom",
        message: "Baseline and candidate configuration IDs must differ.",
        path: ["candidate", "id"],
      });
    }
  });

export type ExperimentPlan = z.infer<typeof experimentPlanSchema>;
export type ExperimentVariant = "baseline" | "candidate";
export type ExperimentPhase =
  | "queued"
  | "starting_generation"
  | "waiting_generation"
  | "verifying_asset"
  | "scoring"
  | "complete"
  | "failed";

export interface ExperimentProgressEvent {
  attempt: number;
  caseId: string;
  occurredAt: string;
  phase: ExperimentPhase;
  variant: ExperimentVariant;
}

export interface ExperimentFailure {
  code: string;
  generation?: ExperimentGenerationRecovery;
  outcomeUnknown: boolean;
  phase: Exclude<ExperimentPhase, "queued" | "complete" | "failed">;
  requestId: string | null;
  /** Accepted or uncertain generations must be reconciled, not resubmitted. */
  retryable: boolean;
}

/** Reconcile this submission without starting another billable generation. */
export interface ExperimentGenerationRecovery {
  job: EvaluationGenerationJob;
  lastStatus: GenerationTaskResponse["data"]["status"] | "unknown";
  /** Request ID returned when the generation was accepted, if received. */
  requestId: string | null;
  submittedAt: string;
  targetPublicId: string;
  taskId: string | null;
}

export type ExperimentVariantResult =
  | {
      configurationId: string;
      failure: ExperimentFailure;
      status: "failed";
      variant: ExperimentVariant;
    }
  | {
      configurationId: string;
      provenance: CompletedGenerationProvenance;
      scoring: ScoredCaseDecision;
      status: "complete";
      variant: ExperimentVariant;
    };

export interface ExperimentCaseResult {
  caseId: string;
  variants: [ExperimentVariantResult, ExperimentVariantResult];
}

export interface VariantDecisionCounts {
  complete: number;
  fail: number;
  failed: number;
  pass: number;
  review: number;
}

export interface DimensionAggregate {
  averageScore: number | null;
  completeCount: number;
  failCount: number;
  incompleteCount: number;
  passCount: number;
  passRate: number;
  reviewCount: number;
}

export interface DimensionComparison {
  baseline: DimensionAggregate;
  candidate: DimensionAggregate;
  dimension: ScoreDimension;
  passRateDelta: number;
  scoreDelta: number | null;
}

export interface ExperimentAggregate {
  caseCount: number;
  dimensions: DimensionComparison[];
  pairedCompleteCount: number;
  regressionCaseIds: string[];
  variants: Record<ExperimentVariant, VariantDecisionCounts>;
}

export interface ExperimentRunRecord {
  aggregate: ExperimentAggregate;
  cases: ExperimentCaseResult[];
  completedAt: string;
  datasetId: string;
  datasetVersion: string;
  id: string;
  schemaVersion: "1.0";
  startedAt: string;
}

export function defineExperimentPlan(
  dataset: Pick<EvaluationDataset, "cases" | "id" | "version">,
  input: unknown,
): ExperimentPlan {
  const plan = experimentPlanSchema.parse(input);

  if (plan.datasetId !== dataset.id || plan.datasetVersion !== dataset.version) {
    throw new Error("The experiment plan does not match the active dataset.");
  }

  const knownCases = new Set(dataset.cases.map((evaluationCase) => evaluationCase.id));
  const unknownCase = plan.caseIds.find((caseId) => !knownCases.has(caseId));

  if (unknownCase) {
    throw new Error(`The experiment plan contains an unknown case: ${unknownCase}.`);
  }

  return plan;
}
