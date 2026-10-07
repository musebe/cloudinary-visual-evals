import { describe, expect, it, vi } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";
import { CloudinaryAnalyzeError } from "@/lib/cloudinary/analyze-http";

import { safetyRejectionQuestions } from "./visual-scoring";
import {
  runCaseScoring,
  type VisualAnalysisClient,
} from "./visual-scoring-runner";
import { createTestGenerationProvenance } from "./visual-scoring.test-fixtures";

const evaluationCase = productImagesV1.cases[0];
const provenance = createTestGenerationProvenance(
  productImagesV1,
  evaluationCase,
);

const assessment = {
  promptAdherence: {
    missingRequired: [],
    presentForbidden: [],
    summary: "Prompt requirements passed.",
    uncertainForbidden: [],
    uncertainRequired: [],
  },
  referenceFidelity: {
    identityDrift: "no",
    missingIdentityAttributes: [],
    presentForbiddenIdentityAttributes: [],
    summary: "Product identity passed.",
    uncertainIdentityAttributes: [],
  },
  textIntegrity: {
    legibility: "clear",
    observedText: [...evaluationCase.expected.exactText],
    summary: "Text passed.",
  },
};

function client(): VisualAnalysisClient {
  return {
    analyzeGeneral: vi.fn(async () => ({
      data: {
        analysis: {
          model_version: 1,
          responses: [{ value: JSON.stringify(assessment) }],
        },
        entity: provenance.output.secureUrl,
      },
      request_id: "vision-request-1",
    })),
    analyzeImageQuality: vi.fn(async () => ({
      data: {
        analysis: {
          confidence: 0.9,
          model_version: 1,
          quality: "high",
          score: 0.9,
        },
        entity: provenance.output.secureUrl,
      },
      request_id: "quality-request-1",
    })),
    analyzeModeration: vi.fn(async () => ({
      data: {
        analysis: {
          model_version: 1,
          responses: safetyRejectionQuestions.map((prompt) => ({
            prompt,
            value: "no" as const,
          })),
        },
        entity: provenance.output.secureUrl,
      },
      request_id: "safety-request-1",
    })),
  };
}

describe("visual scoring runner", () => {
  it("runs independent evidence channels in parallel and returns a decision", async () => {
    const analysisClient = client();
    const result = await runCaseScoring({
      client: analysisClient,
      dataset: productImagesV1,
      evaluationCase,
      provenance,
      scoredAt: new Date("2026-10-07T14:00:00.000Z"),
    });

    expect(result.decision.decision).toBe("pass");
    expect(analysisClient.analyzeGeneral).toHaveBeenCalledOnce();
    expect(analysisClient.analyzeImageQuality).toHaveBeenCalledOnce();
    expect(analysisClient.analyzeModeration).toHaveBeenCalledOnce();
  });

  it("captures a provider failure as review evidence without leaking details", async () => {
    const analysisClient = client();
    analysisClient.analyzeImageQuality = vi.fn(async () => {
      throw new CloudinaryAnalyzeError({
        category: "rate_limit_error",
        code: "ANALYZE_00429",
        endpoint: "image_quality",
        outcomeUnknown: false,
        requestId: "rate-limited-request",
        retryable: true,
        status: 429,
      });
    });

    const result = await runCaseScoring({
      client: analysisClient,
      dataset: productImagesV1,
      evaluationCase,
      provenance,
      scoredAt: new Date("2026-10-07T14:00:00.000Z"),
    });

    expect(result.decision.decision).toBe("review");
    expect(result.decision.aggregateScore).toBeNull();
    expect(result.scoring.sources.quality).toEqual({
      category: "rate_limit_error",
      code: "ANALYZE_00429",
      modelVersion: null,
      outcomeUnknown: false,
      reason: "Image-quality analysis could not be completed (ANALYZE_00429).",
      requestId: "rate-limited-request",
      retryable: true,
      statusCode: 429,
      status: "error",
    });
  });

  it("rejects stale dataset provenance before starting paid analysis", async () => {
    const analysisClient = client();

    await expect(
      runCaseScoring({
        client: analysisClient,
        dataset: productImagesV1,
        evaluationCase,
        provenance: {
          ...provenance,
          datasetVersion: "2026-10-07.1",
        },
        scoredAt: new Date("2026-10-07T14:00:00.000Z"),
      }),
    ).rejects.toThrow("committed case identity");

    expect(analysisClient.analyzeGeneral).not.toHaveBeenCalled();
    expect(analysisClient.analyzeImageQuality).not.toHaveBeenCalled();
    expect(analysisClient.analyzeModeration).not.toHaveBeenCalled();
  });

  it("sanitizes an unexpected provider failure into review evidence", async () => {
    const analysisClient = client();
    analysisClient.analyzeGeneral = vi.fn(async () => {
      throw new Error("Sensitive provider detail");
    });

    const result = await runCaseScoring({
      client: analysisClient,
      dataset: productImagesV1,
      evaluationCase,
      provenance,
      scoredAt: new Date("2026-10-07T14:00:00.000Z"),
    });

    expect(result.decision.decision).toBe("review");
    expect(result.scoring.sources.vision).toMatchObject({
      code: "unexpected_analysis_error",
      outcomeUnknown: true,
      retryable: false,
      status: "error",
    });
    expect(JSON.stringify(result)).not.toContain("Sensitive provider detail");
  });
});
