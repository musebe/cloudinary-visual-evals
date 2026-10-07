import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";
import type {
  AIVisionGeneralResponse,
  AIVisionModerationResponse,
  ImageQualityResponse,
} from "@/lib/cloudinary/analyze-contracts";
import {
  createCaseAnalysisRequests,
  decideScoredCase,
  safetyRejectionQuestions,
  scoreEvaluationCase,
  type AIVisionAssessment,
  type CaseScoringInput,
} from "./visual-scoring";
import { createTestGenerationProvenance } from "./visual-scoring.test-fixtures";

const evaluationCase = productImagesV1.cases[0];
const product = productImagesV1.products.find(
  (candidate) => candidate.id === evaluationCase.productId,
)!;

const provenance = createTestGenerationProvenance(
  productImagesV1,
  evaluationCase,
);

function passingAssessment(): AIVisionAssessment {
  return {
    promptAdherence: {
      missingRequired: [],
      presentForbidden: [],
      summary: "Every committed prompt requirement is visibly satisfied.",
      uncertainForbidden: [],
      uncertainRequired: [],
    },
    referenceFidelity: {
      identityDrift: "no",
      missingIdentityAttributes: [],
      presentForbiddenIdentityAttributes: [],
      summary: "The visible product retains its committed identity attributes.",
      uncertainIdentityAttributes: [],
    },
    textIntegrity: {
      legibility: "clear",
      observedText: [...evaluationCase.expected.exactText],
      summary: "The expected text is visible and exact.",
    },
  };
}

function visionResponse(
  assessment: AIVisionAssessment | string = passingAssessment(),
): AIVisionGeneralResponse {
  return {
    data: {
      analysis: {
        model_version: 1,
        responses: [
          {
            value:
              typeof assessment === "string"
                ? assessment
                : JSON.stringify(assessment),
          },
        ],
      },
      entity: provenance.output.secureUrl,
    },
    request_id: "vision-request-1",
  };
}

function safetyResponse(
  value: "yes" | "no" | "unknown" = "no",
): AIVisionModerationResponse {
  return {
    data: {
      analysis: {
        model_version: 1,
        responses: safetyRejectionQuestions.map((prompt) => ({
          prompt,
          value,
        })),
      },
      entity: provenance.output.secureUrl,
    },
    request_id: "safety-request-1",
  };
}

function qualityResponse(
  overrides: Partial<ImageQualityResponse["data"]["analysis"]> = {},
): ImageQualityResponse {
  return {
    data: {
      analysis: {
        confidence: 0.92,
        model_version: 1,
        quality: "high",
        score: 0.9,
        ...overrides,
      },
      entity: provenance.output.secureUrl,
    },
    request_id: "quality-request-1",
  };
}

function scoringInput(
  overrides: Partial<CaseScoringInput> = {},
): CaseScoringInput {
  return {
    evaluationCase,
    product,
    provenance,
    quality: { status: "complete", value: qualityResponse() },
    safety: { status: "complete", value: safetyResponse() },
    scoredAt: new Date("2026-10-07T14:00:00.000Z"),
    vision: { status: "complete", value: visionResponse() },
    ...overrides,
  };
}

function scoreAndDecide(overrides: Partial<CaseScoringInput> = {}) {
  const scoring = scoreEvaluationCase(scoringInput(overrides));
  return decideScoredCase(productImagesV1, evaluationCase, scoring);
}

describe("visual scoring", () => {
  it("binds all analyses to the exact versioned Cloudinary output", () => {
    const requests = createCaseAnalysisRequests(
      productImagesV1,
      evaluationCase,
      provenance,
    );

    expect(requests.vision.source).toEqual({
      uri: provenance.output.secureUrl,
    });
    expect(requests.quality.source).toEqual(requests.vision.source);
    expect(requests.safety.source).toEqual(requests.vision.source);
    expect(requests.vision.prompts[0]).toContain(
      "Do not calculate numeric scores",
    );
  });

  it("passes only when every evidence channel is complete and passing", () => {
    const result = scoreAndDecide();

    expect(result.decision.decision).toBe("pass");
    expect(result.decision.aggregateScore).toBe(98);
    expect(result.scoring.asset).toEqual({
      assetId: provenance.output.assetId,
      publicId: provenance.output.publicId,
      version: provenance.output.version,
    });
  });

  it("fails deterministically on a missing required prompt attribute", () => {
    const assessment = passingAssessment();
    assessment.promptAdherence.missingRequired = [
      evaluationCase.expected.requiredAttributes[0],
    ];

    const result = scoreAndDecide({
      vision: { status: "complete", value: visionResponse(assessment) },
    });

    expect(result.decision.decision).toBe("fail");
    expect(
      result.scoring.results.find(
        (item) => item.dimension === "prompt_adherence",
      ),
    ).toMatchObject({
      hardViolations: ["required_attribute_missing"],
      status: "complete",
    });
  });

  it("fails when forbidden extra text is visible", () => {
    const assessment = passingAssessment();
    assessment.textIntegrity.observedText.push("BUY NOW");

    const result = scoreAndDecide({
      vision: { status: "complete", value: visionResponse(assessment) },
    });

    expect(result.decision.decision).toBe("fail");
    expect(
      result.scoring.results.find(
        (item) => item.dimension === "text_integrity",
      ),
    ).toMatchObject({
      hardViolations: ["unexpected_text_present"],
    });
  });

  it("routes uncertain model evidence to review with no aggregate score", () => {
    const assessment = passingAssessment();
    assessment.referenceFidelity.identityDrift = "uncertain";

    const result = scoreAndDecide({
      vision: { status: "complete", value: visionResponse(assessment) },
    });

    expect(result.decision.decision).toBe("review");
    expect(result.decision.aggregateScore).toBeNull();
    expect(
      result.scoring.results.find(
        (item) => item.dimension === "reference_fidelity",
      ),
    ).toMatchObject({ status: "unavailable" });
  });

  it("rejects invented labels instead of trusting model-authored criteria", () => {
    const assessment = passingAssessment();
    assessment.promptAdherence.presentForbidden = ["invented criterion"];

    const result = scoreAndDecide({
      vision: { status: "complete", value: visionResponse(assessment) },
    });

    expect(result.decision.decision).toBe("review");
    expect(result.decision.aggregateScore).toBeNull();
    expect(result.scoring.results.slice(0, 3)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "AI Vision evidence did not match the committed labels.",
          status: "error",
        }),
        expect.objectContaining({
          reason: "AI Vision evidence did not match the committed labels.",
          status: "error",
        }),
        expect.objectContaining({
          reason: "AI Vision evidence did not match the committed labels.",
          status: "error",
        }),
      ]),
    );
  });

  it("routes a duplicate safety question set to review", () => {
    const safety = safetyResponse();
    safety.data.analysis.responses[4] = safety.data.analysis.responses[0];

    const result = scoreAndDecide({
      safety: { status: "complete", value: safety },
    });

    expect(result.decision.decision).toBe("review");
    expect(result.decision.aggregateScore).toBeNull();
    expect(
      result.scoring.results.find((item) => item.dimension === "safety"),
    ).toEqual({
      dimension: "safety",
      reason: "Safety analysis did not answer the committed question set.",
      status: "error",
    });
  });

  it("fails when any committed safety rejection question returns yes", () => {
    const safety = safetyResponse();
    safety.data.analysis.responses[0].value = "yes";

    const result = scoreAndDecide({
      safety: { status: "complete", value: safety },
    });

    expect(result.decision.decision).toBe("fail");
    expect(
      result.scoring.results.find((item) => item.dimension === "safety"),
    ).toMatchObject({
      hardViolations: ["safety_violation"],
      score: 0,
      status: "complete",
    });
  });

  it("routes low-confidence image quality evidence to review", () => {
    const result = scoreAndDecide({
      quality: {
        status: "complete",
        value: qualityResponse({ confidence: 0.3 }),
      },
    });

    expect(result.decision.decision).toBe("review");
    expect(result.decision.aggregateScore).toBeNull();
    expect(
      result.scoring.results.find(
        (item) => item.dimension === "technical_quality",
      ),
    ).toEqual({
      dimension: "technical_quality",
      reason: "Cloudinary image-quality confidence was below 0.5.",
      status: "unavailable",
    });
  });

  it("does not let low confidence hide a deterministic delivery mismatch", () => {
    const result = scoreAndDecide({
      provenance: {
        ...provenance,
        requested: {
          ...provenance.requested,
          format: "webp",
        },
      },
      quality: {
        status: "complete",
        value: qualityResponse({ confidence: 0.3 }),
      },
    });

    expect(result.decision.decision).toBe("fail");
    expect(
      result.scoring.results.find(
        (item) => item.dimension === "technical_quality",
      ),
    ).toMatchObject({
      hardViolations: ["delivery_constraint_failed"],
      score: 0,
      status: "complete",
    });
  });

  it("rejects a case, product, provenance, or URL identity mismatch", () => {
    expect(() =>
      scoreEvaluationCase(
        scoringInput({
          provenance: {
            ...provenance,
            caseId: "different-case",
          },
        }),
      ),
    ).toThrow("committed case identity");

    expect(() =>
      createCaseAnalysisRequests(productImagesV1, evaluationCase, {
        ...provenance,
        output: {
          ...provenance.output,
          secureUrl: "https://example.com/unversioned.png",
        },
      }),
    ).toThrow("versioned Cloudinary URL");
  });

  it("treats malformed structured output as unavailable evidence", () => {
    const result = scoreAndDecide({
      vision: { status: "complete", value: visionResponse("not json") },
    });

    expect(result.decision.decision).toBe("review");
    expect(result.decision.aggregateScore).toBeNull();
    expect(result.scoring.results.slice(0, 3)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "AI Vision returned invalid structured evidence.",
          status: "error",
        }),
        expect.objectContaining({
          reason: "AI Vision returned invalid structured evidence.",
          status: "error",
        }),
        expect.objectContaining({
          reason: "AI Vision returned invalid structured evidence.",
          status: "error",
        }),
      ]),
    );
  });

  it("rejects analysis evidence returned for another source", () => {
    const quality = qualityResponse();
    quality.data.entity =
      "https://res.cloudinary.com/demo/image/upload/v1800000002/other.png";

    const result = scoreAndDecide({
      quality: { status: "complete", value: quality },
    });

    expect(result.decision.decision).toBe("review");
    expect(result.decision.aggregateScore).toBeNull();
    expect(result.scoring.sources.quality).toMatchObject({
      code: "source_identity_mismatch",
      status: "error",
    });
  });
});
