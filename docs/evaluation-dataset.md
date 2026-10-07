# Evaluation dataset

`product-images-v1` is the input evidence for the first visual-regression benchmark. It is a draft until the reference assets are created, reviewed, uploaded, and bound to their logical keys.

## Why the labels come first

Every prompt and expected attribute is committed before a baseline or candidate is generated. This prevents the benchmark from being rewritten around a preferred output. The dataset contains no scores, pass rates, generated URLs, or expected model outcomes.

The current version is `2026-10-07.1` and uses the label protocol `human-authored-before-generation`.

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

The next asset checkpoint will bind each logical reference key to a real Cloudinary `asset_id` and `public_id` in a separate manifest. Keeping that binding separate lets the labels remain stable if an asset is re-uploaded.

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
- Decision policy: `src/lib/evaluations/policy.ts`
- Dataset and policy tests: `src/data/product-images-v1.test.ts` and `src/lib/evaluations/policy.test.ts`
