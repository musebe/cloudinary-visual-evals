import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoExperiment } from "@/data/demo-experiment";
import { readManagedGenerationAsset } from "@/lib/cloudinary/managed-generation-readback.server";
import { getPublishedDemo } from "./published-demo.server";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("@/lib/cloudinary/managed-generation-readback.server", () => ({ readManagedGenerationAsset: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readManagedGenerationAsset).mockImplementation(async ({ output }) => ({
    asset_id: output.assetId, public_id: output.publicId, version: output.version,
    type: output.type, resource_type: "image", width: output.width, height: output.height,
    format: output.format, bytes: output.bytes, secure_url: output.secureUrl,
  }));
});

describe("read-only demo server", () => {
  it("reads both immutable outputs before returning the historical scores", async () => {
    const result = await getPublishedDemo();
    expect(result.record).toEqual(demoExperiment);
    expect(result.source).toBe("recorded_cloudinary_experiment");
    expect(Number.isFinite(Date.parse(result.verifiedAt))).toBe(true);
    expect(readManagedGenerationAsset).toHaveBeenCalledTimes(2);
  });

  it("fails closed when Cloudinary readback is unavailable", async () => {
    vi.mocked(readManagedGenerationAsset).mockRejectedValueOnce(new Error("private-provider-error"));
    await expect(getPublishedDemo()).rejects.toThrow("private-provider-error");
  });

  it("fails closed if a media property differs from the recorded output", async () => {
    const { output } = demoExperiment.cases[0].variants[0].provenance;
    vi.mocked(readManagedGenerationAsset).mockResolvedValueOnce({
      asset_id: output.assetId, public_id: output.publicId, version: output.version,
      type: output.type, resource_type: "image", width: output.width + 1, height: output.height,
      format: output.format, bytes: output.bytes, secure_url: output.secureUrl,
    });
    await expect(getPublishedDemo()).rejects.toThrow("published_demo_media_mismatch");
  });
});
