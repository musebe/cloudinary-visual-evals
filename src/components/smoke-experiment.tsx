"use client";

import { useId, useRef, useState } from "react";
import { AlertCircleIcon, DownloadIcon, LoaderCircleIcon, PlayIcon } from "lucide-react";
import { CldImage } from "next-cloudinary";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ExperimentProgressEvent,
  ExperimentRunRecord,
  ExperimentVariantResult,
} from "@/lib/evaluations/experiment-contracts";

interface SmokeExperimentProps {
  caseId: string;
  enabled: boolean;
  demoAvailable?: boolean;
}

type SmokeStreamEvent =
  | { type: "progress"; event: ExperimentProgressEvent }
  | { type: "result"; record: ExperimentRunRecord }
  | { type: "error"; code: string; message: string };

interface ClientFailure {
  code: string;
  message: string;
}

const phaseLabels: Record<ExperimentProgressEvent["phase"], string> = {
  queued: "Queued",
  starting_generation: "Submitting generation",
  waiting_generation: "Waiting for generation",
  verifying_asset: "Verifying persisted asset",
  scoring: "Analyzing and scoring",
  complete: "Complete",
  failed: "Failed",
};

class SmokeStreamError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly outcomeUnknown = true,
  ) {
    super(message);
    this.name = "SmokeStreamError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDecision(value: unknown) {
  return value === "pass" || value === "review" || value === "fail";
}

function isScore(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isVariantResult(value: unknown): value is ExperimentVariantResult {
  if (!isObject(value) || typeof value.configurationId !== "string") return false;
  if (value.variant !== "baseline" && value.variant !== "candidate") return false;

  if (value.status === "failed") {
    const failure = value.failure;
    return (
      isObject(failure) &&
      typeof failure.code === "string" &&
      typeof failure.phase === "string" &&
      Object.hasOwn(phaseLabels, failure.phase) &&
      typeof failure.outcomeUnknown === "boolean" &&
      typeof failure.retryable === "boolean" &&
      (failure.generation === undefined ||
        (isObject(failure.generation) &&
          typeof failure.generation.targetPublicId === "string" &&
          (failure.generation.taskId === null ||
            typeof failure.generation.taskId === "string")))
    );
  }

  if (value.status !== "complete" || !isObject(value.provenance)) return false;
  const { output, resolved } = value.provenance;
  if (
    !isObject(output) ||
    typeof output.publicId !== "string" ||
    typeof output.assetId !== "string" ||
    typeof output.type !== "string" ||
    typeof output.format !== "string" ||
    typeof output.version !== "number" ||
    !Number.isInteger(output.version) ||
    output.version < 1 ||
    typeof output.width !== "number" ||
    !Number.isFinite(output.width) ||
    output.width < 0 ||
    typeof output.height !== "number" ||
    !Number.isFinite(output.height) ||
    output.height < 0 ||
    !isObject(resolved) ||
    !isObject(resolved.model) ||
    typeof resolved.model.id !== "string" ||
    typeof resolved.model.family !== "string" ||
    typeof resolved.model.tier !== "string" ||
    !isObject(value.scoring) ||
    !isObject(value.scoring.decision)
  ) return false;

  const decision = value.scoring.decision;
  return (
    isDecision(decision.decision) &&
    isScore(decision.aggregateScore) &&
    Array.isArray(decision.dimensions) &&
    decision.dimensions.every((dimension: unknown) =>
      isObject(dimension) &&
      typeof dimension.dimension === "string" &&
      typeof dimension.reason === "string" &&
      isDecision(dimension.outcome) &&
      isScore(dimension.score),
    )
  );
}

function parseStreamEvent(line: string, caseId: string): SmokeStreamEvent {
  const value: unknown = JSON.parse(line);
  if (isObject(value)) {
    if (value.type === "error" && typeof value.code === "string" && typeof value.message === "string") {
      return { type: "error", code: value.code, message: value.message };
    }

    if (value.type === "progress" && isObject(value.event)) {
      const event = value.event;
      if (
        event.caseId === caseId &&
        (event.variant === "baseline" || event.variant === "candidate") &&
        typeof event.phase === "string" && Object.hasOwn(phaseLabels, event.phase) &&
        typeof event.occurredAt === "string" &&
        typeof event.attempt === "number" && Number.isInteger(event.attempt) && event.attempt >= 0
      ) return { type: "progress", event: event as unknown as ExperimentProgressEvent };
    }

    if (value.type === "result" && isObject(value.record)) {
      const record = value.record;
      if (
        record.schemaVersion === "1.0" && typeof record.id === "string" &&
        typeof record.completedAt === "string" && typeof record.startedAt === "string" &&
        typeof record.datasetId === "string" && typeof record.datasetVersion === "string" &&
        Array.isArray(record.cases) && record.cases.length === 1 &&
        isObject(record.cases[0]) && record.cases[0].caseId === caseId &&
        Array.isArray(record.cases[0].variants) && record.cases[0].variants.length === 2 &&
        record.cases[0].variants.every(isVariantResult) &&
        record.cases[0].variants[0].variant === "baseline" &&
        record.cases[0].variants[1].variant === "candidate"
      ) return { type: "result", record: record as unknown as ExperimentRunRecord };
    }
  }

  throw new SmokeStreamError("invalid_stream", "The server returned an unexpected smoke-run event.");
}

async function readSmokeStream(
  response: Response,
  caseId: string,
  onEvent: (event: SmokeStreamEvent) => boolean,
) {
  if (!response.body || !response.headers.get("content-type")?.includes("application/x-ndjson")) {
    throw new SmokeStreamError("invalid_response", "The server did not return a readable smoke-run stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 1_048_576) throw new SmokeStreamError("invalid_stream", "The smoke-run response exceeded its safe size.");

      let boundary = buffer.indexOf("\n");
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        if (line && onEvent(parseStreamEvent(line, caseId))) return;
        boundary = buffer.indexOf("\n");
      }

      if (done) {
        if (buffer.trim() && onEvent(parseStreamEvent(buffer.trim(), caseId))) return;
        throw new SmokeStreamError("stream_interrupted", "The connection ended before a final run result was received.");
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function VariantResult({ result }: { result: ExperimentVariantResult }) {
  const [imageFailed, setImageFailed] = useState(false);
  const title = result.variant === "baseline" ? "Baseline" : "Candidate";

  if (result.status === "failed") {
    const { failure } = result;
    return (
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle><h3>{title}</h3></CardTitle>
          <CardDescription>{result.configurationId}</CardDescription>
          <CardAction><Badge variant="destructive">Failed</Badge></CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Alert variant="destructive">
            <AlertCircleIcon aria-hidden="true" />
            <AlertTitle>{failure.outcomeUnknown ? "Generation outcome unresolved" : "Variant could not complete"}</AlertTitle>
            <AlertDescription>
              {failure.code} · {phaseLabels[failure.phase]}
            </AlertDescription>
          </Alert>
          {failure.generation ? (
            <dl className="flex flex-col gap-2 text-xs">
              <div><dt className="text-muted-foreground">Accepted task</dt><dd className="break-all font-mono">{failure.generation.taskId ?? "Not received; reconcile the target before resubmitting."}</dd></div>
              <div><dt className="text-muted-foreground">Target public ID</dt><dd className="break-all font-mono">{failure.generation.targetPublicId}</dd></div>
            </dl>
          ) : null}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Download the JSON to preserve the available recovery context.</p>
        </CardFooter>
      </Card>
    );
  }

  const { output, resolved } = result.provenance;
  const { decision } = result.scoring;
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle><h3>{title}</h3></CardTitle>
        <CardDescription className="break-all">{resolved.model.id} · {resolved.model.family}/{resolved.model.tier}</CardDescription>
        <CardAction><Badge variant={decision.decision === "fail" ? "destructive" : "secondary"}>{decision.decision}</Badge></CardAction>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {imageFailed || output.width < 1 || output.height < 1 ? (
          <Alert>
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>The generation and scoring record is still available below and in the JSON download.</AlertDescription>
          </Alert>
        ) : (
          <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
            <CldImage
              src={output.publicId}
              version={output.version}
              deliveryType={output.type}
              width={output.width}
              height={output.height}
              crop="fit"
              alt={`${title} generated result for ${result.provenance.caseId}; not a human-verified description.`}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="size-full object-contain"
              onError={() => setImageFailed(true)}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">Display preview is resized and optimized. Scoring uses the original managed asset.</p>
        <Table>
          <TableCaption>{title} policy decision · aggregate {decision.aggregateScore === null ? "unavailable" : `${decision.aggregateScore.toFixed(1)}/100`}</TableCaption>
          <TableHeader><TableRow><TableHead>Dimension</TableHead><TableHead>Score</TableHead><TableHead>Outcome</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
          <TableBody>
            {decision.dimensions.map((dimension) => (
              <TableRow key={dimension.dimension}>
                <TableCell className="whitespace-normal">{dimension.dimension.replaceAll("_", " ")}</TableCell>
                <TableCell>{dimension.score === null ? "—" : dimension.score.toFixed(1)}</TableCell>
                <TableCell>{dimension.outcome}</TableCell>
                <TableCell className="min-w-40 whitespace-normal">{dimension.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <p className="break-all text-xs text-muted-foreground">Asset {output.assetId} · v{output.version} · {output.width}×{output.height} {output.format}</p>
      </CardFooter>
    </Card>
  );
}

export function SmokeExperiment({ caseId, enabled, demoAvailable = false }: SmokeExperimentProps) {
  const confirmationId = useId();
  const inFlight = useRef(false);
  const [confirmedCaseId, setConfirmedCaseId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [submittedCaseId, setSubmittedCaseId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExperimentProgressEvent[]>([]);
  const [record, setRecord] = useState<ExperimentRunRecord | null>(null);
  const [failure, setFailure] = useState<ClientFailure | null>(null);
  const [disconnectedOutcome, setDisconnectedOutcome] = useState(false);
  const readOnlyDemo = !enabled && demoAvailable;
  const unresolved = disconnectedOutcome || Boolean(record?.cases.some((item) =>
    item.variants.some((variant) => variant.status === "failed" && variant.failure.outcomeUnknown),
  ));
  const controlsDisabled = !enabled || running || loadingSaved || unresolved;

  async function loadResult() {
    if (running || loadingSaved || (!enabled && !demoAvailable)) return;
    setLoadingSaved(true);
    setFailure(null);
    try {
      const response = await fetch(readOnlyDemo ? "/api/demo/experiment" : "/api/experiments/smoke/latest", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(readOnlyDemo ? "The demo comparison is temporarily unavailable." : "The saved result could not be read.");
      const body: unknown = await response.json();
      if (!isObject(body) || !isObject(body.record) || !Array.isArray(body.record.cases) || !isObject(body.record.cases[0]) || typeof body.record.cases[0].caseId !== "string") {
        throw new Error(readOnlyDemo ? "No verified demo comparison is available." : "No completed local smoke result is available yet.");
      }
      const event = parseStreamEvent(JSON.stringify({ type: "result", record: body.record }), body.record.cases[0].caseId);
      if (event.type !== "result") throw new Error("The saved result is invalid.");
      setRecord(event.record);
      setSubmittedCaseId(event.record.cases[0].caseId);
      setProgress([]);
    } catch (error) {
      setFailure({ code: "saved_result_unavailable", message: error instanceof Error ? error.message : "The saved result could not be read." });
    } finally {
      setLoadingSaved(false);
    }
  }

  async function runSmoke() {
    if (inFlight.current || controlsDisabled || confirmedCaseId !== caseId) return;
    inFlight.current = true;
    setRunning(true);
    setConfirmedCaseId(null);
    setSubmittedCaseId(caseId);
    setProgress([]);
    setRecord(null);
    setFailure(null);

    try {
      const response = await fetch("/api/experiments/smoke", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", "x-visual-evals-action": "smoke" },
        body: JSON.stringify({ caseId, confirmQuota: true }),
      });

      if (!response.ok) {
        let message = `The server refused the request (HTTP ${response.status}).`;
        try {
          const body: unknown = await response.json();
          if (isObject(body) && typeof body.error === "string") message = body.error;
        } catch { /* An HTML or empty error response must not crash the workbench. */ }
        throw new SmokeStreamError(`http_${response.status}`, message, response.status >= 500);
      }

      await readSmokeStream(response, caseId, (event) => {
        if (event.type === "progress") {
          setProgress((previous) => [...previous, event.event].slice(-200));
          return false;
        }
        if (event.type === "error") {
          throw new SmokeStreamError(event.code, event.message, event.code !== "smoke_preflight_failed");
        }
        setRecord(event.record);
        return true;
      });
    } catch (error) {
      const knownError = error instanceof SmokeStreamError;
      setFailure({
        code: knownError ? error.code : "connection_interrupted",
        message: knownError ? error.message : "The request or response was interrupted before its outcome could be confirmed.",
      });
      if (!knownError || error.outcomeUnknown) setDisconnectedOutcome(true);
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }

  function downloadJson() {
    try {
      const payload = record ?? {
        schemaVersion: "1.0",
        caseId: submittedCaseId,
        outcomeUnknown: unresolved,
        error: failure,
        progress,
        note: "Incomplete browser capture. Inspect the server .visual-evals journal before resubmitting.",
      };
      const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(record?.id ?? "smoke-incomplete").replace(/[^a-zA-Z0-9_-]/g, "-")}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch {
      setFailure({ code: "download_failed", message: "The browser could not create the JSON download. Keep this view open and preserve the server journal." });
    }
  }

  return (
    <section className="@container flex min-w-0 flex-col gap-4" aria-label={readOnlyDemo ? "Recorded demo comparison" : "One-case smoke experiment"}>
      <Card>
        <CardHeader>
          <CardTitle><h2>{readOnlyDemo ? "See a real comparison" : "One-case smoke test"}</h2></CardTitle>
          <CardDescription>
            {readOnlyDemo
              ? "Explore a recorded Cloudinary experiment: two generated images, their analysis, and the policy decisions. This fixed sample is independent of the dataset case you inspect."
              : <>Next run: {caseId}. Compare the committed prompt with a text-preservation candidate using the same model.</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {enabled ? <FieldGroup>
            <Field orientation="horizontal" data-disabled={controlsDisabled}>
              <input
                id={confirmationId}
                type="checkbox"
                checked={confirmedCaseId === caseId}
                disabled={controlsDisabled}
                onChange={(event) => setConfirmedCaseId(event.target.checked ? caseId : null)}
                aria-describedby={`${confirmationId}-description`}
                className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <FieldContent>
                <FieldLabel htmlFor={confirmationId}>I confirm quota usage for this case</FieldLabel>
                <FieldDescription id={`${confirmationId}-description`}>Up to two generation requests and six Analyze API calls. Confirm again before every new run.</FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup> : null}
          {readOnlyDemo ? (
            <p className="text-sm text-muted-foreground">Historical one-case sample, not a full benchmark. Viewing it does not generate new images or run paid analysis.</p>
          ) : !enabled ? <p className="text-sm text-muted-foreground">A comparison is not available yet.</p> : null}
          {progress.length > 0 ? (
            <div className="flex flex-col gap-2" role="status" aria-live="polite" aria-atomic="true">
              {["baseline", "candidate"].map((variant) => {
                const latest = progress.filter((event) => event.variant === variant).at(-1);
                return <p key={variant} className="text-sm"><span className="capitalize">{variant}</span> · {latest ? phaseLabels[latest.phase] : "Not started"}{latest?.phase === "waiting_generation" ? ` (poll ${latest.attempt})` : ""}</p>;
              })}
            </div>
          ) : running ? <p role="status" className="text-sm text-muted-foreground">Checking references and preparing the run…</p> : null}
          {failure ? (
            <Alert variant="destructive">
              <AlertCircleIcon aria-hidden="true" />
              <AlertTitle>{readOnlyDemo ? "Comparison could not load" : "Smoke test could not finish"}</AlertTitle>
              <AlertDescription>{failure.message} ({failure.code})</AlertDescription>
            </Alert>
          ) : null}
          {unresolved ? (
            <Alert variant="destructive">
              <AlertCircleIcon aria-hidden="true" />
              <AlertTitle>Reconcile before another run</AlertTitle>
              <AlertDescription>A paid job may still be running or may have completed. New submissions are locked in this view. Preserve the JSON and inspect the server .visual-evals journal and accepted task IDs. Refreshing clears the view, not Cloudinary jobs or the server lock.</AlertDescription>
            </Alert>
          ) : null}
          {enabled ? <p className="text-xs text-muted-foreground">Refresh clears the view. Use Load last result to restore the latest local journal without generating again, or download the JSON to retain the full result.</p> : null}
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          {enabled ? <Button type="button" className="min-h-11" disabled={controlsDisabled || confirmedCaseId !== caseId} onClick={runSmoke}>
            {running ? <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" data-icon="inline-start" aria-hidden="true" /> : <PlayIcon data-icon="inline-start" aria-hidden="true" />}
            {running ? "Running smoke test…" : "Run one-case smoke test"}
          </Button> : null}
          <Button type="button" variant={readOnlyDemo ? "default" : "outline"} className="min-h-11" disabled={(!enabled && !demoAvailable) || running || loadingSaved} onClick={loadResult}>
            {loadingSaved ? "Loading result…" : readOnlyDemo ? "View demo comparison" : "Load last result"}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={running || (!record && !failure && progress.length === 0)} onClick={downloadJson}>
            <DownloadIcon data-icon="inline-start" aria-hidden="true" />Download JSON
          </Button>
        </CardFooter>
      </Card>
      {record ? (
        <div className="flex min-w-0 flex-col gap-3">
          <p className="break-all text-sm text-muted-foreground">
            {readOnlyDemo ? "Recorded sample" : "Experiment"} {record.id} · {record.cases[0].caseId}
            {readOnlyDemo ? <> · completed {record.completedAt}</> : null}
          </p>
          <div className="grid min-w-0 gap-4 @3xl:grid-cols-2">
            {record.cases[0].variants.map((variant) => <VariantResult key={`${record.id}-${variant.variant}`} result={variant} />)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
