# Local one-case evaluation

The smoke workflow proves the complete generation, asset-readback, analysis, and decision chain for one selected case. It does not claim benchmark accuracy from one result.

## Run or inspect a comparison

1. Configure Cloudinary credentials and provision the references with `pnpm cloudinary:references`.
2. Check the Image Generation, AI Vision, and image-quality add-on access and quota in your Cloudinary environment.
3. Set `CLOUDINARY_ENABLE_LOCAL_SMOKE=true` in `.env.local` and run `pnpm dev`. The server listens on `127.0.0.1`.
4. Open `http://127.0.0.1:3000`, choose a product and prompt family, and inspect the fixed labels.
5. Select **Load last result** to restore the latest local comparison without generation or analysis charges.
6. For a new run, confirm quota usage and select **Run one-case smoke test**. Watch baseline and candidate progress, inspect the images and dimension decisions, then download the JSON evidence.

## Comparison configuration

Both variants use the pinned `flux-2-klein-9b-edit` model. Baseline uses the committed case prompt. Candidate adds an explicit, versioned suffix requesting product-identity and exact EVAL-label preservation. This tests a prompt change; it does not isolate randomness or prove a statistically significant improvement. The current model does not guarantee a reproducible seed.

One case submits two image generations and up to six Analyze API requests: general visual assessment, image quality, and safety for each variant. Actual generation credits are returned by Cloudinary and depend on the request. The verified bottle run consumed three generation credits per variant.

## Local safety and persistence

- The endpoint accepts one known case and server-owned configurations, never an arbitrary browser prompt or target.
- Explicit opt-in and `NODE_ENV=development` are required. Production calls return HTTP 403 even if the flag is set.
- Same-origin loopback checks and a custom JSON action header reject cross-origin submissions.
- A filesystem lease prevents simultaneous runs. At most three journaled attempts are allowed per UTC day.
- The selected reference is read back by immutable asset ID and checked against its version, identity, context, media properties, and SHA-256 bytes before generation.
- `.visual-evals/<experiment-id>.json` stores the plan, submitted jobs, accepted task responses, and final record. These files and `.env.local` are ignored by Git.
- A generation start is never retried automatically. An uncertain outcome retains `.visual-evals/smoke.lock` and task identifiers.
- If a tab closes, the server can continue while its process remains alive. This is not a durable background workflow. Inspect the journal and Cloudinary task before releasing an unresolved lock; do not clear it solely to resubmit.

**Load last result** reads the local journal. Managed-image readback occurred during the original run; restoring a journal is not a new Cloudinary authority check. Sensitive datasets require controlled delivery, authenticated users, shared durable storage, and stronger authorization before public deployment.

## Verified evidence

On October 8, 2026 in Nairobi (October 7 UTC), the cobalt-bottle studio case completed in 26.1 seconds from runner start to finish. Both 1024 × 1024 PNG outputs were generated, read back, and scored with all three services. Both passed the committed policy. Technical-quality scores were 87.77 for baseline and 84.51 for candidate; other required dimensions scored 100 under this heuristic policy. These scores are one smoke result, not calibrated human-quality ratings.

A subsequent local orange-carry-on multi-angle result retained a passing baseline and routed its candidate to `review` because the AI Vision structured response failed validation. Missing visual evidence remained missing and the candidate aggregate score stayed null. This demonstrates the fail-closed path; it does not establish a detector error rate.

The third local case, a cobalt-bottle label close-up, produced `fail` decisions for both variants because required identity evidence was missing; its candidate also triggered the identity-drift rule. These are automated policy findings, not independently verified human judgments. The three recorded runs exercised pass, review, and fail states, and further submissions were refused by the daily safety cap. Saved comparisons remain viewable without new paid requests.
