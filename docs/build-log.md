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
- `GET /api/health`: verified as an uncached dynamic route; it returned the expected HTTP 503 and a secret-free JSON body while local credentials were absent.
- Authenticated Cloudinary ping: pending a dedicated API key and secret in `.env.local`.
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
