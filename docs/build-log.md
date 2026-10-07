# Build log

This file records implementation decisions and verification evidence while the demo is built. It will become the factual source for the tutorial later.

## Foundation

- Created the application with Next.js 16.4, React 19.3, TypeScript, Tailwind CSS 4, ESLint, the App Router, and a `src` directory.
- Kept Cache Components and partial prefetching enabled, matching the Next.js 16.4 defaults.
- Installed the local shadcn skill and initialized shadcn with Base UI components and semantic color tokens.
- Added `next-cloudinary`, the Cloudinary Node.js SDK, Zod, and Vitest.
- Added a small responsive shell that explains the evaluation loop without inventing benchmark results.
- Recorded the Cloudinary trust boundary, evaluation dimensions, benchmark plan, and staged commit plan in the build brief.

## Verification

- Foundation checks: passed ESLint, TypeScript, the configured Vitest runner, and the Next.js production build on October 7, 2026.
- Cloudinary foundation: passed ESLint, TypeScript, six environment and health tests, and a Next.js production build on October 7, 2026.
- Dataset and policy checkpoint: passed ESLint, TypeScript, 17 tests across four files, and a Next.js production build on October 7, 2026.
- Managed generation checkpoint: passed ESLint, TypeScript, 34 tests across eight files, and a Next.js production build on October 7, 2026.
- Structured scoring checkpoint: passed ESLint, TypeScript, 56 tests across 11 files, and a Next.js production build on October 7, 2026.
- Evaluation workbench slice: passed ESLint, TypeScript, 59 tests across 12 files, a Next.js production build, and query-addressable case smoke checks on October 7, 2026.
- Repeatable experiment runner: passed ESLint, TypeScript, 68 tests across 15 files, and a Next.js production build on October 7, 2026.
- Reference and runner-safety checkpoint: passed ESLint, TypeScript, 88 tests across 16 files, and a Next.js production build on October 8, 2026. The reference provisioning rerun reused all ten assets; selected-reference authenticated preflight passed. A browser check at 390 px verified a loaded EVAL-10 preview, the Geist font, and no horizontal overflow.
- Local smoke checkpoint: passed ESLint, TypeScript, 110 tests across 19 files, and a Next.js production build on October 8, 2026. A 390 px browser check loaded reference and generated previews without document overflow. Production returned HTTP 403 for both execution and saved-result routes while the local opt-in flag remained set; the main page returned HTTP 200.
- `GET /api/health`: verified as an uncached dynamic route; it returned the expected HTTP 503 and a secret-free JSON body while local credentials were absent.
- Authenticated Cloudinary ping: connected successfully to the configured product environment on October 7, 2026; the command exposed no credentials.
- Domain tests: begin with the versioned dataset and evaluation-policy checkpoint.
- Reference asset checkpoint: all ten public PNG references are bound from authenticated Admin API readback; repeatable byte fingerprints are recorded in `contentSha256`. Live generation was still pending at that checkpoint.
- Live Cloudinary generation: one controlled local baseline/candidate pair verified with managed-asset readback and all three analysis services on October 8, 2026 (Nairobi).
- Full baseline benchmark: pending; smoke results are not the 50-case benchmark.

## Cloudinary server foundation

- Added a lazy Zod environment parser so imports and production builds do not fail before runtime configuration exists.
- Added a server-only Cloudinary Node.js client with bounded Admin API timeouts.
- Added a public configuration health check and a separate one-time authenticated verification command to avoid spending Admin API quota on every public request.
- Rejected unchanged `.env.example` placeholders and tested that serialized health responses never contain the API key or secret.
- Used Next.js 16.4's `io()` request-time boundary. Validation caught that the older `runtime = "nodejs"` route export is incompatible with Cache Components, so it was removed; Node.js remains the default runtime.
- Confirmed that Cloudinary MCP OAuth requires reauthorization. Product-environment API keys still come from Console → Settings → API Keys unless the account has the separate Enterprise Provisioning API.

## Versioned evaluation dataset

- Added `product-images-v1` with 10 fictional products and five prompt families, producing 50 labeled cases.
- Wrote all labels before generation: exact text, required and forbidden attributes, logical reference keys, prompt versions, output dimensions, and required scoring dimensions.
- Kept Cloudinary asset bindings out of the labels so the next checkpoint can map logical keys to real immutable `asset_id` values without changing benchmark intent.
- Added strict Zod contracts that reject unknown output fields, duplicate identities, unknown products, mismatched reference keys, repeated dimensions, and invalid thresholds.
- Added a fail-closed policy with versioned thresholds and explicit hard-violation codes. One failed dimension cannot be hidden by a high average; missing or incomplete evidence routes to review.
- No generation scores or benchmark results have been recorded yet.

## Managed baseline and candidate generation

- Added strict request, async-task, response, and error contracts for Cloudinary Image Generation API v1.4.0.
- Updated all 50 committed prompts to address managed reference image `[1]` explicitly and bumped the pre-run dataset version to `2026-10-07.2`.
- Added a reference-manifest contract that retains Cloudinary `asset_id`, public ID, version, dimensions, format, and byte size. At this checkpoint its bindings were intentionally empty; the reference asset checkpoint below populates real environment-specific identities and uses `contentSha256` instead of ETag.
- Added deterministic, separate managed output targets for baseline and candidate variants.
- Added a server-only Basic-auth adapter that starts asynchronous `image_to_image` jobs and polls task IDs with bounded timeouts and no HTTP caching.
- Treats a timed-out POST as an unknown outcome rather than retrying a possibly accepted and billed generation. Task polling remains safely retryable.
- Added normalized provenance for dataset, prompt, reference snapshot, requested configuration, resolved model, managed output, quota, notices, and timing.
- Added an authenticated Admin API readback that requires the persisted asset identity and version to match the generation provenance.
- Never serializes the Cloudinary API key, secret, raw error message, or response body.
- At this checkpoint, live generation was pending Image Generation add-on access and ten real reference assets; no fake identities or benchmark outputs were added. The later reference and local-smoke checkpoints complete those prerequisites for the current environment.

## Structured visual scoring

- Added strict request and response contracts for Cloudinary Analyze API AI Vision General, AI Vision Moderation, and Image Quality Analysis.
- Bound all analysis to the exact versioned Cloudinary output URL and rejected mismatched returned `data.entity` values.
- Validated dataset version, case, product, reference key, and generation provenance before starting any paid analysis request.
- Kept model observations separate from policy authority: AI Vision reports committed labels and uncertainty, while application code calculates deterministic scores and hard violations.
- Added five fixed safety rejection questions. A `yes` fails; `unknown`, duplicate, missing, or altered questions route to review.
- Changed aggregate scoring so any missing or incomplete required dimension produces a null aggregate instead of a misleading partial average.
- Sanitized provider errors while preserving safe request, status, category, retry, and outcome metadata for later audit and retry logic.
- Added 22 scoring and transport tests covering pass, fail, review, stale provenance, source mismatches, malformed structured output, invented labels, delivery mismatches, low confidence, safety results, rate limits, timeouts, and response-stream failures.
- This checkpoint used fixtures and mocked Analyze responses. The later smoke checkpoint verifies endpoint access and records one run's latency and generation quota. Scoring accuracy, calibrated costs, and false-positive or false-negative rates remain unmeasured.
- Reference fidelity currently means comparison with precommitted textual identity labels. Dedicated reference-image comparison and OCR remain possible later extensions, not current claims.

## Evaluation workbench preflight

- Replaced the landing-only workflow cards with a focused, responsive case-inspection workbench.
- Added product and prompt-family selectors covering all 50 committed cases. The selected pair is reflected in URL query parameters so a case can be refreshed, linked, and revisited with browser history.
- Exposed only committed evidence: prompt version, requested output size, exact expected text, required and forbidden attributes, reference key, and all five decision thresholds.
- Added a truthful readiness rail. It distinguishes locally present credentials from a live connection check. At this checkpoint it reported zero of ten references bound; the reference asset checkpoint below changes coverage to ten of ten while add-on access remains unverified.
- Kept the one-case smoke-run control disabled with visible blocker reasons. Inspecting cases is testable now; no paid request can run until references, add-ons, and the runner are ready.
- Added a client-safe view-model builder and tests so the browser receives no credentials or provider response internals.

## Repeatable experiment runner

- Added a versioned experiment plan binding one dataset revision, unique case IDs, and distinct baseline and candidate configurations.
- Prevalidates the full selected reference set before starting any paid generation request.
- Executes explicit progress phases for each variant and preserves sanitized failures without preventing the other variant from completing.
- Never retries a generation start because a timeout can have an unknown, billable outcome. Only retryable task polls with known outcomes receive bounded exponential retries.
- Reads each completed managed asset back by immutable identity before scoring it.
- Aggregates decision counts, paired completion, regression case IDs, and per-dimension score and pass-rate deltas. Missing variants count against pass rate and do not enter numeric averages.
- The server adapter is implemented but no public run endpoint or persistence layer is enabled yet. Tests use mocked provider responses; no live generation result or benchmark number is claimed.

## Provisioned synthetic reference assets

- Added the reusable `pnpm cloudinary:references` command and fixed SVG designs for all ten fictional products. Cloudinary stores them as 1024 × 1024 public PNG references under `visual-evals/references/<product-id>-v1` public IDs.
- The images are synthetic illustrations, not photographs or AI-generated baseline and candidate outputs. Each carries its precommitted `EVAL-01` through `EVAL-10` text label.
- Used `overwrite: false` and authenticated Admin API readback to confirm persisted `dataset_id`, `dataset_version`, `reference_key`, and `expected_text` context, public ID, resource and delivery types, format, and dimensions.
- Populated `src/data/reference-assets.generated.json` with all ten immutable asset IDs, public IDs, versions, dimensions, byte counts, and `contentSha256` hashes calculated from delivered PNG bytes. The fingerprint field is not a Cloudinary ETag.
- Provisioning reuses matching assets, preserves the manifest timestamp when unchanged, and rejects missing or changed previously bound identities, versions, or byte fingerprints. It writes the manifest only after the full reference set passes.
- Added server-side reference preflight by immutable asset ID before generation. It validates dataset and reference context, identity, version, media properties, versioned HTTPS delivery, byte count, and content SHA-256 fingerprint before paid requests can start.
- Added versioned Cloudinary reference previews to the case workbench and updated coverage to ten of ten. The preview is labeled as a fixed synthetic reference and includes descriptive alt text.
- Public PNG delivery is deliberate for this non-confidential fictional dataset. The script requests `X-Robots-Tag: noindex, nofollow`; that header does not make the media private.
- Reference provisioning alone does not confirm Image Generation, AI Vision, or Image Quality Analysis entitlement. At this checkpoint the control remained locked. The later local-smoke checkpoint verifies endpoint access; the dataset still remains `draft` pending human calibration.

## Guarded local smoke workflow

- Added a development-only, same-origin loopback endpoint for one committed case with fixed server configurations, explicit quota consent, an atomic single-flight lock, and a three-attempt UTC daily limit.
- Bound `pnpm dev` to `127.0.0.1` and added an opt-in flag. Production execution is always denied.
- Added NDJSON progress, responsive baseline/candidate previews, separate dimension decisions, JSON export, and a no-generation **Load last result** action.
- Stored plans, submission intents, accepted task responses, and final records in ignored local `.visual-evals/` journals. Uncertain jobs retain their lock; progress transport errors do not change provider outcomes.
- Added route and filesystem regression tests for production and cross-origin denial, quota consent, unknown cases, storage errors, exclusive leases, atomic journal replacement, saved-result restoration, preflight release, and the UTC daily limit. Daily counting happens under the lease to prevent concurrent quota checks from racing.
- Controlled live case: `cobalt-trail-bottle-studio-packshot`, `flux-2-klein-9b-edit`, two 1024 × 1024 PNG outputs, 26.1 seconds runner duration, both policy decisions `pass`. Technical-quality scores were 87.77 baseline and 84.51 candidate. Cloudinary reported three generation credits per variant. All six analysis calls returned complete evidence.
- A later local orange-carry-on multi-angle record had a `pass` baseline and `review` candidate because AI Vision structured evidence failed validation. Its candidate aggregate remained null.
- A third bottle-label close-up recorded `fail` for both variants on missing identity evidence and candidate identity drift. These findings remain subject to human calibration. Subsequent requests returned HTTP 409 under the three-run cap.
- These are smoke records, not benchmark or human-calibrated quality claims. Shared persistence, durable execution, human review, and the full benchmark remain pending.
