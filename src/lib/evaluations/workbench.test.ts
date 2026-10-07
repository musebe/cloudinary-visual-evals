import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";
import { referenceAssets } from "@/data/reference-assets";
import { defineReferenceManifest } from "@/lib/cloudinary/reference-manifest";

import { buildEvaluationWorkbenchData } from "./workbench";

describe("buildEvaluationWorkbenchData", () => {
  it("creates a client-safe view of all committed cases", () => {
    const workbench = buildEvaluationWorkbenchData(
      productImagesV1,
      referenceAssets,
    );

    expect(workbench.dataset).toMatchObject({
      caseCount: 50,
      id: "product-images-v1",
      productCount: 10,
      promptFamilyCount: 5,
      status: "draft",
      version: "2026-10-07.2",
    });
    expect(workbench.productOptions).toHaveLength(10);
    expect(workbench.promptFamilyOptions).toHaveLength(5);
    expect(workbench.cases).toHaveLength(50);
  });

  it("retains the labels and thresholds required to inspect a case", () => {
    const workbench = buildEvaluationWorkbenchData(
      productImagesV1,
      referenceAssets,
    );
    const evaluationCase = workbench.cases.find(
      (candidate) =>
        candidate.productId === "cobalt-trail-bottle" &&
        candidate.promptFamily === "studio_packshot",
    );

    expect(evaluationCase).toMatchObject({
      expectedText: ["EVAL-01"],
      output: { height: 1024, width: 1024 },
      productName: "Cobalt trail bottle",
      promptFamilyLabel: "Studio packshot",
      referenceReady: true,
    });
    expect(evaluationCase?.requiredAttributes).toContain(
      "cobalt blue cylindrical bottle",
    );
    expect(evaluationCase?.forbiddenAttributes).toContain("straw lid");
    expect(evaluationCase?.thresholds).toContainEqual({
      dimension: "text_integrity",
      failBelow: 75,
      label: "Text integrity",
      passAtOrAbove: 95,
    });
  });

  it("reports bound references without counting unexpected assets", () => {
    const manifest = defineReferenceManifest({
      ...referenceAssets,
      assets: [
        {
          assetId: "asset_0123456789abcdef",
          bytes: 128_000,
          contentSha256: "a".repeat(64),
          format: "png",
          height: 1024,
          key: "reference-cobalt-trail-bottle-v1",
          publicId: "visual-evals/references/cobalt-trail-bottle-v1",
          resourceType: "image",
          type: "upload",
          version: 1,
          width: 1024,
        },
        {
          assetId: "asset_fedcba9876543210",
          bytes: 128_000,
          contentSha256: "b".repeat(64),
          format: "png",
          height: 1024,
          key: "reference-unexpected-product-v1",
          publicId: "visual-evals/references/unexpected-product-v1",
          resourceType: "image",
          type: "upload",
          version: 1,
          width: 1024,
        },
      ],
    });
    const workbench = buildEvaluationWorkbenchData(productImagesV1, manifest);

    expect(workbench.references).toMatchObject({
      boundCount: 1,
      expectedCount: 10,
      ready: false,
    });
    expect(workbench.references.missingKeys).toHaveLength(9);
    expect(
      workbench.cases.find(
        (candidate) => candidate.productId === "cobalt-trail-bottle",
      )?.referenceReady,
    ).toBe(true);
  });

  it("does not show stale references as ready", () => {
    const workbench = buildEvaluationWorkbenchData(productImagesV1, {
      ...referenceAssets,
      datasetVersion: "2026-10-07.1",
    });
    expect(workbench.references.ready).toBe(false);
    expect(workbench.references.boundCount).toBe(0);
    expect(workbench.cases.every((item) => !item.referenceReady)).toBe(true);
    expect(workbench.cases.every((item) => item.referencePreview === null)).toBe(true);
  });

  it("exposes preview fields only for publicly deliverable references", () => {
    const publicWorkbench = buildEvaluationWorkbenchData(productImagesV1, referenceAssets);
    expect(publicWorkbench.cases[0].referencePreview?.publicId).toBe(referenceAssets.assets[0].publicId);
    const restrictedWorkbench = buildEvaluationWorkbenchData(productImagesV1, {
      ...referenceAssets,
      assets: referenceAssets.assets.map((asset) => ({ ...asset, type: "authenticated" })),
    });
    expect(restrictedWorkbench.cases[0].referenceReady).toBe(true);
    expect(restrictedWorkbench.cases[0].referencePreview).toBeNull();
  });
});
