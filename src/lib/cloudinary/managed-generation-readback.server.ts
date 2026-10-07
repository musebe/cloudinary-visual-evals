import "server-only";

import type { CompletedGenerationProvenance } from "./image-generation-contracts";
import { getCloudinaryClient } from "./client.server";
import { verifyManagedGenerationReadback } from "./managed-generation-readback";
import { getCloudinaryEnvironment } from "@/lib/config/cloudinary-env.server";

export async function readManagedGenerationAsset(
  provenance: CompletedGenerationProvenance,
) {
  const environment = getCloudinaryEnvironment();
  const response = await getCloudinaryClient().api.resources_by_asset_ids(
    [provenance.output.assetId],
    {
      context: true,
      fields: [
        "asset_id",
        "public_id",
        "version",
        "resource_type",
        "type",
        "format",
        "bytes",
        "width",
        "height",
        "secure_url",
        "context",
      ].join(","),
      max_results: 1,
      timeout: environment.CLOUDINARY_ADMIN_API_TIMEOUT_MS,
    },
  );

  return verifyManagedGenerationReadback(provenance, response);
}
