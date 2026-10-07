# Cloudinary Visual Evals Lab

A focused Next.js workbench for comparing baseline and candidate AI-generated product images with Cloudinary-backed evidence.

The application will keep prompts, model configuration, references, managed asset identities, scores, and review decisions traceable. It is an evaluation demo, not a claim that automated scoring guarantees image correctness or safety.

## Current status

The foundation, 50-case dataset, asynchronous Cloudinary generation adapter, fail-closed structured scoring engine, repeatable experiment runner, and interactive case-inspection workbench are implemented. All ten reference assets are now bound to real Cloudinary images, verified through authenticated Admin API readback, and visible in the workbench.

These references are fixed synthetic product illustrations, not product photographs or generated benchmark outputs. Live experiments remain disabled until the required generation and analysis add-ons are confirmed and a run endpoint is enabled. No live generation scores or benchmark results have been recorded.

- [Build brief](./docs/build-brief.md)
- [Build log](./docs/build-log.md)
- [Cloudinary setup](./docs/cloudinary-setup.md)
- [Evaluation dataset](./docs/evaluation-dataset.md)
- [Generation pipeline](./docs/generation-pipeline.md)
- [Scoring pipeline](./docs/scoring-pipeline.md)
- [Experiment runner](./docs/experiment-runner.md)

## Stack

- Next.js 16.4 and React 19.3
- TypeScript and Tailwind CSS 4
- shadcn components
- `next-cloudinary` and the Cloudinary Node.js SDK
- Zod and Vitest

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Add your Cloudinary cloud name, API key, and API secret to `.env.local`. Keep the API secret server-only and never prefix it with `NEXT_PUBLIC_`.

Verify the authenticated connection once after configuring the file:

```bash
pnpm cloudinary:verify
```

Provision or revalidate the ten references in the configured product environment:

```bash
pnpm cloudinary:references
```

The command creates missing public PNG references without overwriting existing assets, verifies their persisted context and identity, and writes the environment-specific bindings to [`reference-assets.generated.json`](./src/data/reference-assets.generated.json). Reruns check the recorded identities, versions, and `contentSha256` byte fingerprints. See [Cloudinary setup](./docs/cloudinary-setup.md) before using a different product environment.

The public `GET /api/health` route reports configuration readiness without making a rate-limited Admin API request or returning credential values.

## What you can test now

Open `http://localhost:3000`, then change the product and prompt-family selectors. Each combination should update the URL and show its committed prompt, exact-text label, required and forbidden evidence, output size, reference key, decision thresholds, and a versioned Cloudinary preview of the selected synthetic reference.

The reference summary should show `10 / 10 bound`, and the selected reference should show **Bound**. Credentials show **Present** after `.env.local` is configured, but add-on access remains **Not verified**. The smoke-run button is intentionally disabled because add-on access and the browser-facing runner are not yet enabled. These readiness labels are not live benchmark results.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run all checks with `pnpm check`.

## Documentation rule

Record each implemented stage and its verification evidence in `docs/build-log.md`. The later tutorial should describe only behavior that exists in the repository and has been tested.
