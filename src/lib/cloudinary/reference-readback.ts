import { z } from "zod";

import type { EvaluationDataset } from "@/lib/evaluations/contracts";
import type { ReferenceAsset } from "./reference-manifest";

const assetReadbackSchema = z.object({
  asset_id: z.string(),
  bytes: z.number(),
  context: z.object({ custom: z.record(z.string(), z.string()) }),
  format: z.string(),
  height: z.number(),
  public_id: z.string(),
  resource_type: z.literal("image"),
  secure_url: z.url(),
  type: z.string(),
  version: z.number(),
  width: z.number(),
});

export function verifyReferenceReadback(input: {
  dataset: Pick<EvaluationDataset, "id" | "version">;
  reference: ReferenceAsset;
  response: unknown;
}) {
  const asset = assetReadbackSchema.parse(input.response);
  const reference = input.reference;
  const matches =
    asset.asset_id === reference.assetId &&
    asset.public_id === reference.publicId &&
    asset.version === reference.version &&
    asset.type === reference.type &&
    asset.format === reference.format &&
    asset.bytes === reference.bytes &&
    asset.width === reference.width &&
    asset.height === reference.height &&
    asset.context.custom.dataset_id === input.dataset.id &&
    asset.context.custom.dataset_version === input.dataset.version &&
    asset.context.custom.reference_key === reference.key;

  if (!matches) throw new Error("The Cloudinary reference no longer matches its committed binding.");
  const url = new URL(asset.secure_url);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.includes(`/v${reference.version}/`)) {
    throw new Error("The Cloudinary reference URL is not a versioned delivery URL.");
  }
  return asset;
}
