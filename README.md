# Visual Evals Lab

Compare product-image prompts before changing your generation pipeline. The app puts baseline and candidate images side by side, with separate checks for product details, readable text, image quality, and safety.

[Live demo](https://cloudinary-visual-evals.vercel.app/) · [Source](https://github.com/musebe/cloudinary-visual-evals)

## Try it

Open the demo and select **View demo comparison**. You can inspect both images, read the scoring decisions, and download the result as JSON.

The public site shows a recorded Cloudinary experiment. It verifies the managed assets before serving the comparison, with a short cache to limit Admin API requests. It does not generate new images or run paid analysis. The dataset inspector lets you explore 50 labeled cases across ten fictional products; changing those selections does not change the recorded sample.

## How it works

Cloudinary generates both variants from the same reference image. The baseline uses the saved case prompt; the candidate adds instructions to preserve the product identity and its exact text label. Both use `flux-2-klein-9b-edit`.

The server reads each generated asset back through Cloudinary's Admin API, then requests visual, quality, and moderation analysis. Application rules turn that evidence into five dimension scores and a **pass**, **review**, or **fail** decision. Missing evidence goes to review rather than being counted as a pass.

Each result keeps its dataset version, prompt, model, reference, asset ID, and policy version. Image previews use `next-cloudinary`; scoring uses the original managed asset.

## Run locally

You need Node.js 24 or later, pnpm, and a Cloudinary account with access to Image Generation, AI Vision, and Image Quality Analysis.

```bash
git clone https://github.com/musebe/cloudinary-visual-evals.git
cd cloudinary-visual-evals
pnpm install
cp .env.example .env.local
```

Add your credentials to `.env.local`:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Keep the API key and secret server-only. Do not commit `.env.local`.

```bash
pnpm cloudinary:verify
pnpm dev
```

Open [127.0.0.1:3000](http://127.0.0.1:3000). The health endpoint at `/api/health` reports configuration status without returning credentials.

The checked-in asset bindings and recorded comparison belong to the hosted demo's Cloudinary environment. Asset IDs do not transfer between accounts. If you use another environment, prepare its own reference bindings and recorded comparison. The [Cloudinary setup guide](./docs/cloudinary-setup.md) explains the reference checks and required add-ons; `pnpm cloudinary:references` provisions or verifies the reference set without overwriting existing assets.

## Run a new comparison

After configuring your reference assets and checking your add-on quota, add this flag to `.env.local` and restart the server:

```dotenv
CLOUDINARY_ENABLE_LOCAL_SMOKE=true
```

Choose a product and prompt family, confirm quota usage, then select **Run one-case smoke test**. One comparison uses two generation requests and up to six analysis calls. Cloudinary credits vary by request; a request is not necessarily one credit.

Runs are limited to three attempts per UTC day, with one active run at a time. **Load last result** restores the latest local record without generating again. Results are saved in the ignored `.visual-evals/` directory.

If a submitted job has an uncertain outcome, its lock remains in place. Inspect the saved task IDs before retrying; refreshing the browser does not cancel a Cloudinary job. See [local comparisons](./docs/local-smoke.md) for recovery details. Paid execution is disabled in production, regardless of the flag.

## Development

Built with Next.js 16.4, React 19.3, TypeScript, Tailwind CSS 4, shadcn, Zod, and Vitest.

```bash
pnpm check
```

This runs lint, TypeScript checks, tests, and the production build. Individual commands are `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

The reference images are synthetic illustrations, not product photographs. Scores are automated policy signals, not human approval. The full 50-case benchmark and interactive human-review workflow are not complete, and the recorded sample is not a general accuracy claim.

Further reading: [dataset](./docs/evaluation-dataset.md), [generation](./docs/generation-pipeline.md), [scoring](./docs/scoring-pipeline.md), and [runner](./docs/experiment-runner.md).
