import { describe, expect, it } from "vitest";

import { productImagesV1 } from "@/data/product-images-v1";

import {
  createEvaluationGenerationJob,
  type GenerationConfiguration,
} from "./image-generation-contracts";
import {
  CloudinaryGenerationError,
  createCloudinaryGenerationTransport,
} from "./image-generation-http";
import type { ReferenceAsset } from "./reference-manifest";

const apiKey = "123456789012345";
const apiSecret = "secret-that-must-never-be-serialized";
const evaluationCase = productImagesV1.cases[0];
const reference: ReferenceAsset = {
  assetId: "0123456789abcdef0123456789abcdef",
  bytes: 250_000,
  etag: "abcdef0123456789abcdef0123456789",
  format: "png",
  height: 1024,
  key: evaluationCase.referenceAssetKey,
  publicId: "visual-evals/references/cobalt-trail-bottle-v1",
  resourceType: "image",
  type: "upload",
  version: 1_800_000_000,
  width: 1024,
};
const configuration: GenerationConfiguration = {
  format: "png",
  id: "baseline-v1",
  label: "Baseline",
  model: { id: "nano-banana-1-edit" },
  promptRevision: "prompt-v1",
  promptSuffix: "",
  seed: 42,
};
const job = createEvaluationGenerationJob({
  configuration,
  dataset: productImagesV1,
  evaluationCase,
  experimentId: "smoke-run-2026-10-07",
  projectFolder: "visual-evals",
  reference,
  variant: "baseline",
});

function acceptedResponse() {
  return new Response(
    JSON.stringify({
      data: {
        status: "pending",
        task_id: "abc123",
      },
      request_id: "request-123",
    }),
    { status: 202 },
  );
}

describe("Cloudinary image generation transport", () => {
  it("sends one asynchronous server request with Basic auth and no caching", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return acceptedResponse();
    };
    const transport = createCloudinaryGenerationTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    const response = await transport.start(job);
    const headers = new Headers(requestInit?.headers);

    expect(requestUrl).toBe(
      "https://api.cloudinary.com/v2/generate/visual-evals-demo/image_to_image",
    );
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.cache).toBe("no-store");
    expect(headers.get("authorization")).toMatch(/^Basic /);
    expect(JSON.parse(String(requestInit?.body))).toEqual(job.request);
    expect(response.data.task_id).toBe("abc123");
  });

  it("keeps structured rate-limit data while removing the raw response", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            category: "rate_limit_error",
            code: "MG_00429",
            message: `Never echo ${apiSecret}`,
          },
          limits: {
            addons_quota: [
              {
                limit: 50,
                remaining: 0,
                type: "image_generation",
                used_by_request: 1,
              },
            ],
          },
          request_id: "request-rate-limited",
        }),
        { status: 429 },
      );
    const transport = createCloudinaryGenerationTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    try {
      await transport.start(job);
      throw new Error("Expected the transport to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(CloudinaryGenerationError);
      const serialized = JSON.stringify(error);

      expect(serialized).not.toContain(apiSecret);
      expect(serialized).not.toContain("Never echo");
      expect(serialized).toContain("MG_00429");
      expect(serialized).toContain('"remaining":0');
    }
  });

  it("marks a timed-out POST as unknown instead of retrying it blindly", async () => {
    const fetchImpl: typeof fetch = async () => {
      const error = new Error("Timed out");
      error.name = "TimeoutError";
      throw error;
    };
    const transport = createCloudinaryGenerationTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    await expect(transport.start(job)).rejects.toMatchObject({
      code: "request_timeout",
      operation: "start",
      outcomeUnknown: true,
      retryable: false,
    });
  });

  it("allows a transient task poll to be retried safely", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("Temporary network failure");
    };
    const transport = createCloudinaryGenerationTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    await expect(transport.getTask("abc123")).rejects.toMatchObject({
      operation: "poll",
      outcomeUnknown: false,
      retryable: true,
    });
  });

  it("sanitizes a non-JSON success response", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(`unexpected ${apiSecret}`, { status: 202 });
    const transport = createCloudinaryGenerationTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    await expect(transport.start(job)).rejects.toMatchObject({
      code: "invalid_response",
    });

    try {
      await transport.start(job);
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain(apiSecret);
    }
  });
});
