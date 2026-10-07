# Cloudinary generation pipeline

Checkpoint 4 implements the server-side boundary for repeatable baseline and candidate generation. It does not expose a public generation route or claim a benchmark result.

## Why the pipeline is asynchronous

Cloudinary Image Generation can run synchronously or asynchronously. This project requests asynchronous `image_to_image` jobs so a Next.js request does not need to stay open while a model generates an image. Cloudinary returns a task ID, which the implemented experiment runner retains and polls. Durable run persistence and a browser-facing run endpoint are not enabled yet.

The adapter deliberately separates two operations:

1. Start one generation exactly once.
2. Poll the returned task until it is complete or failed.

A failed task poll can be retried. A timed-out start request is marked `outcomeUnknown` because Cloudinary might have accepted and charged for the generation even if the client did not receive the response. The runner must reconcile the deterministic target public ID before it submits another request.

## Request contract

Every case uses Cloudinary's reference-guided endpoint and sends:

- The committed prompt, including the positional reference marker `[1]`.
- One managed Cloudinary reference asset identified by immutable `asset_id`.
- An explicit edit-model ID, a family and tier, or automatic model selection.
- The case's requested pixel dimensions and output format.
- A managed target public ID in this shape:

```text
visual-evals/<experiment-id>/<case-id>/<baseline-or-candidate>
```

- `async: true` so the response contains a traceable task ID.

The project does not silently prepend instructions to a labeled prompt. Prompt changes are explicit, versioned configuration inputs.

## Reference manifest

The dataset stores stable logical keys rather than environment-specific URLs. [`reference-assets.ts`](../src/data/reference-assets.ts) validates and loads [`reference-assets.generated.json`](../src/data/reference-assets.generated.json), which binds all ten keys to real Cloudinary identities for dataset version `2026-10-07.2`.

Each binding retains the immutable `asset_id`, public ID, version, resource and delivery types, media dimensions, format, byte size, and `contentSha256`. The SHA-256 fingerprint is calculated from delivered PNG bytes; it is not an ETag copied from a provider response. Identity, version, and content fingerprint checks make changed references detectable.

The references are fixed synthetic illustrations of fictional products, created from SVG designs and uploaded as 1024 × 1024 public PNG images. They are not product photographs or generated baseline and candidate outputs. The workbench displays a versioned preview of the selected reference, separate from any future generated result.

Run `pnpm cloudinary:references` to provision missing references or revalidate existing bindings. The script uses authenticated Admin API readback to verify persisted context and identity, hashes the delivered bytes, and writes the manifest only after all ten assets pass. Reruns refuse changed previously bound assets instead of silently replacing the input evidence.

Before paid generation, the server adapter additionally reads every selected reference by immutable asset ID. It verifies dataset and reference context, identity, version, media properties, and a versioned HTTPS Cloudinary URL, then checks the original PNG byte count and `contentSha256`. A mismatch blocks the run. A workbench **Bound** label shows manifest coverage, not a new authenticated live readback on every page view.

## Provenance record

When a task completes, the normalizer records both requested and returned values:

| Evidence | Stored fields |
| --- | --- |
| Evaluation identity | Dataset ID and version, case ID, experiment ID, variant, configuration ID |
| Prompt identity | Prompt version, executed prompt, SHA-256 prompt hash |
| Reference snapshot | Logical key, asset ID, public ID, version, content SHA-256 fingerprint |
| Requested generation | Model selector, seed, dimensions, format, target public ID |
| Resolved generation | Concrete model ID, family, tier, returned seed |
| Managed output | Asset ID, public ID, version, delivery type, URL, actual dimensions, format, bytes |
| Cloudinary trace | Request ID, task ID, notices, quota snapshot |
| Timing | Submitted time, completion time, duration |

Requested and returned dimensions, formats, and seeds remain separate because a model can map an unsupported format or ignore a seed. The concrete response `model.id` is the model identity used for comparison.

After normalization, the server reads the completed image back through the Cloudinary Admin API by `asset_id`. The readback must return exactly one image with the same immutable asset ID, public ID, version, resource type, and delivery type before the experiment can treat the output as persisted evidence.

## Safety and cost controls

- API credentials are loaded only by a `server-only` module.
- Raw Cloudinary errors and authentication headers are never serialized.
- Managed output must contain an immutable asset ID and match the requested target public ID.
- The public app has no unbounded generation endpoint.
- The full benchmark would require 100 generations: 50 baseline plus 50 candidate. The runner will start with a smoke subset and stop when quota evidence says it should not continue.

Reference provisioning and authenticated readback are complete for the configured environment. Before live generation, confirm Cloudinary Image Generation and analysis add-on access and quotas, review the synthetic reference inputs, and enable the guarded run workflow. No live generation score or benchmark result is claimed yet.

Official references:

- [Cloudinary Image Generation](https://cloudinary.com/documentation/image_generation_addon)
- [Image Generation API reference](https://cloudinary.com/documentation/image_generation_api_reference)
