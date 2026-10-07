import { describe, expect, it } from "vitest";
import { productImagesV1 } from "@/data/product-images-v1";
import { createSmokePlan, localSmokeRequestAllowed, smokeRequestSchema } from "./local-smoke";

const environment = { NODE_ENV: "development", CLOUDINARY_ENABLE_LOCAL_SMOKE: "true" };
function request(url = "http://localhost:3000/api/experiments/smoke", origin = "http://localhost:3000") {
  return new Request(url, { method: "POST", headers: {
    "content-type": "application/json", "x-visual-evals-action": "smoke", origin,
  } });
}

describe("local smoke boundary", () => {
  it("allows opted-in same-origin development requests", () => {
    expect(localSmokeRequestAllowed(request(), environment)).toBe(true);
  });
  it("always refuses production, even with the opt-in flag", () => {
    expect(localSmokeRequestAllowed(request(), { ...environment, NODE_ENV: "production" })).toBe(false);
    expect(localSmokeRequestAllowed(request(), { NODE_ENV: "development" })).toBe(false);
  });
  it("refuses cross-origin and public-host requests", () => {
    expect(localSmokeRequestAllowed(request(undefined, "https://attacker.example"), environment)).toBe(false);
    expect(localSmokeRequestAllowed(request("http://public.example/api/experiments/smoke", "http://public.example"), environment)).toBe(false);
  });
  it("uses the actual loopback Host for Next.js canonicalized requests", () => {
    const incoming = request(undefined, "http://127.0.0.1:3000");
    incoming.headers.set("host", "127.0.0.1:3000");
    expect(localSmokeRequestAllowed(incoming, environment)).toBe(true);
    incoming.headers.set("host", "attacker.example");
    expect(localSmokeRequestAllowed(incoming, environment)).toBe(false);
  });
  it("requires explicit quota consent and rejects injected fields", () => {
    expect(smokeRequestSchema.safeParse({ caseId: "case", confirmQuota: false }).success).toBe(false);
    expect(smokeRequestSchema.safeParse({ caseId: "case", confirmQuota: true, prompt: "Injected" }).success).toBe(false);
  });
  it("creates only one committed case with server-owned configuration", () => {
    const plan = createSmokePlan(productImagesV1.cases[0].id, "smoke-test");
    expect(plan.caseIds).toEqual([productImagesV1.cases[0].id]);
    expect(plan.baseline.model).toEqual(plan.candidate.model);
    expect(() => createSmokePlan("unknown-case", "smoke-test")).toThrow();
  });
});
