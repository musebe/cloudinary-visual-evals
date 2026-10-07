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
- `GET /api/health`: verified as an uncached dynamic route; it returned the expected HTTP 503 and a secret-free JSON body while local credentials were absent.
- Authenticated Cloudinary ping: connected successfully to the configured product environment on October 7, 2026; the command exposed no credentials.
- Domain tests: begin with the versioned dataset and evaluation-policy checkpoint.
- Live Cloudinary generation: pending credentials and Image Generation add-on access.
- Baseline benchmark: pending implementation.

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
- Added an environment-independent reference manifest that retains Cloudinary `asset_id`, public ID, version, ETag, dimensions, format, and byte size. It is intentionally empty until real authenticated assets are available.
- Added deterministic, separate managed output targets for baseline and candidate variants.
- Added a server-only Basic-auth adapter that starts asynchronous `image_to_image` jobs and polls task IDs with bounded timeouts and no HTTP caching.
- Treats a timed-out POST as an unknown outcome rather than retrying a possibly accepted and billed generation. Task polling remains safely retryable.
- Added normalized provenance for dataset, prompt, reference snapshot, requested configuration, resolved model, managed output, quota, notices, and timing.
- Added an authenticated Admin API readback that requires the persisted asset identity and version to match the generation provenance.
- Never serializes the Cloudinary API key, secret, raw error message, or response body.
- Live generation remains pending Image Generation add-on access and ten real reference assets; no fake identities or benchmark outputs were added.

## Structured visual scoring

- Added strict request and response contracts for Cloudinary Analyze API AI Vision General, AI Vision Moderation, and Image Quality Analysis.
- Bound all analysis to the exact versioned Cloudinary output URL and rejected mismatched returned `data.entity` values.
- Validated dataset version, case, product, reference key, and generation provenance before starting any paid analysis request.
- Kept model observations separate from policy authority: AI Vision reports committed labels and uncertainty, while application code calculates deterministic scores and hard violations.
- Added five fixed safety rejection questions. A `yes` fails; `unknown`, duplicate, missing, or altered questions route to review.
- Changed aggregate scoring so any missing or incomplete required dimension produces a null aggregate instead of a misleading partial average.
- Sanitized provider errors while preserving safe request, status, category, retry, and outcome metadata for later audit and retry logic.
- Added 22 scoring and transport tests covering pass, fail, review, stale provenance, source mismatches, malformed structured output, invented labels, delivery mismatches, low confidence, safety results, rate limits, timeouts, and response-stream failures.
- Tests use fixtures and mocked Analyze responses. Live Analyze access, latency, quota behavior, costs, scoring accuracy, and false-positive or false-negative rates have not yet been verified.
- Reference fidelity currently means comparison with precommitted textual identity labels. Dedicated reference-image comparison and OCR remain possible later extensions, not current claims.

## Evaluation workbench preflight

- Replaced the landing-only workflow cards with a focused, responsive case-inspection workbench.
- Added product and prompt-family selectors covering all 50 committed cases. The selected pair is reflected in URL query parameters so a case can be refreshed, linked, and revisited with browser history.
- Exposed only committed evidence: prompt version, requested output size, exact expected text, required and forbidden attributes, reference key, and all five decision thresholds.
- Added a truthful readiness rail. It distinguishes locally present credentials from a live connection check, reports zero of ten references bound, and leaves Image Generation, AI Vision, and Image Quality Analysis access unverified.
- Kept the one-case smoke-run control disabled with visible blocker reasons. Inspecting cases is testable now; no paid request can run until references, add-ons, and the runner are ready.
- Added a client-safe view-model builder and tests so the browser receives no credentials or provider response internals.
