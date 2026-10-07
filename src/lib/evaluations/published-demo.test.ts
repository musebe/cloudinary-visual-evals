import { describe, expect, it } from "vitest";

import { demoExperiment } from "@/data/demo-experiment";
import { validatePublishedDemo, verifyPublishedDemoMedia } from "./published-demo";

describe("published real comparison", () => {
  it("matches the current dataset and recomputed policy decisions", () => {
    expect(validatePublishedDemo(demoExperiment).id).toBe(demoExperiment.id);
  });

  it("refuses stale dataset versions", () => {
    const record = structuredClone(demoExperiment);
    record.datasetVersion = "2026-01-01.1";
    expect(() => validatePublishedDemo(record)).toThrow("published_demo_dataset_mismatch");
  });

  it("refuses altered evidence decisions", () => {
    const record = structuredClone(demoExperiment);
    record.cases[0].variants[0].scoring.decision.aggregateScore = 0;
    expect(() => validatePublishedDemo(record)).toThrow("published_demo_decision_mismatch");
  });

  it("refuses swapped managed-asset identities", () => {
    const record = structuredClone(demoExperiment);
    record.cases[0].variants[0].provenance.output.assetId = "another-asset";
    expect(() => validatePublishedDemo(record)).toThrow("published_demo_provenance_mismatch");
  });

  it("refuses altered aggregate metrics", () => {
    const record = structuredClone(demoExperiment);
    record.aggregate.caseCount = 50;
    expect(() => validatePublishedDemo(record)).toThrow("published_demo_aggregate_mismatch");
  });

  it("requires the current Cloudinary media properties to match the historical output", () => {
    const provenance = demoExperiment.cases[0].variants[0].provenance;
    const output = provenance.output;
    const asset = { asset_id: output.assetId, public_id: output.publicId, version: output.version,
      type: output.type, resource_type: "image" as const, width: output.width, height: output.height,
      format: output.format, bytes: output.bytes, secure_url: output.secureUrl };
    expect(() => verifyPublishedDemoMedia(provenance, asset)).not.toThrow();
    expect(() => verifyPublishedDemoMedia(provenance, { ...asset, bytes: output.bytes + 1 })).toThrow("published_demo_media_mismatch");
    expect(() => verifyPublishedDemoMedia(provenance, { ...asset, secure_url: "https://untrusted.example/image.png" })).toThrow("published_demo_media_mismatch");
  });

  it("omits private provider task IDs, request IDs, and account balances", () => {
    for (const variant of demoExperiment.cases[0].variants) {
      expect(variant.provenance.cloudinaryTaskId).toBe("not-published");
      expect(variant.provenance.cloudinaryRequestId).toBe("not-published");
      expect(variant.provenance.quota?.remaining).toBeNull();
      expect(variant.provenance.quota?.limit).toBeNull();
      for (const source of Object.values(variant.scoring.scoring.sources)) expect(source.requestId).toBeNull();
    }
  });
});
