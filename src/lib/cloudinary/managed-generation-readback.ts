import { z } from "zod";

import type { CompletedGenerationProvenance } from "./image-generation-contracts";

export const managedGenerationAssetSchema = z
  .object({
    asset_id: z.string().trim().min(1),
    bytes: z.number().int().nonnegative(),
    context: z
      .object({
        custom: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    format: z.string().trim().min(1),
    height: z.number().int().nonnegative(),
    public_id: z.string().trim().min(1),
    resource_type: z.literal("image"),
    secure_url: z.url(),
    type: z.string().trim().min(1),
    version: z.number().int().positive(),
    width: z.number().int().nonnegative(),
  })
  .passthrough();

export const managedGenerationReadbackResponseSchema = z
  .object({
    resources: z.array(managedGenerationAssetSchema).length(1),
  })
  .passthrough();

export type ManagedGenerationAsset = z.infer<
  typeof managedGenerationAssetSchema
>;

export function verifyManagedGenerationReadback(
  provenance: CompletedGenerationProvenance,
  input: unknown,
): ManagedGenerationAsset {
  const response = managedGenerationReadbackResponseSchema.parse(input);
  const [asset] = response.resources;

  const expected = provenance.output;
  const mismatches = [
    ["asset_id", asset.asset_id, expected.assetId],
    ["public_id", asset.public_id, expected.publicId],
    ["version", asset.version, expected.version],
    ["resource_type", asset.resource_type, expected.resourceType],
    ["type", asset.type, expected.type],
  ].filter(([, actual, wanted]) => actual !== wanted);

  if (mismatches.length > 0) {
    throw new Error("Cloudinary managed-asset readback did not match provenance.");
  }

  return asset;
}
