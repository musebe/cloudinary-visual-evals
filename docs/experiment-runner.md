# Repeatable experiment runner

The experiment runner executes the same committed cases against distinct baseline and candidate configurations. It is a server-only orchestration layer; it does not accept credentials, prompts, reference assets, or output targets from the browser.

## Execution sequence

Before making a paid request, the runner validates the dataset ID and version, unique case IDs, distinct configuration IDs, and every selected reference binding. Cases then run in their committed order. For each case, the baseline completes before the candidate starts so the first demo does not create an uncontrolled quota burst.

Each variant moves through these observable phases:

```text
queued
  -> starting_generation
  -> waiting_generation
  -> verifying_asset
  -> scoring
  -> complete | failed
```

The completed result retains generation provenance and the fail-closed scoring decision. A failed variant stores a sanitized code, phase, request ID, retryability, and whether the outcome is unknown. Its optional `generation` record preserves the original job, target public ID, submission time, accepted task and request IDs, and last observed status so it can be reconciled without a new generation.

## Retry policy

| Operation | Automatic retry | Reason |
| --- | --- | --- |
| Start image generation | Never | A timeout may hide an accepted, billable job |
| Poll an existing task | Bounded exponential retry | The task ID makes the read safe to repeat |
| Managed-asset readback | No | A failure stays visible instead of hiding identity uncertainty |
| Analyze and score | No runner-level retry | The scoring adapter converts unavailable evidence into `review` |

The task poll count and transient retry count are independently bounded. Exhaustion while a task remains pending or processing reports an unknown outcome and disallows resubmission. Progress observers cannot change successful provider results when the client disconnects or a callback fails.

## Aggregation

The aggregate reports baseline and candidate decision counts, paired completion, overall regression case IDs, and per-dimension score and pass-rate deltas. The pass-rate denominator includes every planned case, so provider failures and missing evidence cannot improve the reported rate by disappearing from the denominator. Averages include only complete numeric evidence and remain `null` when a side has no complete score.

## Current boundary

The domain runner and server adapter are implemented and covered with mocked provider responses. A development-only one-case endpoint now streams progress and stores local recovery journals; a live baseline/candidate pair has completed generation, readback, and scoring. The public production endpoint remains disabled. Durable background execution, shared storage, full benchmark runs, and human-review persistence remain future stages. See [local smoke testing](./local-smoke.md).
