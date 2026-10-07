import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoExperiment } from "@/data/demo-experiment";
import { getPublishedDemo } from "@/lib/evaluations/published-demo.server";
import { GET } from "./route";

vi.mock("next/cache", () => ({ io: vi.fn() }));
vi.mock("@/lib/evaluations/published-demo.server", () => ({ getPublishedDemo: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); });

describe("public demo evidence endpoint", () => {
  it("returns verified, briefly cached read-only evidence", async () => {
    vi.mocked(getPublishedDemo).mockResolvedValue({ record: demoExperiment, verifiedAt: "2026-10-08T00:00:00.000Z", source: "recorded_cloudinary_experiment" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect((await response.json()).record.id).toBe(demoExperiment.id);
  });

  it("returns sanitized uncached JSON if verification fails", async () => {
    vi.mocked(getPublishedDemo).mockRejectedValueOnce(new Error("private-provider-details"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.record).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("private-provider-details");
  });
});
