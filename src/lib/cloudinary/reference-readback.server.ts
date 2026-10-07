import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { productImagesV1 } from "@/data/product-images-v1";
import { referenceAssets } from "@/data/reference-assets";
import { getCloudinaryEnvironment } from "@/lib/config/cloudinary-env.server";

import { getCloudinaryClient } from "./client.server";
import { resolveReferenceAsset } from "./reference-manifest";
import { verifyReferenceReadback } from "./reference-readback";

export async function verifyExperimentReferences(caseIds: string[]) {
  const environment = getCloudinaryEnvironment();
  const keys = new Set(caseIds.map((caseId) => {
    const evaluationCase = productImagesV1.cases.find((item) => item.id === caseId);
    if (!evaluationCase) throw new Error("Unknown reference case.");
    return evaluationCase.referenceAssetKey;
  }));

  for (const key of keys) {
    const reference = resolveReferenceAsset(referenceAssets, key);
    const response = await getCloudinaryClient().api.resources_by_asset_ids([reference.assetId], {
      context: true,
      max_results: 1,
      timeout: environment.CLOUDINARY_ADMIN_API_TIMEOUT_MS,
    });
    const envelope = z.object({ resources: z.array(z.unknown()).length(1) }).parse(response);
    const asset = verifyReferenceReadback({ dataset: productImagesV1, reference, response: envelope.resources[0] });
    const download = await fetch(asset.secure_url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(environment.CLOUDINARY_ADMIN_API_TIMEOUT_MS),
    });
    if (!download.ok || !download.body) throw new Error("Reference bytes could not be verified.");
    const hash = createHash("sha256");
    let bytes = 0;
    const reader = download.body.getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.length;
        if (bytes > reference.bytes || bytes > 2_000_000) throw new Error("Reference download exceeded its recorded size.");
        hash.update(chunk.value);
      }
    } finally {
      await reader.cancel();
    }
    if (bytes !== reference.bytes || hash.digest("hex") !== reference.contentSha256) {
      throw new Error("Reference content changed. Re-version and review the dataset.");
    }
  }
}
