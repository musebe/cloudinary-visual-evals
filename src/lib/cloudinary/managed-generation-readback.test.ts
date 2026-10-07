import { describe, expect, it } from "vitest";

import type { CompletedGenerationProvenance } from "./image-generation-contracts";
import { verifyManagedGenerationReadback } from "./managed-generation-readback";

const provenance = {
  output: {
    assetId: "fedcba9876543210fedcba9876543210",
    publicId: "visual-evals/run/case/baseline",
    resourceType: "image",
    type: "upload",
    version: 1_800_000_001,
  },
} as CompletedGenerationProvenance;

const readback = {
  resources: [
    {
      asset_id: provenance.output.assetId,
      bytes: 640_000,
      context: {
        custom: {
          model_id: "nano-banana-1-edit",
          seed: "42",
        },
      },
      format: "png",
      height: 1024,
      public_id: provenance.output.publicId,
      resource_type: "image",
      secure_url:
        "https://res.cloudinary.com/demo/image/upload/v1800000001/visual-evals/run/case/baseline.png",
      type: "upload",
      version: provenance.output.version,
      width: 1024,
    },
  ],
};

describe("managed generation readback", () => {
  it("verifies the persisted Cloudinary identity", () => {
    const asset = verifyManagedGenerationReadback(provenance, readback);

    expect(asset.asset_id).toBe(provenance.output.assetId);
    expect(asset.context?.custom?.model_id).toBe("nano-banana-1-edit");
  });

  it("fails when readback points to a different asset version", () => {
    expect(() =>
      verifyManagedGenerationReadback(provenance, {
        resources: [
          {
            ...readback.resources[0],
            version: provenance.output.version + 1,
          },
        ],
      }),
    ).toThrow("did not match provenance");
  });

  it("fails when the Admin API does not return exactly one asset", () => {
    expect(() =>
      verifyManagedGenerationReadback(provenance, { resources: [] }),
    ).toThrow();
  });
});
