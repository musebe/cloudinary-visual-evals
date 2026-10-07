import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";
import { createSmokePlan } from "./local-smoke";

vi.mock("server-only", () => ({}));

let temporaryDirectory: string;
let store: typeof import("./local-smoke-store.server");

function journalId(index: number, day = new Date().toISOString().slice(0, 10).replaceAll("-", "")) {
  return `smoke-${day}-00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function plan(index: number) {
  return createSmokePlan(productImagesV1.cases[0].id, journalId(index));
}

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), "visual-evals-store-test-"));
  vi.spyOn(process, "cwd").mockReturnValue(temporaryDirectory);
  vi.resetModules();
  store = await import("./local-smoke-store.server");
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe("local smoke persistence", () => {
  it("allows only one active lease and permits a new run after release", async () => {
    const release = await store.acquireSmokeLease(plan(1));
    expect(await store.inspectSmokeLease()).toEqual(expect.objectContaining({ experimentId: journalId(1) }));
    await expect(store.acquireSmokeLease(plan(2))).rejects.toThrow("local_smoke_locked");
    await release();
    const releaseNext = await store.acquireSmokeLease(plan(2));
    await releaseNext();
    expect(await store.inspectSmokeLease()).toBeNull();
  });

  it("refuses a fourth daily attempt without leaving an unused lease", async () => {
    for (let index = 1; index <= 3; index++) {
      const release = await store.acquireSmokeLease(plan(index));
      await store.writeSmokeJournal(journalId(index), { status: "preflight", plan: plan(index) });
      await release();
    }
    await expect(store.acquireSmokeLease(plan(4))).rejects.toThrow("local_smoke_daily_limit");
    expect(await store.inspectSmokeLease()).toBeNull();
  });

  it("does not count earlier UTC-day attempts against today's limit", async () => {
    for (let index = 1; index <= 3; index++) {
      await store.writeSmokeJournal(journalId(index, "20000101"), { status: "finished" });
    }
    const release = await store.acquireSmokeLease(plan(4));
    await release();
  });

  it("writes complete journal snapshots atomically and rejects path injection", async () => {
    await store.writeSmokeJournal(journalId(1), { status: "preflight" });
    await store.writeSmokeJournal(journalId(1), { status: "finished", submissions: [] });
    const files = await readdir(join(temporaryDirectory, ".visual-evals"));
    expect(files).toEqual([`${journalId(1)}.json`]);
    const saved = JSON.parse(await readFile(join(temporaryDirectory, ".visual-evals", files[0]), "utf8"));
    expect(saved).toEqual({ status: "finished", submissions: [] });
    await expect(store.writeSmokeJournal("../elsewhere", {})).rejects.toThrow("invalid_smoke_journal_id");
  });

  it("restores only the latest finished record without provider work", async () => {
    expect(await store.readLatestSmokeRecord()).toBeNull();
    const earlier = { id: journalId(1), completedAt: "2026-10-08T00:00:00.000Z" };
    const latest = { id: journalId(2), completedAt: "2026-10-08T00:01:00.000Z" };
    await store.writeSmokeJournal(journalId(1), { status: "finished", record: earlier });
    await store.writeSmokeJournal(journalId(2), { status: "finished", record: latest });
    await store.writeSmokeJournal(journalId(3), { status: "running", record: { completedAt: "2026-10-08T00:02:00.000Z" } });
    expect(await store.readLatestSmokeRecord()).toEqual(latest);
  });
});
