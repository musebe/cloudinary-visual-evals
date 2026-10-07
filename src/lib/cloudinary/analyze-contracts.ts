import { z } from "zod";

const sourceSchema = z.union([
  z
    .object({
      asset_id: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      uri: z
        .url()
        .refine((value) => new URL(value).protocol === "https:", {
          message: "Analysis source URLs must use HTTPS.",
        }),
    })
    .strict(),
]);

export const aiVisionGeneralRequestSchema = z
  .object({
    async: z.literal(false),
    prompts: z.array(z.string().trim().min(1).max(16_384)).length(1),
    source: sourceSchema,
  })
  .strict();

export const aiVisionModerationRequestSchema = z
  .object({
    async: z.literal(false),
    rejection_questions: z
      .array(z.string().trim().min(1).max(1_000))
      .min(1)
      .max(10),
    source: sourceSchema,
  })
  .strict();

export const imageQualityRequestSchema = z
  .object({
    async: z.literal(false),
    source: sourceSchema,
  })
  .strict();

const quotaItemSchema = z
  .object({
    limit: z.number().int().nullable().optional(),
    remaining: z.number().int().nullable().optional(),
    reset_time: z.iso.datetime().nullable().optional(),
    type: z.string().trim().min(1),
    used_by_request: z.number().int().nullable().optional(),
  })
  .passthrough();

const limitsSchema = z
  .object({
    addons_quota: z.array(quotaItemSchema).optional(),
    items: z.array(quotaItemSchema).optional(),
  })
  .passthrough();

const responseBaseSchema = z.object({
  limits: limitsSchema.nullable().optional(),
  request_id: z.string().trim().min(1),
});

export const aiVisionGeneralResponseSchema = responseBaseSchema
  .extend({
    data: z
      .object({
        analysis: z
          .object({
            model_version: z.number().int().nonnegative(),
            responses: z
              .array(
                z
                  .object({
                    value: z.string().trim().min(1),
                  })
                  .passthrough(),
              )
              .length(1),
          })
          .passthrough(),
        entity: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const aiVisionModerationResponseSchema = responseBaseSchema
  .extend({
    data: z
      .object({
        analysis: z
          .object({
            model_version: z.number().int().nonnegative(),
            responses: z.array(
              z
                .object({
                  prompt: z.string().trim().min(1),
                  value: z.enum(["yes", "no", "unknown"]),
                })
                .passthrough(),
            ).min(1).max(10),
          })
          .passthrough(),
        entity: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const imageQualityResponseSchema = responseBaseSchema
  .extend({
    data: z
      .object({
        analysis: z
          .object({
            confidence: z.number().min(0).max(1),
            model_version: z.number().int().nonnegative(),
            quality: z.string().trim().min(1),
            score: z.number().min(0).max(1),
          })
          .passthrough(),
        entity: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const analyzeErrorResponseSchema = z
  .object({
    error: z
      .object({
        category: z
          .enum([
            "user_error",
            "auth_error",
            "server_error",
            "rate_limit_error",
          ])
          .optional(),
        code: z.string().optional(),
        message: z.string().optional(),
        request_id: z.string().optional(),
      })
      .nullable(),
    request_id: z.string().optional(),
  })
  .passthrough();

export type AIVisionGeneralRequest = z.infer<
  typeof aiVisionGeneralRequestSchema
>;
export type AIVisionModerationRequest = z.infer<
  typeof aiVisionModerationRequestSchema
>;
export type ImageQualityRequest = z.infer<typeof imageQualityRequestSchema>;
export type AIVisionGeneralResponse = z.infer<
  typeof aiVisionGeneralResponseSchema
>;
export type AIVisionModerationResponse = z.infer<
  typeof aiVisionModerationResponseSchema
>;
export type ImageQualityResponse = z.infer<
  typeof imageQualityResponseSchema
>;
export type AnalyzeQuotaItem = z.infer<typeof quotaItemSchema>;

type ResponseWithLimits = {
  limits?: z.infer<typeof limitsSchema> | null;
};

export function getAnalyzeQuota(response: ResponseWithLimits) {
  return response.limits?.items ?? response.limits?.addons_quota ?? [];
}
