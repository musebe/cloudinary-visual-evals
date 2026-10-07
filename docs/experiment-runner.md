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

The completed result retains generation provenance and the fail-closed scoring decision. A failed variant stores only a sanitized code, phase, request ID when available, retryability, and whether the outcome is unknown.

## Retry policy

| Operation | Automatic retry | Reason |
| --- | --- | --- |
| Start image generation | Never | A timeout may hide an accepted, billable job |
| Poll an existing task | Bounded exponential retry | The task ID makes the read safe to repeat |
| Managed-asset readback | No | A failure stays visible instead of hiding identity uncertainty |
| Analyze and score | No runner-level retry | The scoring adapter converts unavailable evidence into `review` |

The task poll count and transient retry count are independently bounded. Reaching either boundary creates a visible failed variant instead of an endless request.

## Aggregation

The aggregate reports baseline and candidate decision counts, paired completion, overall regression case IDs, and per-dimension score and pass-rate deltas. The pass-rate denominator includes every planned case, so provider failures and missing evidence cannot improve the reported rate by disappearing from the denominator. Averages include only complete numeric evidence and remain `null` when a side has no complete score.

## Current boundary

The domain runner and server adapter are implemented and covered with mocked provider responses. There is no public execution endpoint, persistence layer, durable background job, or live result in this checkpoint. The UI therefore reports the runner as not enabled and keeps generation locked while the reference manifest is empty and Cloudinary add-on access is unconfirmed.
