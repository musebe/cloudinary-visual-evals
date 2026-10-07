import { Buffer } from "node:buffer";

import { z } from "zod";

import {
  aiVisionGeneralRequestSchema,
  aiVisionGeneralResponseSchema,
  aiVisionModerationRequestSchema,
  aiVisionModerationResponseSchema,
  analyzeErrorResponseSchema,
  imageQualityRequestSchema,
  imageQualityResponseSchema,
  type AIVisionGeneralRequest,
  type AIVisionModerationRequest,
  type ImageQualityRequest,
} from "./analyze-contracts";

interface AnalyzeTransportOptions {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
  fetchImpl?: typeof fetch;
  timeoutMs: number;
}

interface AnalyzeErrorOptions {
  category?: string;
  code: string;
  endpoint: AnalyzeEndpoint;
  outcomeUnknown: boolean;
  requestId?: string;
  retryable: boolean;
  status?: number;
}

type AnalyzeEndpoint =
  | "ai_vision_general"
  | "ai_vision_moderation"
  | "image_quality";

export class CloudinaryAnalyzeError extends Error {
  readonly category?: string;
  readonly code: string;
  readonly endpoint: AnalyzeEndpoint;
  readonly outcomeUnknown: boolean;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(options: AnalyzeErrorOptions) {
    super("Cloudinary analysis could not be completed.");
    this.name = "CloudinaryAnalyzeError";
    this.category = options.category;
    this.code = options.code;
    this.endpoint = options.endpoint;
    this.outcomeUnknown = options.outcomeUnknown;
    this.requestId = options.requestId;
    this.retryable = options.retryable;
    this.status = options.status;
  }

  toJSON() {
    return {
      category: this.category,
      code: this.code,
      endpoint: this.endpoint,
      message: this.message,
      outcomeUnknown: this.outcomeUnknown,
      requestId: this.requestId,
      retryable: this.retryable,
      status: this.status,
    };
  }
}

function isRetryable(status: number, category?: string) {
  return (
    status === 429 ||
    status >= 500 ||
    category === "server_error" ||
    category === "rate_limit_error"
  );
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text();

  if (!body) return null;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function createCloudinaryAnalyzeTransport(
  options: AnalyzeTransportOptions,
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiRoot = `https://api.cloudinary.com/v2/analysis/${encodeURIComponent(options.cloudName)}/analyze`;
  const authorization = `Basic ${Buffer.from(
    `${options.apiKey}:${options.apiSecret}`,
  ).toString("base64")}`;

  async function analyze<TRequest, TResponse>(
    endpoint: AnalyzeEndpoint,
    input: TRequest,
    requestSchema: z.ZodType<TRequest>,
    responseSchema: z.ZodType<TResponse>,
  ): Promise<TResponse> {
    const request = requestSchema.parse(input);
    let response: Response;

    try {
      response = await fetchImpl(`${apiRoot}/${endpoint}`, {
        body: JSON.stringify(request),
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization,
          "content-type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch {
      throw new CloudinaryAnalyzeError({
        code: "network_or_timeout",
        endpoint,
        outcomeUnknown: true,
        retryable: false,
      });
    }

    let body: unknown;

    try {
      body = await readJson(response);
    } catch {
      throw new CloudinaryAnalyzeError({
        code: "response_read_failed",
        endpoint,
        outcomeUnknown: true,
        retryable: false,
        status: response.status,
      });
    }

    if (!response.ok) {
      const parsed = analyzeErrorResponseSchema.safeParse(body);
      const category =
        parsed.success && parsed.data.error
          ? parsed.data.error.category
          : undefined;
      const requestId = parsed.success
        ? (parsed.data.request_id ?? parsed.data.error?.request_id)
        : undefined;

      throw new CloudinaryAnalyzeError({
        category,
        code:
          (parsed.success && parsed.data.error?.code) ||
          `http_${response.status}`,
        endpoint,
        outcomeUnknown: false,
        requestId,
        retryable: isRetryable(response.status, category),
        status: response.status,
      });
    }

    if (response.status === 202) {
      throw new CloudinaryAnalyzeError({
        code: "unexpected_async_response",
        endpoint,
        outcomeUnknown: true,
        retryable: false,
        status: 202,
      });
    }

    const parsed = responseSchema.safeParse(body);

    if (!parsed.success) {
      throw new CloudinaryAnalyzeError({
        code: "invalid_response",
        endpoint,
        outcomeUnknown: false,
        retryable: false,
        status: response.status,
      });
    }

    return parsed.data;
  }

  return {
    analyzeGeneral(input: AIVisionGeneralRequest) {
      return analyze(
        "ai_vision_general",
        input,
        aiVisionGeneralRequestSchema,
        aiVisionGeneralResponseSchema,
      );
    },
    analyzeImageQuality(input: ImageQualityRequest) {
      return analyze(
        "image_quality",
        input,
        imageQualityRequestSchema,
        imageQualityResponseSchema,
      );
    },
    analyzeModeration(input: AIVisionModerationRequest) {
      return analyze(
        "ai_vision_moderation",
        input,
        aiVisionModerationRequestSchema,
        aiVisionModerationResponseSchema,
      );
    },
  };
}
