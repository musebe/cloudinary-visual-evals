import { Buffer } from "node:buffer";

import {
  generationErrorResponseSchema,
  generationTaskResponseSchema,
  type EvaluationGenerationJob,
  type GenerationQuota,
  type GenerationTaskResponse,
} from "./image-generation-contracts";

type GenerationOperation = "poll" | "start";

interface GenerationTransportOptions {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
  fetchImpl?: typeof fetch;
  timeoutMs: number;
}

interface GenerationErrorOptions {
  category?: string;
  code: string;
  operation: GenerationOperation;
  outcomeUnknown: boolean;
  quota?: GenerationQuota | null;
  requestId?: string;
  retryable: boolean;
  status?: number;
}

export class CloudinaryGenerationError extends Error {
  readonly category?: string;
  readonly code: string;
  readonly operation: GenerationOperation;
  readonly outcomeUnknown: boolean;
  readonly quota: GenerationQuota | null;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(options: GenerationErrorOptions) {
    super("Cloudinary image generation could not be completed.");
    this.name = "CloudinaryGenerationError";
    this.category = options.category;
    this.code = options.code;
    this.operation = options.operation;
    this.outcomeUnknown = options.outcomeUnknown;
    this.quota = options.quota ?? null;
    this.requestId = options.requestId;
    this.retryable = options.retryable;
    this.status = options.status;
  }

  toJSON() {
    return {
      category: this.category,
      code: this.code,
      message: this.message,
      operation: this.operation,
      outcomeUnknown: this.outcomeUnknown,
      quota: this.quota,
      requestId: this.requestId,
      retryable: this.retryable,
      status: this.status,
    };
  }
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function isRetryableResponse(status: number, category?: string) {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
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

function quotaFromErrorResponse(
  parsed: ReturnType<typeof generationErrorResponseSchema.safeParse>,
) {
  if (!parsed.success) return null;

  return (
    parsed.data.limits?.addons_quota?.find(
      (quota) => quota.type === "image_generation",
    ) ?? null
  );
}

export function createCloudinaryGenerationTransport(
  options: GenerationTransportOptions,
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiRoot = `https://api.cloudinary.com/v2/generate/${encodeURIComponent(options.cloudName)}`;
  const authorization = `Basic ${Buffer.from(
    `${options.apiKey}:${options.apiSecret}`,
  ).toString("base64")}`;

  async function request(
    path: string,
    operation: GenerationOperation,
    init: Pick<RequestInit, "body" | "method">,
  ): Promise<GenerationTaskResponse> {
    let response: Response;

    try {
      response = await fetchImpl(`${apiRoot}${path}`, {
        ...init,
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization,
          ...(init.body ? { "content-type": "application/json" } : {}),
        },
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      throw new CloudinaryGenerationError({
        code: isTimeoutError(error) ? "request_timeout" : "network_error",
        operation,
        outcomeUnknown: operation === "start",
        retryable: operation === "poll",
      });
    }

    let body: unknown;
    try {
      body = await readJson(response);
    } catch {
      throw new CloudinaryGenerationError({
        code: "response_stream_error",
        operation,
        outcomeUnknown: operation === "start",
        retryable: operation === "poll",
        status: response.status,
      });
    }

    if (!response.ok) {
      const parsed = generationErrorResponseSchema.safeParse(body);
      const category = parsed.success ? parsed.data.error.category : undefined;

      throw new CloudinaryGenerationError({
        category,
        code:
          (parsed.success && parsed.data.error.code) ||
          `http_${response.status}`,
        operation,
        outcomeUnknown: false,
        quota: quotaFromErrorResponse(parsed),
        requestId: parsed.success ? parsed.data.request_id : undefined,
        retryable: isRetryableResponse(response.status, category),
        status: response.status,
      });
    }

    const parsed = generationTaskResponseSchema.safeParse(body);

    if (!parsed.success) {
      throw new CloudinaryGenerationError({
        code: "invalid_response",
        operation,
        outcomeUnknown: operation === "start",
        retryable: operation === "poll",
        status: response.status,
      });
    }

    return parsed.data;
  }

  return {
    getTask(taskId: string) {
      if (!/^[a-f0-9]{1,256}$/.test(taskId)) {
        throw new CloudinaryGenerationError({
          code: "invalid_task_id",
          operation: "poll",
          outcomeUnknown: false,
          retryable: false,
        });
      }

      return request(`/tasks/${taskId}`, "poll", { method: "GET" });
    },
    start(job: EvaluationGenerationJob) {
      return request("/image_to_image", "start", {
        body: JSON.stringify(job.request),
        method: "POST",
      });
    },
  };
}
