import type { CompletedGenerationProvenance } from "@/lib/cloudinary/image-generation-contracts";

import type { EvaluationCase, EvaluationDataset } from "./contracts";

export function createTestGenerationProvenance(
  dataset: Pick<EvaluationDataset, "id" | "version">,
  evaluationCase: EvaluationCase,
): CompletedGenerationProvenance {
  const publicId = `visual-evals/run/${evaluationCase.id}/candidate`;

  return {
    caseId: evaluationCase.id,
    cloudinaryRequestId: "generation-request-1",
    cloudinaryTaskId: "generation-task-1",
    completedAt: "2026-10-07T13:59:00.000Z",
    configurationId: "candidate-v1",
    datasetId: dataset.id,
    datasetVersion: dataset.version,
    durationMs: 9_000,
    executedPrompt: evaluationCase.prompt,
    executedPromptHash:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    experimentId: "visual-scoring-test",
    notices: [],
    output: {
      assetId: "fedcba9876543210fedcba9876543210",
      bytes: 640_000,
      createdAt: "2026-10-07T13:59:00.000Z",
      format: "png",
      height: evaluationCase.output.height,
      publicId,
      resourceType: "image",
      secureUrl: `https://res.cloudinary.com/demo/image/upload/v1800000001/${publicId}.png`,
      type: "upload",
      version: 1_800_000_001,
      width: evaluationCase.output.width,
    },
    promptVersion: `${evaluationCase.promptVersion}:candidate-prompt-v1`,
    quota: null,
    reference: {
      assetId: "0123456789abcdef0123456789abcdef",
      etag: "abcdef0123456789abcdef0123456789",
      key: evaluationCase.referenceAssetKey,
      publicId: `visual-evals/references/${evaluationCase.productId}`,
      version: 1_800_000_000,
    },
    requested: {
      format: "png",
      height: evaluationCase.output.height,
      model: { id: "nano-banana-1-edit" },
      seed: 42,
      targetPublicId: publicId,
      width: evaluationCase.output.width,
    },
    resolved: {
      model: {
        family: "nano-banana",
        id: "nano-banana-1-edit",
        tier: "standard",
      },
      seed: 42,
    },
    schemaVersion: "1.0",
    submittedAt: "2026-10-07T13:58:51.000Z",
    variant: "candidate",
  };
}
