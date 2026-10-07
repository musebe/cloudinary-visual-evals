# Cloudinary Visual Evals Lab

A focused Next.js workbench for comparing baseline and candidate AI-generated product images with Cloudinary-backed evidence.

The application will keep prompts, model configuration, references, managed asset identities, scores, and review decisions traceable. It is an evaluation demo, not a claim that automated scoring guarantees image correctness or safety.

## Current status

The foundation, 50-case dataset, asynchronous Cloudinary generation adapter, fail-closed structured scoring engine, repeatable experiment runner, and interactive case-inspection workbench are implemented. All ten reference assets are now bound to real Cloudinary images, verified through authenticated Admin API readback, and visible in the workbench.

These references are fixed synthetic product illustrations. The local one-case smoke workflow now generates and scores real baseline and candidate assets. A controlled bottle case completed successfully with all three analysis services; the full 50-case benchmark and human-review workflow are still pending.

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

The reference summary should show `10 / 10 bound`. To inspect the latest completed comparison without consuming quota, select **Load last result** in the smoke-test panel.

To generate a new comparison, set `CLOUDINARY_ENABLE_LOCAL_SMOKE=true` in `.env.local` and restart `pnpm dev`. Choose a case, confirm quota usage, and select **Run one-case smoke test**. The server owns both model configurations: the same pinned edit model runs the committed prompt and a candidate text-preservation suffix. Each run submits two generations and up to six analysis requests. Generation credits depend on the model; requests are not equivalent to credits.

The workflow is development-only, bound to the loopback interface, same-origin protected, single-flight, and limited to three attempts per UTC day. Journals live in ignored `.visual-evals/` files. An unresolved accepted job retains its lock and task IDs for reconciliation. Production execution is disabled even if the opt-in flag is set. See [the smoke workflow](./docs/local-smoke.md).

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
