import { describe, expect, it, vi } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";
import type {
  CompletedGenerationProvenance,
  EvaluationGenerationJob,
  GenerationTaskResponse,
} from "@/lib/cloudinary/image-generation-contracts";
import { CloudinaryGenerationError } from "@/lib/cloudinary/image-generation-http";
import { defineReferenceManifest } from "@/lib/cloudinary/reference-manifest";

import { scoreDimensions } from "./contracts";
import { defineExperimentPlan } from "./experiment-contracts";
import {
  runExperiment,
  type ExperimentRunnerDependencies,
} from "./experiment-runner";
import type { ScoredCaseDecision } from "./visual-scoring";

const evaluationCase = productImagesV1.cases[0];
const references = defineReferenceManifest({
  assets: [
    {
      assetId: "reference0123456789abcdef0123456789",
      bytes: 250_000,
      etag: "abcdef0123456789abcdef0123456789",
      format: "png",
      height: 1024,
      key: evaluationCase.referenceAssetKey,
      publicId: "visual-evals/references/cobalt-trail-bottle-v1",
      resourceType: "image",
      type: "upload",
      version: 1_800_000_000,
      width: 1024,
    },
  ],
  datasetId: productImagesV1.id,
  datasetVersion: productImagesV1.version,
  schemaVersion: "1.0",
  updatedAt: "2026-10-07T00:00:00.000Z",
});
const plan = defineExperimentPlan(productImagesV1, {
  baseline: {
    id: "baseline-v1",
    label: "Accepted baseline",
    model: { id: "nano-banana-1-edit" },
    promptRevision: "prompt-v1",
    seed: 42,
  },
  candidate: {
    id: "candidate-v2",
    label: "Candidate revision",
    model: { id: "nano-banana-1-edit" },
    promptRevision: "prompt-v2",
    promptSuffix: "Use softer light.",
    seed: 42,
  },
  caseIds: [evaluationCase.id],
  datasetId: productImagesV1.id,
  datasetVersion: productImagesV1.version,
  id: "smoke-experiment-1",
  schemaVersion: "1.0",
});

function completedResponse(
  job: EvaluationGenerationJob,
  taskId: string,
): GenerationTaskResponse {
  return {
    data: {
      result: {
        assets: [
          {
            bytes: 512_000,
            created_at: "2026-10-07T16:00:00.000Z",
            format: "png",
            height: job.request.image_size.height,
            model: {
              family: "nano-banana",
              id: "nano-banana-1-edit",
              tier: "standard",
            },
            seed: job.request.seed ?? null,
            storage: {
              asset_id: `asset-${taskId}-0123456789`,
              public_id: job.request.target.public_id,
              resource_type: "image",
              secure_url: `https://res.cloudinary.com/demo/image/upload/v1800000001/${job.request.target.public_id}.png`,
              storage_type: "managed_asset",
              type: "upload",
              version: 1_800_000_001,
            },
            width: job.request.image_size.width,
          },
        ],
      },
      status: "completed",
      task_id: taskId,
    },
    notices: [],
    request_id: `request-${taskId}`,
  };
}

function passingScore(
  provenance: CompletedGenerationProvenance,
): ScoredCaseDecision {
  const sources = {
    category: null,
    code: null,
    modelVersion: 1,
    outcomeUnknown: null,
    reason: null,
    requestId: "analysis-request-1",
    retryable: null,
    statusCode: 200,
    status: "complete" as const,
  };

  return {
    decision: {
      aggregateScore: 100,
      decision: "pass",
      dimensions: scoreDimensions.map((dimension) => ({
        dimension,
        outcome: "pass" as const,
        reason: "Fixture passed.",
        score: 100,
      })),
      policyVersion: productImagesV1.policyVersion,
    },
    scoring: {
      asset: {
        assetId: provenance.output.assetId,
        publicId: provenance.output.publicId,
        version: provenance.output.version,
      },
      caseId: provenance.caseId,
      results: scoreDimensions.map((dimension) => ({
        dimension,
        findings: [],
        hardViolations: [],
        score: 100,
        status: "complete" as const,
      })),
      schemaVersion: "1.0",
      scoredAt: "2026-10-07T16:01:00.000Z",
      scorerVersion: "visual-scoring-1.0",
      sources: { quality: sources, safety: sources, vision: sources },
    },
  };
}

function createDependencies(options?: { failBaselineStart?: boolean }) {
  const jobs = new Map<string, EvaluationGenerationJob>();
  let tick = 0;
  let transientPollFailure = true;
  const startGeneration = vi.fn(async (job: EvaluationGenerationJob) => {
    if (options?.failBaselineStart && job.variant === "baseline") {
      throw new CloudinaryGenerationError({
        code: "request_timeout",
        operation: "start",
        outcomeUnknown: true,
        retryable: false,
      });
    }

    const taskId = job.variant === "baseline" ? "abc123" : "def456";
    jobs.set(taskId, job);
    return {
      data: { status: "pending", task_id: taskId },
      request_id: `start-${taskId}`,
    } satisfies GenerationTaskResponse;
  });
  const getGenerationTask = vi.fn(async (taskId: string) => {
    if (taskId === "abc123" && transientPollFailure) {
      transientPollFailure = false;
      throw new CloudinaryGenerationError({
        code: "temporary_poll_failure",
        operation: "poll",
        outcomeUnknown: false,
        retryable: true,
      });
    }

    const job = jobs.get(taskId);
    if (!job) throw new Error("Unexpected task ID in fixture.");
    return completedResponse(job, taskId);
  });
  const dependencies: ExperimentRunnerDependencies = {
    getGenerationTask,
    now: () => new Date(Date.UTC(2026, 9, 7, 16, 0, tick++)),
    readManagedAsset: vi.fn(async () => ({})),
    scoreCase: vi.fn(async ({ provenance }) => passingScore(provenance)),
    sleep: vi.fn(async () => undefined),
    startGeneration,
  };

  return { dependencies, getGenerationTask, startGeneration };
}

describe("experiment runner", () => {
  it("runs baseline and candidate with safe poll retries and progress", async () => {
    const { dependencies, getGenerationTask, startGeneration } =
      createDependencies();
    const progress = vi.fn();

    const record = await runExperiment({
      dataset: productImagesV1,
      dependencies,
      onProgress: progress,
      options: {
        maxPollAttempts: 1,
        maxPollRetries: 1,
        pollIntervalMs: 0,
        retryBaseDelayMs: 0,
      },
      plan,
      projectFolder: "visual-evals",
      references,
    });

    expect(startGeneration).toHaveBeenCalledTimes(2);
    expect(getGenerationTask).toHaveBeenCalledTimes(3);
    expect(record.aggregate).toMatchObject({
      caseCount: 1,
      pairedCompleteCount: 1,
      regressionCaseIds: [],
    });
    expect(record.cases[0].variants.map((variant) => variant.status)).toEqual([
      "complete",
      "complete",
    ]);
    expect(progress.mock.calls.map(([event]) => event.phase)).toEqual([
      "queued",
      "starting_generation",
      "waiting_generation",
      "verifying_asset",
      "scoring",
      "complete",
      "queued",
      "starting_generation",
      "waiting_generation",
      "verifying_asset",
      "scoring",
      "complete",
    ]);
  });

  it("does not retry an uncertain generation start or abort the other variant", async () => {
    const { dependencies, startGeneration } = createDependencies({
      failBaselineStart: true,
    });

    const record = await runExperiment({
      dataset: productImagesV1,
      dependencies,
      options: { pollIntervalMs: 0 },
      plan,
      projectFolder: "visual-evals",
      references,
    });

    expect(startGeneration).toHaveBeenCalledTimes(2);
    expect(record.cases[0].variants[0]).toMatchObject({
      failure: {
        code: "request_timeout",
        outcomeUnknown: true,
        phase: "starting_generation",
        retryable: false,
      },
      status: "failed",
      variant: "baseline",
    });
    expect(record.cases[0].variants[1].status).toBe("complete");
    expect(record.aggregate.pairedCompleteCount).toBe(0);
    expect(record.aggregate.variants.baseline.failed).toBe(1);
  });

  it("rejects missing references before making a paid request", async () => {
    const { dependencies, startGeneration } = createDependencies();
    const emptyReferences = defineReferenceManifest({
      ...references,
      assets: [],
    });

    await expect(
      runExperiment({
        dataset: productImagesV1,
        dependencies,
        plan,
        projectFolder: "visual-evals",
        references: emptyReferences,
      }),
    ).rejects.toThrow("No Cloudinary reference asset");
    expect(startGeneration).not.toHaveBeenCalled();
  });

  it("rejects a stale reference manifest before making a paid request", async () => {
    const { dependencies, startGeneration } = createDependencies();
    const staleReferences = defineReferenceManifest({
      ...references,
      datasetVersion: "2026-10-07.1",
    });

    await expect(
      runExperiment({
        dataset: productImagesV1,
        dependencies,
        plan,
        projectFolder: "visual-evals",
        references: staleReferences,
      }),
    ).rejects.toThrow("reference manifest");
    expect(startGeneration).not.toHaveBeenCalled();
  });
});
