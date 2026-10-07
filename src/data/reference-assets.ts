import { defineReferenceManifest } from "@/lib/cloudinary/reference-manifest";

import { productImagesV1 } from "./product-images-v1";

export const referenceAssets = defineReferenceManifest({
  schemaVersion: "1.0",
  datasetId: productImagesV1.id,
  datasetVersion: productImagesV1.version,
  updatedAt: "2026-10-07T00:00:00.000Z",
  assets: [],
});
