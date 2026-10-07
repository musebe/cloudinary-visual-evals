import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";

import { defineExperimentPlan } from "./experiment-contracts";

function plan(overrides: Record<string, unknown> = {}) {
  return {
    baseline: {
      id: "baseline-v1",
      label: "Accepted baseline",
      model: { id: "nano-banana-1-edit" },
      promptRevision: "prompt-v1",
      seed: 42,
    },
    candidate: {
      id: "candidate-v2",
      label: "Candidate revision",
      model: { id: "nano-banana-1-edit" },
      promptRevision: "prompt-v2",
      promptSuffix: "Use softer light.",
      seed: 42,
    },
    caseIds: [productImagesV1.cases[0].id],
    datasetId: productImagesV1.id,
    datasetVersion: productImagesV1.version,
    id: "smoke-experiment-1",
    schemaVersion: "1.0",
    ...overrides,
  };
}

describe("experiment plan", () => {
  it("binds two distinct configurations to the active dataset", () => {
    const parsed = defineExperimentPlan(productImagesV1, plan());

    expect(parsed.baseline).toMatchObject({
      format: "png",
      id: "baseline-v1",
      promptSuffix: "",
    });
    expect(parsed.candidate.id).toBe("candidate-v2");
    expect(parsed.caseIds).toEqual([productImagesV1.cases[0].id]);
  });

  it("rejects duplicate cases and identical configuration IDs", () => {
    expect(() =>
      defineExperimentPlan(
        productImagesV1,
        plan({
          candidate: {
            id: "baseline-v1",
            label: "Duplicate",
            model: { id: "nano-banana-1-edit" },
            promptRevision: "prompt-v2",
          },
          caseIds: [
            productImagesV1.cases[0].id,
            productImagesV1.cases[0].id,
          ],
        }),
      ),
    ).toThrow();
  });

  it("rejects stale datasets and unknown case IDs before execution", () => {
    expect(() =>
      defineExperimentPlan(
        productImagesV1,
        plan({ datasetVersion: "2026-10-07.1" }),
      ),
    ).toThrow("active dataset");

    expect(() =>
      defineExperimentPlan(
        productImagesV1,
        plan({ caseIds: ["unknown-evaluation-case"] }),
      ),
    ).toThrow("unknown case");
  });
});
