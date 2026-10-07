import type { GenerationTaskResponse } from "@/lib/cloudinary/image-generation-contracts";
import {
  completeGenerationProvenance,
  createEvaluationGenerationJob,
  type EvaluationGenerationJob,
} from "@/lib/cloudinary/image-generation-contracts";
import { CloudinaryGenerationError } from "@/lib/cloudinary/image-generation-http";
import {
  resolveReferenceAsset,
  type ReferenceManifest,
} from "@/lib/cloudinary/reference-manifest";

import type { EvaluationCase, EvaluationDataset } from "./contracts";
import { aggregateExperimentResults } from "./experiment-aggregation";
import {
  defineExperimentPlan,
  type ExperimentFailure,
  type ExperimentCaseResult,
  type ExperimentPhase,
  type ExperimentPlan,
  type ExperimentProgressEvent,
  type ExperimentRunRecord,
  type ExperimentVariant,
  type ExperimentVariantResult,
} from "./experiment-contracts";
import type { ScoredCaseDecision } from "./visual-scoring";

interface ScoreCaseInput {
  dataset: EvaluationDataset;
  evaluationCase: EvaluationCase;
  provenance: ReturnType<typeof completeGenerationProvenance>;
  scoredAt: Date;
}

export interface ExperimentRunnerDependencies {
  getGenerationTask(taskId: string): Promise<GenerationTaskResponse>;
  now(): Date;
  readManagedAsset(
    provenance: ReturnType<typeof completeGenerationProvenance>,
  ): Promise<unknown>;
  scoreCase(input: ScoreCaseInput): Promise<ScoredCaseDecision>;
  sleep(delayMs: number): Promise<void>;
  startGeneration(
    job: EvaluationGenerationJob,
  ): Promise<GenerationTaskResponse>;
}

export interface ExperimentRunnerOptions {
  maxPollAttempts?: number;
  maxPollRetries?: number;
  pollIntervalMs?: number;
  retryBaseDelayMs?: number;
}

interface RunExperimentInput {
  dataset: EvaluationDataset;
  dependencies: ExperimentRunnerDependencies;
  onProgress?: (
    event: ExperimentProgressEvent,
  ) => Promise<void> | void;
  options?: ExperimentRunnerOptions;
  plan: ExperimentPlan;
  projectFolder: string;
  references: ReferenceManifest;
}

interface NormalizedRunnerOptions {
  maxPollAttempts: number;
  maxPollRetries: number;
  pollIntervalMs: number;
  retryBaseDelayMs: number;
}

class ExperimentRunnerError extends Error {
  constructor(
    readonly code: string,
    readonly outcomeUnknown: boolean,
    readonly retryable: boolean,
  ) {
    super("The experiment variant could not be completed.");
    this.name = "ExperimentRunnerError";
  }
}

function normalizeOptions(
  options: ExperimentRunnerOptions = {},
): NormalizedRunnerOptions {
  const normalized = {
    maxPollAttempts: options.maxPollAttempts ?? 60,
    maxPollRetries: options.maxPollRetries ?? 2,
    pollIntervalMs: options.pollIntervalMs ?? 1_000,
    retryBaseDelayMs: options.retryBaseDelayMs ?? 250,
  };

  if (
    !Number.isInteger(normalized.maxPollAttempts) ||
    normalized.maxPollAttempts < 1 ||
    !Number.isInteger(normalized.maxPollRetries) ||
    normalized.maxPollRetries < 0 ||
    !Number.isInteger(normalized.pollIntervalMs) ||
    normalized.pollIntervalMs < 0 ||
    !Number.isInteger(normalized.retryBaseDelayMs) ||
    normalized.retryBaseDelayMs < 0
  ) {
    throw new Error("Experiment runner options are invalid.");
  }

  return normalized;
}

function taskStatus(response: GenerationTaskResponse) {
  return response.data.status;
}

function failureFromError(
  error: unknown,
  phase: ExperimentFailure["phase"],
): ExperimentFailure {
  if (error instanceof CloudinaryGenerationError) {
    return {
      code: error.code,
      outcomeUnknown: error.outcomeUnknown,
      phase,
      requestId: error.requestId ?? null,
      retryable: error.retryable,
    };
  }

  if (error instanceof ExperimentRunnerError) {
    return {
      code: error.code,
      outcomeUnknown: error.outcomeUnknown,
      phase,
      requestId: null,
      retryable: error.retryable,
    };
  }

  return {
    code: "unexpected_runner_error",
    outcomeUnknown: true,
    phase,
    requestId: null,
    retryable: false,
  };
}

function canRetryPoll(error: unknown) {
  return (
    error instanceof CloudinaryGenerationError &&
    error.operation === "poll" &&
    error.retryable &&
    !error.outcomeUnknown
  );
}

async function pollWithRetry(
  taskId: string,
  dependencies: ExperimentRunnerDependencies,
  options: NormalizedRunnerOptions,
) {
  let retry = 0;

  while (true) {
    try {
      return await dependencies.getGenerationTask(taskId);
    } catch (error) {
      if (!canRetryPoll(error) || retry >= options.maxPollRetries) throw error;

      const delayMs = options.retryBaseDelayMs * 2 ** retry;
      retry += 1;
      await dependencies.sleep(delayMs);
    }
  }
}

async function waitForCompletedGeneration(
  initialResponse: GenerationTaskResponse,
  dependencies: ExperimentRunnerDependencies,
  options: NormalizedRunnerOptions,
  emitWaiting: (attempt: number) => Promise<void>,
) {
  let response = initialResponse;

  for (let attempt = 1; attempt <= options.maxPollAttempts; attempt += 1) {
    if (taskStatus(response) === "completed") return response;
    if (taskStatus(response) === "failed") {
      throw new ExperimentRunnerError("generation_task_failed", false, false);
    }

    await emitWaiting(attempt);
    await dependencies.sleep(options.pollIntervalMs);
    response = await pollWithRetry(
      response.data.task_id,
      dependencies,
      options,
    );

    if (taskStatus(response) === "completed") return response;
    if (taskStatus(response) === "failed") {
      throw new ExperimentRunnerError("generation_task_failed", false, false);
    }
  }

  throw new ExperimentRunnerError("generation_poll_limit_reached", false, true);
}

function configurationForVariant(
  plan: ExperimentPlan,
  variant: ExperimentVariant,
) {
  return variant === "baseline" ? plan.baseline : plan.candidate;
}

async function runVariant(input: {
  dataset: EvaluationDataset;
  dependencies: ExperimentRunnerDependencies;
  evaluationCase: EvaluationCase;
  onProgress?: RunExperimentInput["onProgress"];
  options: NormalizedRunnerOptions;
  plan: ExperimentPlan;
  projectFolder: string;
  reference: ReturnType<typeof resolveReferenceAsset>;
  variant: ExperimentVariant;
}): Promise<ExperimentVariantResult> {
  const configuration = configurationForVariant(input.plan, input.variant);
  let phase: ExperimentFailure["phase"] = "starting_generation";

  const emit = async (nextPhase: ExperimentPhase, attempt = 0) => {
    await input.onProgress?.({
      attempt,
      caseId: input.evaluationCase.id,
      occurredAt: input.dependencies.now().toISOString(),
      phase: nextPhase,
      variant: input.variant,
    });
  };

  await emit("queued");

  try {
    const job = createEvaluationGenerationJob({
      configuration,
      dataset: input.dataset,
      evaluationCase: input.evaluationCase,
      experimentId: input.plan.id,
      projectFolder: input.projectFolder,
      reference: input.reference,
      variant: input.variant,
    });
    const submittedAt = input.dependencies.now();

    await emit("starting_generation");
    const initialResponse = await input.dependencies.startGeneration(job);

    phase = "waiting_generation";
    const completedResponse = await waitForCompletedGeneration(
      initialResponse,
      input.dependencies,
      input.options,
      (attempt) => emit("waiting_generation", attempt),
    );
    const completedAt = input.dependencies.now();
    const provenance = completeGenerationProvenance({
      completedAt,
      job,
      response: completedResponse,
      submittedAt,
    });

    phase = "verifying_asset";
    await emit("verifying_asset");
    await input.dependencies.readManagedAsset(provenance);

    phase = "scoring";
    await emit("scoring");
    const scoring = await input.dependencies.scoreCase({
      dataset: input.dataset,
      evaluationCase: input.evaluationCase,
      provenance,
      scoredAt: input.dependencies.now(),
    });

    await emit("complete");
    return {
      configurationId: configuration.id,
      provenance,
      scoring,
      status: "complete",
      variant: input.variant,
    };
  } catch (error) {
    const failure = failureFromError(error, phase);
    await emit("failed");

    return {
      configurationId: configuration.id,
      failure,
      status: "failed",
      variant: input.variant,
    };
  }
}

export async function runExperiment(
  input: RunExperimentInput,
): Promise<ExperimentRunRecord> {
  const plan = defineExperimentPlan(input.dataset, input.plan);
  const options = normalizeOptions(input.options);

  if (
    input.references.datasetId !== input.dataset.id ||
    input.references.datasetVersion !== input.dataset.version
  ) {
    throw new Error("The reference manifest does not match the active dataset.");
  }

  const selectedCases = plan.caseIds.map((caseId) => {
    const evaluationCase = input.dataset.cases.find(
      (candidate) => candidate.id === caseId,
    );

    if (!evaluationCase) {
      throw new Error(`Unknown evaluation case: ${caseId}.`);
    }

    return {
      evaluationCase,
      reference: resolveReferenceAsset(
        input.references,
        evaluationCase.referenceAssetKey,
      ),
    };
  });
  const startedAt = input.dependencies.now();
  const cases: ExperimentCaseResult[] = [];

  for (const { evaluationCase, reference } of selectedCases) {
    const baseline = await runVariant({
      ...input,
      evaluationCase,
      options,
      plan,
      reference,
      variant: "baseline",
    });
    const candidate = await runVariant({
      ...input,
      evaluationCase,
      options,
      plan,
      reference,
      variant: "candidate",
    });

    cases.push({
      caseId: evaluationCase.id,
      variants: [baseline, candidate],
    });
  }

  return {
    aggregate: aggregateExperimentResults(cases),
    cases,
    completedAt: input.dependencies.now().toISOString(),
    datasetId: input.dataset.id,
    datasetVersion: input.dataset.version,
    id: plan.id,
    schemaVersion: "1.0",
    startedAt: startedAt.toISOString(),
  };
}
