# Cloudinary Visual Evals Lab

A focused Next.js workbench for comparing baseline and candidate AI-generated product images with Cloudinary-backed evidence.

The application will keep prompts, model configuration, references, managed asset identities, scores, and review decisions traceable. It is an evaluation demo, not a claim that automated scoring guarantees image correctness or safety.

## Current status

The foundation, 50-case dataset, asynchronous Cloudinary generation adapter, and fail-closed structured scoring engine are complete. Live experiments remain disabled until real reference assets and the required Cloudinary generation and analysis add-ons are confirmed; no benchmark scores are mocked.

- [Build brief](./docs/build-brief.md)
- [Build log](./docs/build-log.md)
- [Cloudinary setup](./docs/cloudinary-setup.md)
- [Evaluation dataset](./docs/evaluation-dataset.md)
- [Generation pipeline](./docs/generation-pipeline.md)
- [Scoring pipeline](./docs/scoring-pipeline.md)

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

The public `GET /api/health` route reports configuration readiness without making a rate-limited Admin API request or returning credential values.

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
