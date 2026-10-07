# Cloudinary setup

Use one Cloudinary product environment for the demo and give every managed asset a public ID prefixed with `visual-evals/`. A public-ID path is not a claim about Media Library folder placement in dynamic-folder environments.

## Credentials

Cloudinary's Environment Config MCP manages entities such as upload presets, mappings, transformations, webhooks, and streaming profiles. It does not generate a product-environment API key and secret. Create a dedicated pair in **Cloudinary Console → Settings → API Keys** and name it `cloudinary-visual-evals-local`.

Add the values directly to the ignored `.env.local` file:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Never paste the secret into chat, screenshots, logs, source files, or a `NEXT_PUBLIC_` variable.

## Verify the connection

Restart the development server after changing `.env.local`, then run:

```bash
pnpm cloudinary:verify
```

The command performs one authenticated Admin API ping and reports only the cloud name and latency. It never prints the key or secret.

The public health route intentionally checks configuration only:

```bash
curl http://localhost:3000/api/health
```

It returns HTTP 200 when all required variables are present and HTTP 503 when setup is incomplete. It is uncached and never returns credential values or raw provider errors.

## Provision and verify reference assets

All ten references are provisioned in the current product environment and bound to dataset version `2026-10-07.2`. Revalidate them with:

```bash
pnpm cloudinary:references
```

[`provision-reference-assets.mjs`](../scripts/provision-reference-assets.mjs) renders ten fixed SVG product illustrations, uploads them as 1024 × 1024 PNG images, and gives them public IDs in this shape:

```text
visual-evals/references/<product-id>-v1
```

The references are synthetic illustrations of fictional products, not photographs, model-generated outputs, or evidence of model performance. They deliberately carry the precommitted labels `EVAL-01` through `EVAL-10`.

Uploads use `overwrite: false`. The command reads each asset back with the authenticated Cloudinary Admin API and validates the public ID, resource and delivery types, format, dimensions, and persisted contextual metadata: `dataset_id`, `dataset_version`, `reference_key`, and `expected_text`. It then downloads the PNG bytes and calculates their SHA-256 fingerprint. Cloudinary documents [contextual metadata on upload](https://cloudinary.com/documentation/image_upload_api_reference_upload) and [Admin API resource readback](https://cloudinary.com/documentation/admin_api_resources_get_details_of_a_single_resource_by_public_id).

Only after all ten references pass does the command write [`reference-assets.generated.json`](../src/data/reference-assets.generated.json). Each binding contains the immutable asset ID, public ID, version, media properties, byte count, and `contentSha256`. This fingerprint is an application-calculated content hash, not a Cloudinary ETag.

Reruns reuse matching assets and preserve the manifest timestamp when nothing changes. A missing previously bound asset, changed identity, changed version, mismatched context, or changed byte fingerprint stops provisioning. Review and version an intended replacement rather than overwriting the current benchmark reference.

The committed manifest belongs to the provisioned product environment. Do not point it at a different cloud and assume its asset IDs transfer. Provision and review a separate binding for that environment before running experiments.

These assets use public `upload` delivery so the workbench can show them without exposing server credentials. The script requests `X-Robots-Tag: noindex, nofollow`, but this is an indexing instruction, not access control. Do not use this workflow for confidential product media. Cloudinary's [Upload API](https://cloudinary.com/documentation/image_upload_api_reference_upload) documents delivery types and custom response headers.

## Image Generation access

Before running live experiments, open **Marketplace → Image Generation**, register the add-on, and confirm the quota and edit-model availability for your product environment. The current environment successfully generated baseline and candidate images with `flux-2-klein-9b-edit` in a controlled smoke test. Reference upload and Admin API readback alone do not establish Image Generation entitlement. See the [Image Generation add-on guide](https://cloudinary.com/documentation/image_generation_addon).

## Analysis access

The scoring pipeline uses the Public Beta Analyze API. Register **Cloudinary AI Vision** for general and moderation analysis, and **Cloudinary AI Content Analysis** for image-quality analysis. Confirm the quota for both add-ons before running a live smoke case. A successful credential check or reference readback confirms authentication only; it does not confirm add-on entitlement. See the [Analyze API guide](https://cloudinary.com/documentation/analyze_api_guide).

The controlled smoke test successfully called AI Vision General, AI Vision Moderation, and Image Quality Analysis for both generated images. This verifies current access to those endpoints, not scoring accuracy or availability for every future request. Enable the [local smoke workflow](./local-smoke.md) only after checking your quota.

## References

- [Cloudinary AI agent tools and MCP servers](https://cloudinary.com/documentation/cloudinary_llm_mcp)
- [Find Cloudinary credentials](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials)
- [Cloudinary Image Generation](https://cloudinary.com/documentation/image_generation_addon)
- [Cloudinary Analyze API](https://cloudinary.com/documentation/analyze_api_guide)
