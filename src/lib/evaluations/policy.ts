import { z } from "zod";

import {
  scoreDimensionSchema,
  scoreThresholdsSchema,
  type ScoreDimension,
} from "./contracts";

export const hardViolationCodes = [
  "forbidden_attribute_present",
  "required_attribute_missing",
  "product_identity_drift",
  "expected_text_missing",
  "expected_text_changed",
  "unexpected_text_present",
  "delivery_constraint_failed",
  "safety_violation",
] as const;

const hardViolationSchema = z.enum(hardViolationCodes);

const completeResultSchema = z.object({
  dimension: scoreDimensionSchema,
  findings: z.array(z.string().trim().min(1)).default([]),
  hardViolations: z.array(hardViolationSchema).default([]),
  score: z.number().min(0).max(100),
  status: z.literal("complete"),
}).strict();

const incompleteResultSchema = z.object({
  dimension: scoreDimensionSchema,
  reason: z.string().trim().min(1).max(240),
  status: z.enum(["unavailable", "error"]),
}).strict();

export const dimensionResultSchema = z.discriminatedUnion("status", [
  completeResultSchema,
  incompleteResultSchema,
]);

export const evaluationPolicyInputSchema = z
  .object({
    policyVersion: z.string().trim().min(1).max(80),
    requiredDimensions: z.array(scoreDimensionSchema).min(1),
    results: z.array(dimensionResultSchema),
    thresholds: scoreThresholdsSchema,
  })
  .strict()
  .superRefine((input, context) => {
    const requiredDimensions = new Set(input.requiredDimensions);
    if (requiredDimensions.size !== input.requiredDimensions.length) {
      context.addIssue({
        code: "custom",
        message: "Required dimensions must be unique.",
        path: ["requiredDimensions"],
      });
    }

    const seenResults = new Set<ScoreDimension>();
    for (const [index, result] of input.results.entries()) {
      if (seenResults.has(result.dimension)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate result for ${result.dimension}.`,
          path: ["results", index, "dimension"],
        });
      }
      seenResults.add(result.dimension);
    }
  });

export type DimensionResult = z.infer<typeof dimensionResultSchema>;

export interface DimensionDecision {
  dimension: ScoreDimension;
  outcome: "pass" | "review" | "fail";
  reason: string;
  score: number | null;
}

export interface EvaluationDecision {
  aggregateScore: number | null;
  decision: "pass" | "review" | "fail";
  dimensions: DimensionDecision[];
  policyVersion: string;
}

export function evaluateCandidate(input: unknown): EvaluationDecision {
  const parsed = evaluationPolicyInputSchema.parse(input);
  const resultsByDimension = new Map(
    parsed.results.map((result) => [result.dimension, result]),
  );

  const dimensions = parsed.requiredDimensions.map((dimension) => {
    const result = resultsByDimension.get(dimension);

    if (!result) {
      return {
        dimension,
        outcome: "review" as const,
        reason: "Required evidence is missing.",
        score: null,
      };
    }

    if (result.status !== "complete") {
      return {
        dimension,
        outcome: "review" as const,
        reason: `Evidence is ${result.status}: ${result.reason}`,
        score: null,
      };
    }

    const threshold = parsed.thresholds[dimension];

    if (result.hardViolations.length > 0) {
      return {
        dimension,
        outcome: "fail" as const,
        reason: `Hard policy violation: ${result.hardViolations.join(", ")}.`,
        score: result.score,
      };
    }

    if (result.score < threshold.failBelow) {
      return {
        dimension,
        outcome: "fail" as const,
        reason: `Score is below the ${threshold.failBelow} failure threshold.`,
        score: result.score,
      };
    }

    if (result.score < threshold.passAtOrAbove) {
      return {
        dimension,
        outcome: "review" as const,
        reason: `Score is below the ${threshold.passAtOrAbove} pass threshold.`,
        score: result.score,
      };
    }

    return {
      dimension,
      outcome: "pass" as const,
      reason: `Score meets the ${threshold.passAtOrAbove} pass threshold.`,
      score: result.score,
    };
  });

  const completeScores = dimensions.flatMap((dimension) =>
    dimension.score === null ? [] : [dimension.score],
  );
  const aggregateScore =
    completeScores.length !== dimensions.length
      ? null
      : Math.round(
          (completeScores.reduce((total, score) => total + score, 0) /
            completeScores.length) *
            100,
        ) / 100;

  const decision = dimensions.some((dimension) => dimension.outcome === "fail")
    ? "fail"
    : dimensions.some((dimension) => dimension.outcome === "review")
      ? "review"
      : "pass";

  return {
    aggregateScore,
    decision,
    dimensions,
    policyVersion: parsed.policyVersion,
  };
}
