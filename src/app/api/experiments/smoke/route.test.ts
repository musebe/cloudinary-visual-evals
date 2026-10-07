import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";
import { runManagedExperiment } from "@/lib/evaluations/experiment-runner.server";
import { acquireSmokeLease, writeSmokeJournal } from "@/lib/evaluations/local-smoke-store.server";
import { POST } from "./route";

vi.mock("@/lib/evaluations/experiment-runner.server", () => ({ runManagedExperiment: vi.fn() }));
vi.mock("@/lib/evaluations/local-smoke-store.server", () => ({ acquireSmokeLease: vi.fn(), writeSmokeJournal: vi.fn() }));

const release = vi.fn();
function request(body: unknown = { caseId: productImagesV1.cases[0].id, confirmQuota: true }, origin = "http://127.0.0.1:3000") {
  return new Request("http://127.0.0.1:3000/api/experiments/smoke", {
    method: "POST",
    headers: { origin, "content-type": "application/json", "x-visual-evals-action": "smoke" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("CLOUDINARY_ENABLE_LOCAL_SMOKE", "true");
  vi.mocked(acquireSmokeLease).mockResolvedValue(release);
  vi.mocked(writeSmokeJournal).mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("local smoke HTTP boundary", () => {
  it("denies production before accessing storage or providers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request())).status).toBe(403);
    expect(acquireSmokeLease).not.toHaveBeenCalled();
    expect(runManagedExperiment).not.toHaveBeenCalled();
  });

  it("denies requests without local opt-in", async () => {
    vi.stubEnv("CLOUDINARY_ENABLE_LOCAL_SMOKE", "false");
    expect((await POST(request())).status).toBe(403);
    expect(runManagedExperiment).not.toHaveBeenCalled();
  });

  it("denies cross-origin submissions before any paid work", async () => {
    expect((await POST(request(undefined, "https://attacker.example"))).status).toBe(403);
    expect(acquireSmokeLease).not.toHaveBeenCalled();
    expect(runManagedExperiment).not.toHaveBeenCalled();
  });

  it.each([
    { caseId: productImagesV1.cases[0].id, confirmQuota: false },
    { caseId: productImagesV1.cases[0].id, confirmQuota: true, prompt: "injected" },
    { caseId: "unknown-case", confirmQuota: true },
  ])("rejects invalid consent, arbitrary parameters, and unknown cases", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(acquireSmokeLease).not.toHaveBeenCalled();
    expect(runManagedExperiment).not.toHaveBeenCalled();
  });

  it("rejects oversized JSON before acquiring a lease", async () => {
    expect((await POST(request({ caseId: "a".repeat(2_050), confirmQuota: true }))).status).toBe(413);
    expect(acquireSmokeLease).not.toHaveBeenCalled();
  });

  it.each([
    ["local_smoke_daily_limit", "daily_limit"],
    ["local_smoke_locked", "run_locked"],
  ])("distinguishes exhausted quota from an unresolved lease", async (message, code) => {
    vi.mocked(acquireSmokeLease).mockRejectedValueOnce(new Error(message));
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(expect.objectContaining({ code }));
    expect(runManagedExperiment).not.toHaveBeenCalled();
  });

  it("does not expose unexpected storage errors", async () => {
    vi.mocked(acquireSmokeLease).mockRejectedValueOnce(new Error("private-provider-details"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private-provider-details");
    expect(runManagedExperiment).not.toHaveBeenCalled();
  });

  it("releases a preflight-only lease and sends a sanitized terminal event", async () => {
    vi.mocked(runManagedExperiment).mockRejectedValueOnce(new Error("private-provider-details"));
    const response = await POST(request());
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toEqual([expect.objectContaining({ type: "error", code: "smoke_preflight_failed" })]);
    expect(JSON.stringify(events)).not.toContain("private-provider-details");
    expect(release).toHaveBeenCalledOnce();
    expect(writeSmokeJournal).toHaveBeenCalledOnce();
  });
});
