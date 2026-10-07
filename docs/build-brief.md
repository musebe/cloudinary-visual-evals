# Cloudinary Visual Evals Lab — build brief

## Project

**Working article:** Stop Shipping AI Image Regressions: Evaluate Generated Product Images With Next.js and Cloudinary

**Project folder:** `cloudinary-visual-evals`

**Primary reader:** JavaScript developers and AI product engineers who need repeatable evidence before changing an image-generation prompt, model, reference set, or transformation pipeline.

**Proof sentence:** Given the same labeled product-image cases, the application generates baseline and candidate outputs through Cloudinary, reads the managed assets and provenance back, scores separate quality dimensions, and shows which cases regressed.

## Direct answer

Test AI-generated product images with a fixed, representative dataset. Keep the prompt, model, seed, references, and policy version attached to every output. Score prompt adherence, reference fidelity, text and logo integrity, technical quality, and safety separately. Compare a candidate against an accepted baseline, and require human review whenever evidence is missing or ambiguous.

## Product experience

This is an evaluation workbench, not a blog landing page or a general image playground. The main flow stays visible and short:

1. Choose a labeled evaluation dataset.
2. Define baseline and candidate configurations.
3. Run both configurations against the same cases.
4. Compare aggregate metrics and failed dimensions.
5. Open a case to inspect source references, generated assets, scores, and the decision trace.

The interface should prioritize evidence, comparison, and review. It should not show editorial deadlines, article notes, or invented benchmark data.

## Technical foundation

| Layer | Choice | Purpose |
| --- | --- | --- |
| Web application | Next.js 16.4 App Router with Cache Components and React 19.3 | Server-first interface, route handlers, and progressive navigation |
| UI | shadcn components with semantic tokens | Accessible, responsive, restrained evaluation workbench |
| Media | Cloudinary Image Generation, managed assets, optimized delivery, and authenticated Admin API readback | Generate, store, identify, and inspect every visual result |
| Validation | Zod | Validate environment variables, API responses, datasets, and stored evidence |
| JavaScript tests | Vitest | Unit-test contracts, policies, adapters, and result aggregation |
| Optional analysis worker | Python | Deterministic pixel, perceptual, and OCR comparison where it adds measurable value |

## Cloudinary architecture

```text
Browser
  -> Next.js Route Handler
       -> validate experiment and cases
       -> call Cloudinary Image Generation with server credentials
       -> persist returned asset identity and generation provenance
       -> request structured visual analysis and technical quality evidence
  -> compare baseline and candidate scores
  -> pass, review, or fail each dimension
  -> render managed Cloudinary assets and decision traces
```

Trust boundaries:

- The browser never receives the Cloudinary API secret.
- Generation, Admin API readback, and analysis requests run only on the server.
- External model output and analysis text are validated before use.
- Missing evidence cannot produce a passing decision.
- Public delivery URLs are for approved demo assets only; sensitive evaluation inputs require authenticated or controlled delivery.

## Asset and provenance model

Use a predictable folder shape:

```text
visual-evals/<experiment-id>/<case-id>/<baseline-or-candidate>
```

Attach tags for the project, experiment, case, and variant. Retain at least:

- Cloudinary `asset_id`, `public_id`, resource type, and secure delivery URL.
- Dataset version, case ID, prompt version, and reference asset IDs.
- Requested and resolved model, seed when supported, and generation timestamp.
- Raw dimension scores, normalized scores, thresholds, final decision, and policy version.
- Reviewer decision and note for cases routed to human review.

Do not use filenames or URLs as the only identity. Prefer Cloudinary's immutable `asset_id` when reconciling results.

## Evaluation dimensions

| Dimension | Evidence | Initial decision rule |
| --- | --- | --- |
| Prompt adherence | Structured AI Vision response against required and forbidden attributes | Fail on a forbidden attribute or a missing required product attribute |
| Reference fidelity | Perceptual and semantic comparison to labeled references | Review below the fidelity threshold; fail on product identity drift |
| Text and logo integrity | OCR plus expected text or mark checks | Fail on missing, altered, or hallucinated required text |
| Technical quality | Resolution, format, crop safety, blur, noise, and Cloudinary quality evidence | Fail required delivery constraints; review borderline quality |
| Safety and policy | Moderation or policy classifier response | Fail hard policy violations; review incomplete analysis |
| Human preference | Blind baseline-versus-candidate review on disputed cases | Store separately from automated scores and never backfill it automatically |

The aggregate decision is `pass`, `review`, or `fail`. A candidate passes only when every required dimension has complete evidence and meets its threshold.

## Benchmark plan

Start with 50 synthetic or rights-cleared cases: 10 product identities across five prompt families. Labels must be written before a candidate run and must include required attributes, forbidden attributes, expected text, reference assets, and dimension thresholds.

Report:

- Per-dimension pass rate and candidate delta from baseline.
- Overall failed-case and review-case rates.
- Text and logo integrity rate.
- Reference-fidelity distribution.
- Median and p95 generation and scoring latency.
- Request count and quota or estimated cost per experiment.
- False positives and false negatives from the human-reviewed subset.

Results describe only the named dataset, prompt version, model configuration, and policy version. They are not a general claim about all generated product images.

## Staged implementation and commits

| Checkpoint | Deliverable | Commit intent |
| --- | --- | --- |
| 1 | Next.js 16.4, shadcn, responsive shell, build brief, and build log | `chore: scaffold visual evals lab` |
| 2 | Typed environment configuration, Cloudinary server client, and health route | `feat: add Cloudinary server foundation` |
| 3 | Versioned dataset contracts, fixtures, and policy tests | `feat: define evaluation dataset` |
| 4 | Cloudinary baseline and candidate generation pipeline with provenance | `feat: generate managed evaluation assets` |
| 5 | Structured visual scoring and fail-closed decisions | `feat: score visual evaluation cases` |
| 6 | Experiment runner, progress states, retries, and aggregation | `feat: run repeatable visual experiments` |
| 7 | Comparison dashboard and per-case evidence view | `feat: compare visual regressions` |
| 8 | Human review workflow and auditable overrides | `feat: add human review gate` |
| 9 | Reproducible benchmark, screenshots, README, and article evidence | `docs: publish evaluation workflow evidence` |

Each checkpoint must pass linting, type checks, tests, and a production build before it is committed.

## Cloudinary setup to complete before live generation

- Register the Image Generation add-on in the selected product environment and confirm its quota.
- Confirm access to each analysis capability used by the scoring policy; the Analyze API and some analysis modes may be Beta or require add-ons.
- Decide whether the first benchmark locks explicit model IDs or treats resolved-model changes as a tested variable.
- Provision structured metadata only after the persisted evaluation schema is stable.

## Non-goals for the first demo

- No claim that automated visual scoring guarantees image safety or correctness.
- No public prompt playground or anonymous unbounded generation.
- No client-side Cloudinary credentials.
- No production-scale durable queue in the first article demo.
- No editorial brief, SEO notes, or article handoff content inside the demo interface.

## Primary references

- [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- [Cloudinary Image Generation](https://cloudinary.com/documentation/image_generation_addon)
- [Cloudinary Image Generation API](https://cloudinary.com/documentation/image_generation_api_reference)
- [Cloudinary Analyze API](https://cloudinary.com/documentation/analyze_api_guide)
- [Vercel: An introduction to evals](https://vercel.com/kb/guide/an-introduction-to-evals)
