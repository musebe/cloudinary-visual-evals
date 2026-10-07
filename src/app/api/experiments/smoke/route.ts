import { randomUUID } from "node:crypto";

import type { EvaluationGenerationJob, GenerationTaskResponse } from "@/lib/cloudinary/image-generation-contracts";
import { runManagedExperiment } from "@/lib/evaluations/experiment-runner.server";
import { createSmokePlan, localSmokeRequestAllowed, smokeRequestSchema } from "@/lib/evaluations/local-smoke";
import { acquireSmokeLease, writeSmokeJournal } from "@/lib/evaluations/local-smoke-store.server";

export async function POST(request: Request) {
  if (!localSmokeRequestAllowed(request, process.env)) {
    return Response.json({ error: "Local smoke testing is disabled or this request is not allowed." }, { status: 403 });
  }
  const text = await request.text();
  if (text.length > 2_048) return Response.json({ error: "Request is too large." }, { status: 413 });
  let input;
  try { input = smokeRequestSchema.parse(JSON.parse(text)); }
  catch { return Response.json({ error: "Select one known case and confirm quota usage." }, { status: 400 }); }
  const id = `smoke-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID()}`;
  let plan;
  try { plan = createSmokePlan(input.caseId, id); }
  catch { return Response.json({ error: "Unknown evaluation case." }, { status: 400 }); }
  let release;
  try { release = await acquireSmokeLease(plan); }
  catch (error) {
    if (error instanceof Error && error.message === "local_smoke_daily_limit") {
      return Response.json({ code: "daily_limit", error: "Today's three-run safety limit has been reached. Use Load last result to inspect the saved comparison without consuming quota. The limit resets at 00:00 UTC." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "local_smoke_locked") {
      return Response.json({ code: "run_locked", error: "A smoke run is active or requires reconciliation. Inspect its .visual-evals journal and accepted task IDs before starting another run." }, { status: 409 });
    }
    return Response.json({ error: "Local smoke storage is unavailable. No generation was submitted." }, { status: 500 });
  }

  const submissions: Array<{ job: EvaluationGenerationJob; response: GenerationTaskResponse | null }> = [];
  let attemptedGeneration = false;
  let disconnected = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (value: unknown) => {
        if (disconnected) return;
        try { controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`)); }
        catch { disconnected = true; }
      };
      try {
        await writeSmokeJournal(id, { plan, status: "preflight", submissions });
        const record = await runManagedExperiment({
          plan,
          onProgress: (event) => emit({ type: "progress", event }),
          onSubmission: async (job, response) => {
            attemptedGeneration = true;
            const submission = submissions.find((item) => item.job.variant === job.variant);
            if (submission) submission.response = response;
            else submissions.push({ job, response });
            await writeSmokeJournal(id, { plan, status: "running", submissions });
          },
        });
        await writeSmokeJournal(id, { plan, record, status: "finished", submissions });
        const uncertain = record.cases.some((item) => item.variants.some((variant) => variant.status === "failed" && variant.failure.outcomeUnknown));
        if (!uncertain) await release();
        emit({ type: "result", record });
      } catch {
        if (!attemptedGeneration) await release();
        emit({ type: "error", code: attemptedGeneration ? "smoke_outcome_unresolved" : "smoke_preflight_failed", message: attemptedGeneration
          ? "The run could not finish. Its local journal and lock were retained. Reconcile accepted task IDs before retrying."
          : "The reference or configuration preflight failed. No generation was submitted." });
      } finally {
        if (!disconnected) { try { controller.close(); } catch { /* Client already disconnected. */ } }
      }
    },
    cancel() { disconnected = true; },
  });
  return new Response(stream, { headers: {
    "content-type": "application/x-ndjson", "cache-control": "no-store", "x-content-type-options": "nosniff",
  } });
}
