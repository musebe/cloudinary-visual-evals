import "server-only";

import { mkdir, open, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ExperimentPlan } from "./experiment-contracts";

const directory = join(process.cwd(), ".visual-evals");
const lockPath = join(directory, "smoke.lock");

export async function acquireSmokeLease(plan: ExperimentPlan) {
  await mkdir(directory, { recursive: true });
  let handle;
  try { handle = await open(lockPath, "wx", 0o600); }
  catch { throw new Error("local_smoke_locked"); }
  try {
    // Count only after acquiring the lease: another run cannot finish between
    // checking its journal and claiming the next quota-limited attempt.
    const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const existing = (await readdir(directory)).filter((name) =>
      name.startsWith(`smoke-${today}-`) && name.endsWith(".json"),
    );
    if (existing.length >= 3) throw new Error("local_smoke_daily_limit");
    await handle.writeFile(JSON.stringify({ experimentId: plan.id, createdAt: new Date().toISOString() }));
  } catch (error) {
    await unlink(lockPath);
    throw error;
  } finally { await handle.close(); }

  return async () => { await unlink(lockPath); };
}

export async function writeSmokeJournal(id: string, value: unknown) {
  if (!/^smoke-\d{8}-[a-f0-9-]{36}$/.test(id)) throw new Error("invalid_smoke_journal_id");
  await mkdir(directory, { recursive: true });
  const destination = join(directory, `${id}.json`);
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, destination);
}

export async function inspectSmokeLease() {
  try { return JSON.parse(await readFile(lockPath, "utf8")) as { experimentId: string }; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readLatestSmokeRecord() {
  let filenames: string[];
  try { filenames = await readdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const records = [];
  for (const filename of filenames) {
    if (!/^smoke-\d{8}-[a-f0-9-]{36}\.json$/.test(filename)) continue;
    const journal = JSON.parse(await readFile(join(directory, filename), "utf8"));
    if (journal.status === "finished" && journal.record) records.push(journal.record);
  }
  records.sort((left, right) => String(right.completedAt).localeCompare(String(left.completedAt)));
  return records[0] ?? null;
}
