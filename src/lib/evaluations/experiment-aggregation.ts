import { scoreDimensions, type ScoreDimension } from "./contracts";
import type {
  DimensionAggregate,
  ExperimentAggregate,
  ExperimentCaseResult,
  ExperimentVariant,
  ExperimentVariantResult,
  VariantDecisionCounts,
} from "./experiment-contracts";

const outcomeRank = { pass: 0, review: 1, fail: 2 } as const;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function getVariant(
  result: ExperimentCaseResult,
  variant: ExperimentVariant,
) {
  return result.variants.find((candidate) => candidate.variant === variant);
}

function aggregateVariantDecisions(
  results: ExperimentCaseResult[],
  variant: ExperimentVariant,
): VariantDecisionCounts {
  const counts: VariantDecisionCounts = {
    complete: 0,
    fail: 0,
    failed: 0,
    pass: 0,
    review: 0,
  };

  for (const result of results) {
    const variantResult = getVariant(result, variant);

    if (!variantResult || variantResult.status === "failed") {
      counts.failed += 1;
      continue;
    }

    counts.complete += 1;
    counts[variantResult.scoring.decision.decision] += 1;
  }

  return counts;
}

function aggregateDimension(
  results: ExperimentCaseResult[],
  variant: ExperimentVariant,
  dimension: ScoreDimension,
): DimensionAggregate {
  const aggregate: DimensionAggregate = {
    averageScore: null,
    completeCount: 0,
    failCount: 0,
    incompleteCount: 0,
    passCount: 0,
    passRate: 0,
    reviewCount: 0,
  };
  const scores: number[] = [];

  for (const result of results) {
    const variantResult = getVariant(result, variant);

    if (!variantResult || variantResult.status === "failed") {
      aggregate.incompleteCount += 1;
      continue;
    }

    const evidence = variantResult.scoring.scoring.results.find(
      (candidate) => candidate.dimension === dimension,
    );
    const decision = variantResult.scoring.decision.dimensions.find(
      (candidate) => candidate.dimension === dimension,
    );

    if (!evidence || evidence.status !== "complete" || !decision) {
      aggregate.incompleteCount += 1;
      continue;
    }

    aggregate.completeCount += 1;
    if (decision.outcome === "pass") aggregate.passCount += 1;
    if (decision.outcome === "review") aggregate.reviewCount += 1;
    if (decision.outcome === "fail") aggregate.failCount += 1;
    scores.push(evidence.score);
  }

  aggregate.averageScore =
    scores.length === 0
      ? null
      : round(scores.reduce((total, score) => total + score, 0) / scores.length);
  aggregate.passRate =
    results.length === 0 ? 0 : round((aggregate.passCount / results.length) * 100);

  return aggregate;
}

function decisionFromResult(result: ExperimentVariantResult | undefined) {
  return result?.status === "complete"
    ? result.scoring.decision.decision
    : null;
}

export function aggregateExperimentResults(
  results: ExperimentCaseResult[],
): ExperimentAggregate {
  const regressionCaseIds = results.flatMap((result) => {
    const baselineDecision = decisionFromResult(getVariant(result, "baseline"));
    const candidateDecision = decisionFromResult(getVariant(result, "candidate"));

    if (
      baselineDecision &&
      candidateDecision &&
      outcomeRank[candidateDecision] > outcomeRank[baselineDecision]
    ) {
      return [result.caseId];
    }

    return [];
  });
  const pairedCompleteCount = results.filter(
    (result) =>
      getVariant(result, "baseline")?.status === "complete" &&
      getVariant(result, "candidate")?.status === "complete",
  ).length;

  return {
    caseCount: results.length,
    dimensions: scoreDimensions.map((dimension) => {
      const baseline = aggregateDimension(results, "baseline", dimension);
      const candidate = aggregateDimension(results, "candidate", dimension);

      return {
        baseline,
        candidate,
        dimension,
        passRateDelta: round(candidate.passRate - baseline.passRate),
        scoreDelta:
          baseline.averageScore === null || candidate.averageScore === null
            ? null
            : round(candidate.averageScore - baseline.averageScore),
      };
    }),
    pairedCompleteCount,
    regressionCaseIds,
    variants: {
      baseline: aggregateVariantDecisions(results, "baseline"),
      candidate: aggregateVariantDecisions(results, "candidate"),
    },
  };
}
