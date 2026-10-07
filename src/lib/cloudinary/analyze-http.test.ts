import { describe, expect, it } from "vitest";

import {
  CloudinaryAnalyzeError,
  createCloudinaryAnalyzeTransport,
} from "./analyze-http";

const apiKey = "123456789012345";
const apiSecret = "secret-that-must-never-be-serialized";
const source = {
  uri: "https://res.cloudinary.com/demo/image/upload/v1800000001/visual-evals/output.png",
};

describe("Cloudinary Analyze transport", () => {
  it("sends a synchronous, server-authenticated request without caching", async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;

      return new Response(
        JSON.stringify({
          data: {
            analysis: {
              model_version: 1,
              responses: [{ value: "{}" }],
            },
            entity: source.uri,
          },
          request_id: "analysis-request-1",
        }),
        { status: 200 },
      );
    };
    const transport = createCloudinaryAnalyzeTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    const response = await transport.analyzeGeneral({
      async: false,
      prompts: ["Inspect the image."],
      source,
    });
    const headers = new Headers(requestInit?.headers);

    expect(requestUrl).toBe(
      "https://api.cloudinary.com/v2/analysis/visual-evals-demo/analyze/ai_vision_general",
    );
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.cache).toBe("no-store");
    expect(headers.get("authorization")).toMatch(/^Basic /);
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      async: false,
      prompts: ["Inspect the image."],
      source,
    });
    expect(response.request_id).toBe("analysis-request-1");
  });

  it("preserves structured retry metadata without exposing raw errors", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            category: "rate_limit_error",
            code: "ANALYZE_00429",
            message: `Never echo ${apiSecret}`,
            request_id: "analysis-rate-limited",
          },
        }),
        { status: 429 },
      );
    const transport = createCloudinaryAnalyzeTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    try {
      await transport.analyzeImageQuality({ async: false, source });
      throw new Error("Expected analysis to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(CloudinaryAnalyzeError);
      expect(error).toMatchObject({
        code: "ANALYZE_00429",
        endpoint: "image_quality",
        requestId: "analysis-rate-limited",
        retryable: true,
        status: 429,
      });
      expect(JSON.stringify(error)).not.toContain(apiSecret);
      expect(JSON.stringify(error)).not.toContain("Never echo");
    }
  });

  it("marks network or timeout outcomes as unknown and non-retryable", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("Network failed");
    };
    const transport = createCloudinaryAnalyzeTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    await expect(
      transport.analyzeImageQuality({ async: false, source }),
    ).rejects.toMatchObject({
      code: "network_or_timeout",
      outcomeUnknown: true,
      retryable: false,
    });
  });

  it("rejects an unexpected async or malformed success response", async () => {
    const asyncTransport = createCloudinaryAnalyzeTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl: async () => new Response("{}", { status: 202 }),
      timeoutMs: 10_000,
    });
    const malformedTransport = createCloudinaryAnalyzeTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl: async () => new Response("not json", { status: 200 }),
      timeoutMs: 10_000,
    });

    await expect(
      asyncTransport.analyzeImageQuality({ async: false, source }),
    ).rejects.toMatchObject({ code: "unexpected_async_response" });
    await expect(
      malformedTransport.analyzeImageQuality({ async: false, source }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("normalizes a response-body read failure", async () => {
    const fetchImpl: typeof fetch = async () => {
      const response = new Response(null, { status: 200 });
      Object.defineProperty(response, "text", {
        value: async () => {
          throw new Error("Body stream failed");
        },
      });
      return response;
    };
    const transport = createCloudinaryAnalyzeTransport({
      apiKey,
      apiSecret,
      cloudName: "visual-evals-demo",
      fetchImpl,
      timeoutMs: 10_000,
    });

    await expect(
      transport.analyzeImageQuality({ async: false, source }),
    ).rejects.toMatchObject({
      code: "response_read_failed",
      outcomeUnknown: true,
      retryable: false,
      status: 200,
    });
  });
});
