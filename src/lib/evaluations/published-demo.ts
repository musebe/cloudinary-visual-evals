import { isDeepStrictEqual } from "node:util";

import { productImagesV1 } from "@/data/product-images-v1";
import { referenceAssets } from "@/data/reference-assets";
import type { ManagedGenerationAsset } from "@/lib/cloudinary/managed-generation-readback";
import type { CompletedGenerationProvenance } from "@/lib/cloudinary/image-generation-contracts";
import { aggregateExperimentResults } from "./experiment-aggregation";
import type { ExperimentRunRecord } from "./experiment-contracts";
import { evaluateCandidate } from "./policy";

/** The published example must still agree with the committed labels and policy. */
export function validatePublishedDemo(record: ExperimentRunRecord) {
  if (record.schemaVersion !== "1.0" || record.datasetId !== productImagesV1.id ||
      record.datasetVersion !== productImagesV1.version || record.cases.length !== 1) {
    throw new Error("published_demo_dataset_mismatch");
  }
  const [result] = record.cases;
  const evaluationCase = productImagesV1.cases.find((item) => item.id === result.caseId);
  if (!evaluationCase || result.variants.length !== 2) throw new Error("published_demo_case_mismatch");
  const reference = referenceAssets.assets.find((asset) => asset.key === evaluationCase.referenceAssetKey);
  if (!reference) throw new Error("published_demo_reference_missing");

  for (const [index, variant] of result.variants.entries()) {
    if (variant.status !== "complete" || variant.variant !== (index === 0 ? "baseline" : "candidate")) {
      throw new Error("published_demo_variant_incomplete");
    }
    const provenance = variant.provenance;
    if (provenance.caseId !== result.caseId || provenance.experimentId !== record.id ||
        provenance.datasetId !== record.datasetId || provenance.datasetVersion !== record.datasetVersion ||
        provenance.variant !== variant.variant || provenance.configurationId !== variant.configurationId ||
        provenance.reference.assetId !== reference.assetId || provenance.reference.version !== reference.version ||
        provenance.reference.key !== reference.key || provenance.reference.contentSha256 !== reference.contentSha256 ||
        provenance.output.publicId !== `visual-evals/${record.id}/${result.caseId}/${variant.variant}` ||
        provenance.output.type !== "upload" || provenance.output.resourceType !== "image" ||
        variant.scoring.scoring.asset.assetId !== provenance.output.assetId ||
        variant.scoring.scoring.asset.publicId !== provenance.output.publicId ||
        variant.scoring.scoring.asset.version !== provenance.output.version ||
        variant.scoring.scoring.caseId !== result.caseId) {
      throw new Error("published_demo_provenance_mismatch");
    }
    const expectedDecision = evaluateCandidate({
      policyVersion: productImagesV1.policyVersion,
      requiredDimensions: evaluationCase.requiredDimensions,
      results: variant.scoring.scoring.results,
      thresholds: productImagesV1.thresholds,
    });
    if (!isDeepStrictEqual(expectedDecision, variant.scoring.decision)) {
      throw new Error("published_demo_decision_mismatch");
    }
  }
  if (!isDeepStrictEqual(aggregateExperimentResults(record.cases), record.aggregate)) {
    throw new Error("published_demo_aggregate_mismatch");
  }
  return record;
}

export function verifyPublishedDemoMedia(provenance: CompletedGenerationProvenance, asset: ManagedGenerationAsset) {
  const expected = provenance.output;
  const url = new URL(asset.secure_url);
  if (asset.asset_id !== expected.assetId || asset.public_id !== expected.publicId ||
      asset.version !== expected.version || asset.type !== expected.type || asset.resource_type !== expected.resourceType ||
      asset.width !== expected.width || asset.height !== expected.height || asset.format !== expected.format ||
      asset.bytes !== expected.bytes || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" ||
      url.username || url.password || asset.secure_url !== expected.secureUrl) {
    throw new Error("published_demo_media_mismatch");
  }
}
