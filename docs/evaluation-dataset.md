# Evaluation dataset

`product-images-v1` is the input evidence for the first visual-regression benchmark. All ten reference assets are uploaded, verified through authenticated Cloudinary readback, and bound to their logical keys. The dataset remains marked `draft` while reference review and live evaluation are pending.

## Why the labels come first

Every prompt and expected attribute is committed before a baseline or candidate is generated. This prevents the benchmark from being rewritten around a preferred output. The dataset contains no scores, pass rates, generated URLs, or expected model outcomes.

The current version is `2026-10-07.2` and uses the label protocol `human-authored-before-generation`. This revision explicitly addresses reference image `[1]` in every prompt.

## Coverage

Ten fictional products are crossed with five prompt families to create 50 cases:

| Prompt family | What it stresses | Output |
| --- | --- | ---: |
| Studio packshot | Product identity, full framing, and clean background | 1024 × 1024 |
| Lifestyle scene | Identity under a contextual scene and plausible scale | 1024 × 1280 |
| Label close-up | Exact text and material detail | 1024 × 1024 |
| Multi-angle layout | Consistency across exactly three views | 1536 × 1024 |
| Campaign banner | Composition constraints and usable negative space | 1536 × 864 |

Every case contains:

- A stable case ID, product ID, prompt family, and prompt version.
- A logical reference key rather than a fabricated Cloudinary asset ID.
- Exact expected text.
- Required and forbidden visual attributes.
- Required scoring dimensions and output dimensions.

[`reference-assets.generated.json`](../src/data/reference-assets.generated.json) now binds all ten logical reference keys to real Cloudinary `asset_id` and `public_id` values. Keeping these environment-specific bindings separate preserves the dataset labels, but an intentional reference replacement still requires review and versioning.

## Reference inputs and limitations

The ten inputs are 1024 × 1024 PNG illustrations of the fictional products with exact-text labels `EVAL-01` through `EVAL-10`. [`provision-reference-assets.mjs`](../scripts/provision-reference-assets.mjs) creates fixed SVG designs and uploads them to public Cloudinary `upload` assets. They are synthetic illustrations, not real product photographs or AI-generated benchmark results.

Run `pnpm cloudinary:references` to reuse and revalidate them. Authenticated Admin API readback confirms their persisted dataset version, logical key, expected text, identity, and media properties. Each manifest binding includes a SHA-256 hash of the delivered PNG bytes in `contentSha256`, not a Cloudinary ETag. Changed previously bound identities, versions, or bytes are rejected.

The workbench exposes a versioned Cloudinary preview for each selected product and reports `10 / 10 bound`. A reference can support inspecting shape, color, composition, and text constraints, but these illustrations do not prove photorealistic materials, real-world scale, or production catalog fidelity. Human review is still needed to judge whether the references represent the intended labels before using them to interpret model comparisons.

No baseline or candidate generation has run against these inputs yet. The dataset contains no measured performance claim, calibrated threshold, or scoring-accuracy result.

## Initial thresholds

Scores use a 0–100 scale. Thresholds are hypotheses to evaluate, not proven production settings.

| Dimension | Fail below | Pass at or above | Middle range |
| --- | ---: | ---: | --- |
| Prompt adherence | 60 | 85 | Human review |
| Reference fidelity | 55 | 82 | Human review |
| Text integrity | 75 | 95 | Human review |
| Technical quality | 60 | 80 | Human review |
| Safety | 80 | 95 | Human review |

The aggregate policy never averages away a failed dimension. A hard violation or score below its failure threshold fails the case. Missing, errored, or borderline evidence routes the case to review. A case passes only when every required dimension has complete evidence at or above its pass threshold.

## Source files

- Dataset contracts: `src/lib/evaluations/contracts.ts`
- Dataset definition: `src/data/product-images-v1.ts`
- Reference designs and provisioning: `scripts/provision-reference-assets.mjs`
- Reference bindings: `src/data/reference-assets.generated.json` and `src/data/reference-assets.ts`
- Pre-generation reference readback: `src/lib/cloudinary/reference-readback.server.ts`
- Decision policy: `src/lib/evaluations/policy.ts`
- Dataset and policy tests: `src/data/product-images-v1.test.ts` and `src/lib/evaluations/policy.test.ts`
