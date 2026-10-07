import { describe, expect, it } from "vitest";

import { buildHealthReport, createHealthResponse } from "./health";

const checkedAt = new Date("2026-10-07T09:00:00.000Z");
const environment = {
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "visual-evals-demo",
  CLOUDINARY_API_KEY: "123456789012345",
  CLOUDINARY_API_SECRET: "test-secret-that-must-not-leak",
};

describe("health report", () => {
  it("reports configured services without exposing credentials", () => {
    const report = buildHealthReport(environment, checkedAt);
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("ok");
    expect(serialized).not.toContain(environment.CLOUDINARY_API_KEY);
    expect(serialized).not.toContain(environment.CLOUDINARY_API_SECRET);
  });

  it("returns an uncached 503 when Cloudinary is not configured", async () => {
    const response = createHealthResponse({}, checkedAt);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(body.status).toBe("degraded");
    expect(body.checks.cloudinaryConfiguration.missingCount).toBe(3);
  });

  it("returns 200 when all required variables are configured", () => {
    const response = createHealthResponse(environment, checkedAt);

    expect(response.status).toBe(200);
  });
});
