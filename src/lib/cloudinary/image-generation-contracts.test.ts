import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";

import {
  completeGenerationProvenance,
  createEvaluationGenerationJob,
  generationModelSelectionSchema,
  type GenerationConfiguration,
  type GenerationTaskResponse,
} from "./image-generation-contracts";
import type { ReferenceAsset } from "./reference-manifest";

const evaluationCase = productImagesV1.cases[0];
const reference: ReferenceAsset = {
  assetId: "0123456789abcdef0123456789abcdef",
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
};
const configuration: GenerationConfiguration = {
  format: "png",
  id: "nano-banana-standard-v1",
  label: "Pinned baseline",
  model: { id: "nano-banana-1-edit" },
  promptRevision: "reference-prompt-v1",
  promptSuffix: "",
  seed: 42,
};

function createJob(variant: "baseline" | "candidate" = "baseline") {
  return createEvaluationGenerationJob({
    configuration,
    dataset: productImagesV1,
    evaluationCase,
    experimentId: "smoke-run-2026-10-07",
    projectFolder: "visual-evals",
    reference,
    variant,
  });
}

function completedTask(publicId: string): GenerationTaskResponse {
  return {
    data: {
      limits: {
        addons_quota: [
          {
            limit: 50,
            remaining: 48,
            type: "image_generation",
            used_by_request: 2,
          },
        ],
      },
      result: {
        assets: [
          {
            bytes: 640_000,
            created_at: "2026-10-07T10:00:08.000Z",
            format: "webp",
            height: 960,
            model: {
              family: "nano-banana",
              id: "nano-banana-1-edit",
              tier: "standard",
            },
            seed: null,
            storage: {
              asset_id: "fedcba9876543210fedcba9876543210",
              public_id: publicId,
              resource_type: "image",
              secure_url: `https://res.cloudinary.com/demo/image/upload/v1800000001/${publicId}.webp`,
              storage_type: "managed_asset",
              type: "upload",
              version: 1_800_000_001,
            },
            width: 960,
          },
        ],
      },
      status: "completed",
      task_id: "abc123",
    },
    notices: [
      {
        severity: "info",
        text: "The requested format was mapped to a supported format.",
      },
    ],
    request_id: "request-123",
  };
}

describe("image generation contracts", () => {
  it("builds a traceable managed-asset request without modifying the prompt", () => {
    const job = createJob();

    expect(job.request.async).toBe(true);
    expect(job.request.prompt).toBe(evaluationCase.prompt);
    expect(job.request.prompt).toContain("[1]");
    expect(job.request.reference_images).toEqual([
      {
        asset_id: reference.assetId,
        source_type: "managed_asset",
      },
    ]);
    expect(job.request.target.public_id).toBe(
      `visual-evals/smoke-run-2026-10-07/${evaluationCase.id}/baseline`,
    );
    expect(job.executedPromptHash).toHaveLength(64);
  });

  it("keeps baseline and candidate outputs in separate deterministic targets", () => {
    expect(createJob("baseline").request.target.public_id).not.toBe(
      createJob("candidate").request.target.public_id,
    );
  });

  it("rejects ambiguous model selectors", () => {
    expect(
      generationModelSelectionSchema.safeParse({
        id: "nano-banana-1-edit",
        mode: "auto",
      }).success,
    ).toBe(false);
  });

  it("preserves requested and actual output details instead of hiding fallbacks", () => {
    const job = createJob();
    const submittedAt = new Date("2026-10-07T10:00:00.000Z");
    const completedAt = new Date("2026-10-07T10:00:08.000Z");
    const result = completeGenerationProvenance({
      completedAt,
      job,
      response: completedTask(job.request.target.public_id),
      submittedAt,
    });

    expect(result.requested).toMatchObject({
      format: "png",
      height: 1024,
      seed: 42,
      width: 1024,
    });
    expect(result.output).toMatchObject({
      format: "webp",
      height: 960,
      width: 960,
    });
    expect(result.resolved.seed).toBeNull();
    expect(result.resolved.model.id).toBe("nano-banana-1-edit");
    expect(result.quota?.remaining).toBe(48);
    expect(result.durationMs).toBe(8_000);
  });

  it("fails closed when Cloudinary returns a different target identity", () => {
    const job = createJob();

    expect(() =>
      completeGenerationProvenance({
        completedAt: new Date("2026-10-07T10:00:08.000Z"),
        job,
        response: completedTask("visual-evals/unexpected-output"),
        submittedAt: new Date("2026-10-07T10:00:00.000Z"),
      }),
    ).toThrow("unexpected managed asset");
  });
});
