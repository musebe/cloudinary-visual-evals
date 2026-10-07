import {
  CloudinaryAnalyzeError,
} from "@/lib/cloudinary/analyze-http";
import type {
  AIVisionGeneralRequest,
  AIVisionGeneralResponse,
  AIVisionModerationRequest,
  AIVisionModerationResponse,
  ImageQualityRequest,
  ImageQualityResponse,
} from "@/lib/cloudinary/analyze-contracts";
import type { CompletedGenerationProvenance } from "@/lib/cloudinary/image-generation-contracts";

import type { EvaluationCase, EvaluationDataset } from "./contracts";
import {
  createCaseAnalysisRequests,
  decideScoredCase,
  scoreEvaluationCase,
  type ScoredCaseDecision,
  type ScoringEvidence,
} from "./visual-scoring";

export interface VisualAnalysisClient {
  analyzeGeneral(
    input: AIVisionGeneralRequest,
  ): Promise<AIVisionGeneralResponse>;
  analyzeImageQuality(input: ImageQualityRequest): Promise<ImageQualityResponse>;
  analyzeModeration(
    input: AIVisionModerationRequest,
  ): Promise<AIVisionModerationResponse>;
}

interface RunCaseScoringInput {
  client: VisualAnalysisClient;
  dataset: EvaluationDataset;
  evaluationCase: EvaluationCase;
  provenance: CompletedGenerationProvenance;
  scoredAt: Date;
}

async function captureEvidence<T>(
  label: string,
  request: () => Promise<T>,
): Promise<ScoringEvidence<T>> {
  try {
    return { status: "complete", value: await request() };
  } catch (error) {
    if (error instanceof CloudinaryAnalyzeError) {
      return {
        category: error.category,
        code: error.code,
        outcomeUnknown: error.outcomeUnknown,
        reason: `${label} could not be completed (${error.code}).`,
        requestId: error.requestId,
        retryable: error.retryable,
        statusCode: error.status,
        status: "error",
      };
    }

    return {
      code: "unexpected_analysis_error",
      outcomeUnknown: true,
      reason: `${label} could not be completed.`,
      retryable: false,
      status: "error",
    };
  }
}

export async function runCaseScoring(
  input: RunCaseScoringInput,
): Promise<ScoredCaseDecision> {
  const requests = createCaseAnalysisRequests(
    input.dataset,
    input.evaluationCase,
    input.provenance,
  );

  const [vision, quality, safety] = await Promise.all([
    captureEvidence("AI Vision analysis", () =>
      input.client.analyzeGeneral(requests.vision),
    ),
    captureEvidence("Image-quality analysis", () =>
      input.client.analyzeImageQuality(requests.quality),
    ),
    captureEvidence("Safety analysis", () =>
      input.client.analyzeModeration(requests.safety),
    ),
  ]);

  const scoring = scoreEvaluationCase({
    evaluationCase: input.evaluationCase,
    product: requests.product,
    provenance: input.provenance,
    quality,
    safety,
    scoredAt: input.scoredAt,
    vision,
  });

  return decideScoredCase(input.dataset, input.evaluationCase, scoring);
}
