import "server-only";

import { cacheLife } from "next/cache";

import { demoExperiment } from "@/data/demo-experiment";
import { readManagedGenerationAsset } from "@/lib/cloudinary/managed-generation-readback.server";
import { validatePublishedDemo, verifyPublishedDemoMedia } from "./published-demo";

export async function getPublishedDemo() {
  "use cache";
  // Reuse readback briefly so public views do not each spend Admin API quota.
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  const record = validatePublishedDemo(demoExperiment);
  await Promise.all(record.cases[0].variants.map(async (variant) => {
    if (variant.status !== "complete") throw new Error("published_demo_variant_incomplete");
    const asset = await readManagedGenerationAsset(variant.provenance);
    verifyPublishedDemoMedia(variant.provenance, asset);
  }));
  return { record, verifiedAt: new Date().toISOString(), source: "recorded_cloudinary_experiment" as const };
}
