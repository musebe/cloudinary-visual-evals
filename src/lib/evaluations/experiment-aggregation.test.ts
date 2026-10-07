import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";

import { scoreDimensions } from "./contracts";
import { aggregateExperimentResults } from "./experiment-aggregation";
import type {
  ExperimentCaseResult,
  ExperimentVariant,
  ExperimentVariantResult,
} from "./experiment-contracts";
import { createTestGenerationProvenance } from "./visual-scoring.test-fixtures";

const evaluationCase = productImagesV1.cases[0];

function completeVariant(
  variant: ExperimentVariant,
  outcome: "pass" | "review" | "fail",
  score: number,
): ExperimentVariantResult {
  const provenance = {
    ...createTestGenerationProvenance(productImagesV1, evaluationCase),
    configurationId: `${variant}-v1`,
    variant,
  };
  const sources = {
    category: null,
    code: null,
    modelVersion: 1,
    outcomeUnknown: null,
    reason: null,
    requestId: "request-1",
    retryable: null,
    statusCode: 200,
    status: "complete" as const,
  };

  return {
    configurationId: `${variant}-v1`,
    provenance,
    scoring: {
      decision: {
        aggregateScore: score,
        decision: outcome,
        dimensions: scoreDimensions.map((dimension) => ({
          dimension,
          outcome,
          reason: "Fixture decision.",
          score,
        })),
        policyVersion: productImagesV1.policyVersion,
      },
      scoring: {
        asset: {
          assetId: provenance.output.assetId,
          publicId: provenance.output.publicId,
          version: provenance.output.version,
        },
        caseId: evaluationCase.id,
        results: scoreDimensions.map((dimension) => ({
          dimension,
          findings: [],
          hardViolations: [],
          score,
          status: "complete" as const,
        })),
        schemaVersion: "1.0",
        scoredAt: "2026-10-07T15:00:00.000Z",
        scorerVersion: "visual-scoring-1.0",
        sources: {
          quality: sources,
          safety: sources,
          vision: sources,
        },
      },
    },
    status: "complete",
    variant,
  };
}

function failedVariant(variant: ExperimentVariant): ExperimentVariantResult {
  return {
    configurationId: `${variant}-v1`,
    failure: {
      code: "generation_task_failed",
      outcomeUnknown: false,
      phase: "waiting_generation",
      requestId: null,
      retryable: false,
    },
    status: "failed",
    variant,
  };
}

describe("experiment aggregation", () => {
  it("reports regressions and candidate deltas without hiding decisions", () => {
    const cases: ExperimentCaseResult[] = [
      {
        caseId: "case-regressed",
        variants: [
          completeVariant("baseline", "pass", 90),
          completeVariant("candidate", "fail", 50),
        ],
      },
      {
        caseId: "case-improved",
        variants: [
          completeVariant("baseline", "review", 70),
          completeVariant("candidate", "pass", 95),
        ],
      },
    ];

    const aggregate = aggregateExperimentResults(cases);

    expect(aggregate.pairedCompleteCount).toBe(2);
    expect(aggregate.regressionCaseIds).toEqual(["case-regressed"]);
    expect(aggregate.variants.baseline).toMatchObject({
      complete: 2,
      fail: 0,
      pass: 1,
      review: 1,
    });
    expect(aggregate.variants.candidate).toMatchObject({
      complete: 2,
      fail: 1,
      pass: 1,
      review: 0,
    });
    expect(aggregate.dimensions[0]).toMatchObject({
      baseline: { averageScore: 80, passRate: 50 },
      candidate: { averageScore: 72.5, passRate: 50 },
      passRateDelta: 0,
      scoreDelta: -7.5,
    });
  });

  it("counts a missing variant as incomplete instead of averaging it", () => {
    const cases: ExperimentCaseResult[] = [
      {
        caseId: "case-incomplete",
        variants: [
          completeVariant("baseline", "pass", 90),
          failedVariant("candidate"),
        ],
      },
    ];

    const aggregate = aggregateExperimentResults(cases);

    expect(aggregate.pairedCompleteCount).toBe(0);
    expect(aggregate.variants.candidate.failed).toBe(1);
    expect(aggregate.dimensions[0]).toMatchObject({
      baseline: { incompleteCount: 0, passRate: 100 },
      candidate: {
        averageScore: null,
        incompleteCount: 1,
        passRate: 0,
      },
      scoreDelta: null,
    });
  });
});
