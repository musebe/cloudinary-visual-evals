import "server-only";

import type { CompletedGenerationProvenance } from "@/lib/cloudinary/image-generation-contracts";
import { getCloudinaryEnvironment } from "@/lib/config/cloudinary-env.server";
import type {
  EvaluationCase,
  EvaluationDataset,
} from "@/lib/evaluations/contracts";
import { runCaseScoring } from "@/lib/evaluations/visual-scoring-runner";

import type {
  AIVisionGeneralRequest,
  AIVisionModerationRequest,
  ImageQualityRequest,
} from "./analyze-contracts";
import { createCloudinaryAnalyzeTransport } from "./analyze-http";

function getAnalyzeTransport() {
  const environment = getCloudinaryEnvironment();

  return createCloudinaryAnalyzeTransport({
    apiKey: environment.CLOUDINARY_API_KEY,
    apiSecret: environment.CLOUDINARY_API_SECRET,
    cloudName: environment.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    timeoutMs: environment.CLOUDINARY_ANALYZE_API_TIMEOUT_MS,
  });
}

export function analyzeVisualRequirements(input: AIVisionGeneralRequest) {
  return getAnalyzeTransport().analyzeGeneral(input);
}

export function analyzeVisualSafety(input: AIVisionModerationRequest) {
  return getAnalyzeTransport().analyzeModeration(input);
}

export function analyzeTechnicalQuality(input: ImageQualityRequest) {
  return getAnalyzeTransport().analyzeImageQuality(input);
}

export function scoreManagedEvaluationCase(input: {
  dataset: EvaluationDataset;
  evaluationCase: EvaluationCase;
  provenance: CompletedGenerationProvenance;
  scoredAt: Date;
}) {
  return runCaseScoring({
    ...input,
    client: getAnalyzeTransport(),
  });
}
