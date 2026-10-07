import { z } from "zod";

import type { EvaluationDataset } from "@/lib/evaluations/contracts";

const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const referenceAssetSchema = z
  .object({
    assetId: z.string().trim().regex(/^[a-zA-Z0-9_-]{16,128}$/),
    bytes: z.number().int().positive(),
    etag: z.string().trim().min(8).max(128),
    format: z.string().trim().min(2).max(20),
    height: z.number().int().positive(),
    key: identifierSchema,
    publicId: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^(?!\/)(?!.*\/\/)[^\s?#]+$/),
    resourceType: z.literal("image"),
    type: z.enum(["upload", "authenticated", "private"]),
    version: z.number().int().positive(),
    width: z.number().int().positive(),
  })
  .strict();

export const referenceManifestSchema = z
  .object({
    assets: z.array(referenceAssetSchema),
    datasetId: identifierSchema,
    datasetVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
    schemaVersion: z.literal("1.0"),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const keys = new Set<string>();
    const assetIds = new Set<string>();
    const publicIds = new Set<string>();

    for (const [index, asset] of manifest.assets.entries()) {
      for (const [value, seen, field] of [
        [asset.key, keys, "key"],
        [asset.assetId, assetIds, "assetId"],
        [asset.publicId, publicIds, "publicId"],
      ] as const) {
        if (seen.has(value)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate reference asset ${field}: ${value}`,
            path: ["assets", index, field],
          });
        }

        seen.add(value);
      }
    }
  });

export type ReferenceAsset = z.infer<typeof referenceAssetSchema>;
export type ReferenceManifest = z.infer<typeof referenceManifestSchema>;

export interface ReferenceCoverage {
  configured: boolean;
  missingKeys: string[];
  unexpectedKeys: string[];
}

export class MissingReferenceAssetError extends Error {
  constructor(readonly referenceKey: string) {
    super(`No Cloudinary reference asset is bound to ${referenceKey}.`);
    this.name = "MissingReferenceAssetError";
  }
}

export function defineReferenceManifest(input: unknown): ReferenceManifest {
  return referenceManifestSchema.parse(input);
}

export function inspectReferenceCoverage(
  dataset: Pick<EvaluationDataset, "id" | "products" | "version">,
  manifest: ReferenceManifest,
): ReferenceCoverage {
  if (
    manifest.datasetId !== dataset.id ||
    manifest.datasetVersion !== dataset.version
  ) {
    return {
      configured: false,
      missingKeys: dataset.products.map((product) => product.referenceAssetKey),
      unexpectedKeys: manifest.assets.map((asset) => asset.key),
    };
  }

  const expectedKeys = new Set(
    dataset.products.map((product) => product.referenceAssetKey),
  );
  const actualKeys = new Set(manifest.assets.map((asset) => asset.key));
  const missingKeys = [...expectedKeys].filter((key) => !actualKeys.has(key));
  const unexpectedKeys = [...actualKeys].filter((key) => !expectedKeys.has(key));

  return {
    configured: missingKeys.length === 0 && unexpectedKeys.length === 0,
    missingKeys,
    unexpectedKeys,
  };
}

export function resolveReferenceAsset(
  manifest: ReferenceManifest,
  referenceKey: string,
): ReferenceAsset {
  const asset = manifest.assets.find(
    (candidate) => candidate.key === referenceKey,
  );

  if (!asset) {
    throw new MissingReferenceAssetError(referenceKey);
  }

  return asset;
}
