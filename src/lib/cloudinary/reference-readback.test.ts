import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";
import { referenceAssets } from "@/data/reference-assets";
import { verifyReferenceReadback } from "./reference-readback";

const reference = referenceAssets.assets[0];
const response = {
  asset_id: reference.assetId,
  bytes: reference.bytes,
  context: { custom: {
    dataset_id: productImagesV1.id,
    dataset_version: productImagesV1.version,
    reference_key: reference.key,
  } },
  format: reference.format,
  height: reference.height,
  public_id: reference.publicId,
  resource_type: "image",
  secure_url: `https://res.cloudinary.com/test/image/upload/v${reference.version}/${reference.publicId}.png`,
  type: reference.type,
  version: reference.version,
  width: reference.width,
};

describe("reference readback", () => {
  it("accepts the exact committed asset with matching ownership", () => {
    expect(verifyReferenceReadback({ dataset: productImagesV1, reference, response }).asset_id).toBe(reference.assetId);
  });

  it.each([
    { version: reference.version + 1 },
    { asset_id: "wrong-environment-asset" },
    { width: 512 },
    { context: { custom: {} } },
    { secure_url: "https://attacker.example/reference.png" },
  ])("rejects changed or unowned references before billing", (change) => {
    expect(() => verifyReferenceReadback({ dataset: productImagesV1, reference, response: { ...response, ...change } })).toThrow();
  });
});
