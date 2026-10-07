import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";

import { evaluateCandidate, type DimensionResult } from "./policy";

const requiredDimensions = productImagesV1.cases[0].requiredDimensions;
const thresholds = productImagesV1.thresholds;

function completeResults(score = 100): DimensionResult[] {
  return requiredDimensions.map((dimension) => ({
    dimension,
    findings: [],
    hardViolations: [],
    score,
    status: "complete" as const,
  }));
}

describe("evaluation policy", () => {
  it("passes only when every required dimension has complete passing evidence", () => {
    const result = evaluateCandidate({
      requiredDimensions,
      policyVersion: productImagesV1.policyVersion,
      results: completeResults(),
      thresholds,
    });

    expect(result.decision).toBe("pass");
    expect(result.aggregateScore).toBe(100);
  });

  it("routes a borderline dimension to review instead of averaging it away", () => {
    const results = completeResults();
    results[0] = {
      dimension: "prompt_adherence",
      findings: [],
      hardViolations: [],
      score: 80,
      status: "complete",
    };

    const result = evaluateCandidate({
      requiredDimensions,
      policyVersion: productImagesV1.policyVersion,
      results,
      thresholds,
    });

    expect(result.decision).toBe("review");
    expect(result.dimensions[0].outcome).toBe("review");
  });

  it("fails a result below its dimension failure threshold", () => {
    const results = completeResults();
    results[1] = {
      dimension: "reference_fidelity",
      findings: [],
      hardViolations: [],
      score: 20,
      status: "complete",
    };

    expect(
      evaluateCandidate({
        policyVersion: productImagesV1.policyVersion,
        requiredDimensions,
        results,
        thresholds,
      }).decision,
    ).toBe("fail");
  });

  it("fails a hard policy signal even when its numeric score is high", () => {
    const results = completeResults();
    results[4] = {
      dimension: "safety",
      findings: ["Unsafe content was detected."],
      hardViolations: ["safety_violation"],
      score: 99,
      status: "complete",
    };

    expect(
      evaluateCandidate({
        policyVersion: productImagesV1.policyVersion,
        requiredDimensions,
        results,
        thresholds,
      }).decision,
    ).toBe("fail");
  });

  it("fails closed to review when required evidence is missing or unavailable", () => {
    const results = completeResults().slice(0, -1);
    results[0] = {
      dimension: "prompt_adherence",
      reason: "The analysis provider timed out.",
      status: "error",
    };

    const result = evaluateCandidate({
      requiredDimensions,
      policyVersion: productImagesV1.policyVersion,
      results,
      thresholds,
    });

    expect(result.decision).toBe("review");
    expect(
      result.dimensions.filter((dimension) => dimension.outcome === "review"),
    ).toHaveLength(2);
  });

  it("rejects duplicate evidence for one dimension", () => {
    const results = completeResults();
    results.push(results[0]);

    expect(() =>
      evaluateCandidate({
        policyVersion: productImagesV1.policyVersion,
        requiredDimensions,
        results,
        thresholds,
      }),
    ).toThrow();
  });
});
