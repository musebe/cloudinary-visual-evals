import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";
import { referenceAssets } from "@/data/reference-assets";

import {
  defineReferenceManifest,
  inspectReferenceCoverage,
  MissingReferenceAssetError,
  resolveReferenceAsset,
} from "./reference-manifest";

const boundAsset = {
  assetId: "0123456789abcdef0123456789abcdef",
  bytes: 200_000,
  contentSha256: "a".repeat(64),
  format: "png",
  height: 1024,
  key: productImagesV1.products[0].referenceAssetKey,
  publicId: "visual-evals/references/cobalt-trail-bottle-v1",
  resourceType: "image" as const,
  type: "upload" as const,
  version: 1_800_000_000,
  width: 1024,
};

describe("reference asset manifest", () => {
  it("binds all ten uploaded references to the committed dataset", () => {
    const coverage = inspectReferenceCoverage(productImagesV1, referenceAssets);

    expect(coverage.configured).toBe(true);
    expect(coverage.missingKeys).toEqual([]);
    expect(coverage.unexpectedKeys).toEqual([]);
    expect(referenceAssets.assets).toHaveLength(10);
  });

  it("resolves a logical key to an immutable Cloudinary asset identity", () => {
    const manifest = defineReferenceManifest({
      ...referenceAssets,
      assets: [boundAsset],
    });

    expect(resolveReferenceAsset(manifest, boundAsset.key).assetId).toBe(
      boundAsset.assetId,
    );
  });

  it("fails explicitly instead of substituting a fake reference", () => {
    expect(() =>
      resolveReferenceAsset({ ...referenceAssets, assets: [] }, boundAsset.key),
    ).toThrow(MissingReferenceAssetError);
  });

  it("rejects duplicate immutable asset identities", () => {
    expect(() =>
      defineReferenceManifest({
        ...referenceAssets,
        assets: [
          boundAsset,
          {
            ...boundAsset,
            key: productImagesV1.products[1].referenceAssetKey,
            publicId: "visual-evals/references/amber-serum-pump-v1",
          },
        ],
      }),
    ).toThrow();
  });
});
