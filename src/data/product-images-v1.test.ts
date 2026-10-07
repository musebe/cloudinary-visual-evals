import { describe, expect, it } from "vitest";

import { evaluationDatasetSchema, promptFamilyIds } from "@/lib/evaluations/contracts";

import { productImagesV1 } from "./product-images-v1";

describe("product-images-v1", () => {
  it("contains ten products and fifty valid cases", () => {
    expect(productImagesV1.products).toHaveLength(10);
    expect(productImagesV1.cases).toHaveLength(50);
    expect(evaluationDatasetSchema.safeParse(productImagesV1).success).toBe(true);
  });

  it("covers every prompt family exactly once for every product", () => {
    for (const product of productImagesV1.products) {
      const familyIds = productImagesV1.cases
        .filter((evaluationCase) => evaluationCase.productId === product.id)
        .map((evaluationCase) => evaluationCase.promptFamily)
        .toSorted();

      expect(familyIds).toEqual([...promptFamilyIds].toSorted());
    }
  });

  it("keeps product text and reference identity attached to every case", () => {
    for (const evaluationCase of productImagesV1.cases) {
      const product = productImagesV1.products.find(
        (candidate) => candidate.id === evaluationCase.productId,
      );

      expect(product).toBeDefined();
      expect(evaluationCase.referenceAssetKey).toBe(product?.referenceAssetKey);
      expect(evaluationCase.expected.exactText).toContain(product?.expectedText);
      expect(evaluationCase.prompt).toContain(product?.expectedText);
      expect(evaluationCase.prompt).toContain("[1]");
    }
  });

  it("rejects duplicate case identities", () => {
    const invalidDataset = structuredClone(productImagesV1);
    invalidDataset.cases[1].id = invalidDataset.cases[0].id;

    expect(evaluationDatasetSchema.safeParse(invalidDataset).success).toBe(false);
  });

  it("rejects benchmark output added to the input definition", () => {
    const invalidDataset = {
      ...structuredClone(productImagesV1),
      benchmarkResults: { passRate: 100 },
    };

    expect(evaluationDatasetSchema.safeParse(invalidDataset).success).toBe(false);
  });
});
