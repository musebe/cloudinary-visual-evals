# Cloudinary setup

Use one Cloudinary product environment for the demo and keep every managed asset under `visual-evals/`.

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

## Image Generation access

Before implementing live experiments, open **Marketplace → Image Generation**, register the add-on, and confirm the quota for this product environment. Model availability and quota are verified again when the generation checkpoint is implemented.

## References

- [Cloudinary AI agent tools and MCP servers](https://cloudinary.com/documentation/cloudinary_llm_mcp)
- [Find Cloudinary credentials](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials)
- [Cloudinary Image Generation](https://cloudinary.com/documentation/image_generation_addon)
