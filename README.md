# Cloudinary Visual Evals Lab

A focused Next.js workbench for comparing baseline and candidate AI-generated product images with Cloudinary-backed evidence.

The application will keep prompts, model configuration, references, managed asset identities, scores, and review decisions traceable. It is an evaluation demo, not a claim that automated scoring guarantees image correctness or safety.

## Current status

The foundation is complete. The interface shows the planned evaluation loop, while generation and scoring remain disabled until their contracts and tests are implemented.

- [Build brief](./docs/build-brief.md)
- [Build log](./docs/build-log.md)

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
