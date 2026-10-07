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
import {
  defineExperimentPlan,
  type ExperimentProgressEvent,
} from "./experiment-contracts";
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
      contentSha256: "a".repeat(64),
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
        generation: {
          job: startGeneration.mock.calls[0][0],
          lastStatus: "unknown",
          requestId: null,
          submittedAt: expect.any(String),
          targetPublicId: `visual-evals/${plan.id}/${evaluationCase.id}/baseline`,
          taskId: null,
        },
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

  it("retains accepted jobs when polling ends with generation still processing", async () => {
    const { dependencies, getGenerationTask, startGeneration } =
      createDependencies();
    getGenerationTask.mockImplementation(async (taskId) => ({
      data: { status: "processing", task_id: taskId },
      request_id: `poll-${taskId}`,
    }));

    const record = await runExperiment({
      dataset: productImagesV1,
      dependencies,
      options: { maxPollAttempts: 1, pollIntervalMs: 0 },
      plan,
      projectFolder: "visual-evals",
      references,
    });

    expect(startGeneration).toHaveBeenCalledTimes(2);
    expect(getGenerationTask).toHaveBeenCalledTimes(2);
    expect(record.cases[0].variants[0]).toMatchObject({
      failure: {
        code: "generation_poll_limit_reached",
        generation: {
          job: startGeneration.mock.calls[0][0],
          lastStatus: "processing",
          requestId: "start-abc123",
          submittedAt: expect.any(String),
          targetPublicId: `visual-evals/${plan.id}/${evaluationCase.id}/baseline`,
          taskId: "abc123",
        },
        outcomeUnknown: true,
        phase: "waiting_generation",
        requestId: "start-abc123",
        retryable: false,
      },
      status: "failed",
    });
    expect(record.cases[0].variants[1]).toMatchObject({
      failure: {
        generation: { taskId: "def456" },
        outcomeUnknown: true,
        retryable: false,
      },
      status: "failed",
    });
    expect(dependencies.readManagedAsset).not.toHaveBeenCalled();
    expect(dependencies.scoreCase).not.toHaveBeenCalled();
  });

  it("retains the accepted task after exhausting safe poll retries", async () => {
    const { dependencies, getGenerationTask, startGeneration } =
      createDependencies();
    getGenerationTask.mockRejectedValue(
      new CloudinaryGenerationError({
        code: "network_error",
        operation: "poll",
        outcomeUnknown: false,
        requestId: "failed-poll-request",
        retryable: true,
      }),
    );

    const record = await runExperiment({
      dataset: productImagesV1,
      dependencies,
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
    expect(getGenerationTask).toHaveBeenCalledTimes(4);
    expect(record.cases[0].variants[0]).toMatchObject({
      failure: {
        code: "network_error",
        generation: {
          job: startGeneration.mock.calls[0][0],
          lastStatus: "pending",
          requestId: "start-abc123",
          taskId: "abc123",
        },
        outcomeUnknown: true,
        phase: "waiting_generation",
        requestId: "failed-poll-request",
        retryable: false,
      },
      status: "failed",
    });
  });

  it("distinguishes a known failed task from an unresolved generation", async () => {
    const { dependencies, getGenerationTask } = createDependencies();
    getGenerationTask.mockImplementation(async (taskId) => ({
      data: { status: "failed", task_id: taskId },
      request_id: `poll-${taskId}`,
    }));

    const record = await runExperiment({
      dataset: productImagesV1,
      dependencies,
      options: { maxPollAttempts: 1, pollIntervalMs: 0 },
      plan,
      projectFolder: "visual-evals",
      references,
    });

    expect(record.cases[0].variants[0]).toMatchObject({
      failure: {
        code: "generation_task_failed",
        generation: { lastStatus: "failed", taskId: "abc123" },
        outcomeUnknown: false,
        retryable: false,
      },
      status: "failed",
    });
  });

  it("retains completed generation identity when asset verification fails", async () => {
    const { dependencies, startGeneration } = createDependencies();
    vi.mocked(dependencies.readManagedAsset).mockImplementation(
      async (provenance) => {
        if (provenance.variant === "baseline") {
          throw new Error("Sensitive provider diagnostic.");
        }

        return {};
      },
    );

    const record = await runExperiment({
      dataset: productImagesV1,
      dependencies,
      options: { pollIntervalMs: 0, retryBaseDelayMs: 0 },
      plan,
      projectFolder: "visual-evals",
      references,
    });

    expect(startGeneration).toHaveBeenCalledTimes(2);
    expect(record.cases[0].variants[0]).toMatchObject({
      failure: {
        code: "unexpected_runner_error",
        generation: {
          job: startGeneration.mock.calls[0][0],
          lastStatus: "completed",
          requestId: "start-abc123",
          taskId: "abc123",
        },
        phase: "verifying_asset",
        retryable: false,
      },
      status: "failed",
    });
    expect(JSON.stringify(record)).not.toContain("Sensitive provider diagnostic");
    expect(record.cases[0].variants[1].status).toBe("complete");
    expect(dependencies.scoreCase).toHaveBeenCalledTimes(1);
  });

  it.each(["throw", "reject"])(
    "keeps completed provider results when a progress observer would %s",
    async (behavior) => {
      const { dependencies, startGeneration } = createDependencies();
      const progress = vi.fn(() => {
        if (behavior === "throw") throw new Error("Observer disconnected.");
        return Promise.reject(new Error("Observer disconnected."));
      });

      const record = await runExperiment({
        dataset: productImagesV1,
        dependencies,
        onProgress: progress,
        options: { pollIntervalMs: 0, retryBaseDelayMs: 0 },
        plan,
        projectFolder: "visual-evals",
        references,
      });

      expect(startGeneration).toHaveBeenCalledTimes(2);
      expect(progress).toHaveBeenCalled();
      expect(record.cases[0].variants.map((variant) => variant.status)).toEqual([
        "complete",
        "complete",
      ]);
      expect(record.aggregate.pairedCompleteCount).toBe(1);
    },
  );

  it("preserves provider failure and continues when its failure observer rejects", async () => {
    const { dependencies, startGeneration } = createDependencies({
      failBaselineStart: true,
    });
    const progress = vi.fn(async (event: ExperimentProgressEvent) => {
      if (event.phase === "failed") throw new Error("Observer disconnected.");
    });

    const record = await runExperiment({
      dataset: productImagesV1,
      dependencies,
      onProgress: progress,
      options: { pollIntervalMs: 0, retryBaseDelayMs: 0 },
      plan,
      projectFolder: "visual-evals",
      references,
    });

    expect(startGeneration).toHaveBeenCalledTimes(2);
    expect(record.cases[0].variants[0]).toMatchObject({
      failure: { code: "request_timeout", outcomeUnknown: true },
      status: "failed",
    });
    expect(record.cases[0].variants[1].status).toBe("complete");
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
