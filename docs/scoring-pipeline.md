# Cloudinary visual scoring pipeline

Checkpoint 5 converts one completed Cloudinary generation into five separate, auditable dimension results. It does not expose a public scoring endpoint or claim measured model accuracy.

## Required Cloudinary capabilities

The Analyze API is currently a Public Beta. This checkpoint uses:

- `ai_vision_general` for structured visible-attribute and text observations. It requires the Cloudinary AI Vision add-on.
- `ai_vision_moderation` for five fixed rejection questions. It also requires Cloudinary AI Vision.
- `image_quality` for an overall image-quality score and confidence. It requires Cloudinary AI Content Analysis.

Valid Cloudinary credentials do not prove that these add-ons or sufficient quota are available. Live analysis remains disabled until access is confirmed in the selected product environment.

## Evidence flow

The server validates the dataset ID and version, case, product, reference key, and generation provenance before making any analysis request. It then runs three synchronous analysis calls in parallel against the same versioned Cloudinary delivery URL.

Each returned `data.entity` must exactly match that URL. The score record retains the generated asset ID, public ID, version, analysis request IDs, model versions, and sanitized provider error metadata.

```text
completed generation provenance
  -> validate dataset + case + product + asset version
  -> AI Vision structured observations
  -> AI Vision fixed safety questions
  -> Image Quality Analysis
  -> deterministic application scoring
  -> pass, review, or fail
```

The vision model reports only labeled findings and uncertainty. It does not assign numeric scores. Application code validates every returned label against the committed dataset and calculates scores from the versioned rules.

## Fail-closed decisions

- Missing, malformed, mismatched, errored, unavailable, or uncertain required evidence produces `review` and a null aggregate score.
- A hard violation or a score below a dimension's failure threshold produces `fail`.
- A borderline score produces `review`.
- `pass` requires every required dimension to be complete, violation-free, and at or above its pass threshold.
- An average never overrides an individual failed or review dimension.

The current thresholds are policy hypotheses for the demo. They have not yet been calibrated against human labels.

## Current evidence limits

| Dimension | What is implemented | What is not yet claimed |
| --- | --- | --- |
| Prompt adherence | AI Vision returns missing, forbidden, and uncertain precommitted attributes | Complete semantic correctness |
| Reference fidelity | The output is checked against textual identity attributes derived from the labeled reference | Pixel, embedding, side-by-side, or perceptual reference comparison |
| Text integrity | AI Vision reports visible text; application code exact-matches it to committed strings | Dedicated OCR accuracy or logo verification |
| Technical quality | Cloudinary IQA score/confidence plus exact dimensions and format | Separate crop-safety, blur, noise, or composition metrics |
| Safety | Five fixed rejection questions; any `yes` fails and `unknown` reviews | General safety, compliance, or coverage beyond those questions |

Checkpoint 5 returns records in memory. Persistence, experiment aggregation, baseline-versus-candidate deltas, retries, quota enforcement, human overrides, and evidence UI belong to later checkpoints.

Official references:

- [Cloudinary Analyze API guide](https://cloudinary.com/documentation/analyze_api_guide)
- [Cloudinary Analyze API reference](https://cloudinary.com/documentation/analyze_api_reference)
- [Cloudinary AI Vision](https://cloudinary.com/documentation/cloudinary_ai_vision_addon)
- [Cloudinary image quality analysis](https://cloudinary.com/documentation/image_quality_analysis)
