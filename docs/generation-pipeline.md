# Cloudinary generation pipeline

Checkpoint 4 implements the server-side boundary for repeatable baseline and candidate generation. It does not expose a public generation route or claim a benchmark result.

## Why the pipeline is asynchronous

Cloudinary Image Generation can run synchronously or asynchronously. This project requests asynchronous `image_to_image` jobs so a Next.js request does not need to stay open while a model generates an image. Cloudinary returns a task ID, and the later experiment runner will persist and poll that task.

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

The dataset stores stable logical keys rather than environment-specific URLs. [`reference-assets.ts`](../src/data/reference-assets.ts) maps those keys to real Cloudinary identities after reference images are uploaded.

Each binding retains the immutable `asset_id`, public ID, version, ETag, media dimensions, format, and byte size. Version and ETag make an overwritten reference detectable even though its Cloudinary asset ID can remain stable.

The checked-in manifest is intentionally empty. It reports all ten references as missing instead of substituting sample IDs or fake images. A later asset-ingestion checkpoint will populate it only from authenticated Cloudinary readback.

## Provenance record

When a task completes, the normalizer records both requested and returned values:

| Evidence | Stored fields |
| --- | --- |
| Evaluation identity | Dataset ID and version, case ID, experiment ID, variant, configuration ID |
| Prompt identity | Prompt version, executed prompt, SHA-256 prompt hash |
| Reference snapshot | Logical key, asset ID, public ID, version, ETag |
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

Before live generation, register the Cloudinary Image Generation add-on, fill `.env.local`, upload or generate the ten rights-cleared references, and bind their authenticated readback values in the reference manifest.

Official references:

- [Cloudinary Image Generation](https://cloudinary.com/documentation/image_generation_addon)
- [Image Generation API reference](https://cloudinary.com/documentation/image_generation_api_reference)
