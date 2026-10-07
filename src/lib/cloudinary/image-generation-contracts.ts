import { createHash } from "node:crypto";

import { z } from "zod";

import type {
  EvaluationCase,
  EvaluationDataset,
} from "@/lib/evaluations/contracts";

import type { ReferenceAsset } from "./reference-manifest";

const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const publicIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^(?!\/)(?!.*\/\/)[^\s?#]+$/);

export const generationVariantSchema = z.enum(["baseline", "candidate"]);
export const imageFormatSchema = z.enum(["jpeg", "png", "webp"]);

const exactEditModelSchema = z
  .object({
    id: z.string().trim().min(1).max(120).regex(/-edit$/),
  })
  .strict();

const modelFamilySchema = z
  .object({
    family: z.enum(["flux", "recraft", "gpt-image", "nano-banana"]),
    tier: z.enum(["standard", "premium"]).optional(),
  })
  .strict();

const automaticModelSchema = z
  .object({
    mode: z.literal("auto"),
    preference: z
      .enum([
        "balanced",
        "quality",
        "economy",
        "balanced_fast",
        "quality_fast",
        "economy_fast",
      ])
      .optional(),
  })
  .strict();

export const generationModelSelectionSchema = z.union([
  exactEditModelSchema,
  modelFamilySchema,
  automaticModelSchema,
]);

export const generationConfigurationSchema = z
  .object({
    format: imageFormatSchema.default("png"),
    id: identifierSchema,
    label: z.string().trim().min(1).max(120),
    model: generationModelSelectionSchema,
    promptRevision: identifierSchema,
    promptSuffix: z.string().trim().max(2_000).default(""),
    seed: z.number().int().nonnegative().optional(),
  })
  .strict();

export const imageToImageRequestSchema = z
  .object({
    async: z.literal(true),
    format: imageFormatSchema,
    image_size: z
      .object({
        height: z.number().int().min(64).max(4096),
        width: z.number().int().min(64).max(4096),
      })
      .strict(),
    model: generationModelSelectionSchema,
    prompt: z
      .string()
      .trim()
      .min(1)
      .max(16_384)
      .refine((prompt) => prompt.includes("[1]"), {
        message: "The executed prompt must address reference image [1].",
      }),
    reference_images: z
      .array(
        z
          .object({
            asset_id: z.string().trim().min(1),
            source_type: z.literal("managed_asset"),
          })
          .strict(),
      )
      .min(1)
      .max(4),
    seed: z.number().int().nonnegative().optional(),
    target: z
      .object({
        public_id: publicIdSchema,
        target_type: z.literal("managed_asset"),
      })
      .strict(),
  })
  .strict();

const noticeSchema = z
  .object({
    severity: z.enum(["info", "warning", "blocking"]),
    text: z.string(),
  })
  .passthrough();

const addonQuotaSchema = z
  .object({
    limit: z.number().int().nullable(),
    remaining: z.number().int().nullable(),
    type: z.literal("image_generation"),
    used_by_request: z.number().int().nullable(),
  })
  .passthrough();

const limitsSchema = z
  .object({
    addons_quota: z.array(addonQuotaSchema).optional(),
  })
  .passthrough();

const resolvedModelSchema = z
  .object({
    family: z.string().min(1),
    id: z.string().min(1),
    tier: z.string().min(1),
  })
  .passthrough();

const managedAssetStorageSchema = z
  .object({
    asset_id: z.string().trim().min(1),
    public_id: publicIdSchema,
    resource_type: z.literal("image"),
    secure_url: z.url(),
    storage_type: z.literal("managed_asset"),
    type: z.string().trim().min(1),
    version: z.number().int().positive(),
  })
  .passthrough();

const completedGeneratedAssetSchema = z
  .object({
    bytes: z.number().int().nonnegative(),
    created_at: z.iso.datetime(),
    format: imageFormatSchema,
    height: z.number().int().nonnegative(),
    model: resolvedModelSchema,
    seed: z.number().int().nonnegative().nullable(),
    storage: managedAssetStorageSchema,
    width: z.number().int().nonnegative(),
  })
  .passthrough();

const generatedAssetsSchema = z
  .object({
    assets: z.array(completedGeneratedAssetSchema).length(1),
  })
  .passthrough();

const taskStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const generationTaskResponseSchema = z
  .object({
    data: z
      .object({
        limits: limitsSchema.optional(),
        result: generatedAssetsSchema.nullable().optional(),
        status: taskStatusSchema,
        task_id: z.string().regex(/^[a-f0-9]{1,256}$/),
      })
      .passthrough(),
    notices: z.array(noticeSchema).optional(),
    request_id: z.string().trim().min(1),
  })
  .passthrough();

export const generationErrorResponseSchema = z
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
      })
      .passthrough(),
    limits: limitsSchema.optional(),
    notices: z.array(noticeSchema).optional(),
    request_id: z.string().optional(),
  })
  .passthrough();

export type GenerationVariant = z.infer<typeof generationVariantSchema>;
export type GenerationConfiguration = z.infer<
  typeof generationConfigurationSchema
>;
export type GenerationModelSelection = z.infer<
  typeof generationModelSelectionSchema
>;
export type ImageToImageRequest = z.infer<typeof imageToImageRequestSchema>;
export type GenerationTaskResponse = z.infer<
  typeof generationTaskResponseSchema
>;
export type GenerationNotice = z.infer<typeof noticeSchema>;
export type GenerationQuota = z.infer<typeof addonQuotaSchema>;

export interface EvaluationGenerationJob {
  caseId: string;
  configurationId: string;
  datasetId: string;
  datasetVersion: string;
  experimentId: string;
  executedPromptHash: string;
  promptVersion: string;
  reference: ReferenceAsset;
  request: ImageToImageRequest;
  variant: GenerationVariant;
}

export interface CompletedGenerationProvenance {
  caseId: string;
  cloudinaryRequestId: string;
  cloudinaryTaskId: string;
  completedAt: string;
  configurationId: string;
  datasetId: string;
  datasetVersion: string;
  durationMs: number;
  executedPrompt: string;
  executedPromptHash: string;
  experimentId: string;
  notices: Array<z.infer<typeof noticeSchema>>;
  output: {
    assetId: string;
    bytes: number;
    createdAt: string;
    format: z.infer<typeof imageFormatSchema>;
    height: number;
    publicId: string;
    resourceType: "image";
    secureUrl: string;
    type: string;
    version: number;
    width: number;
  };
  promptVersion: string;
  quota: z.infer<typeof addonQuotaSchema> | null;
  reference: {
    assetId: string;
    contentSha256: string;
    key: string;
    publicId: string;
    version: number;
  };
  requested: {
    format: z.infer<typeof imageFormatSchema>;
    height: number;
    model: GenerationModelSelection;
    seed: number | null;
    targetPublicId: string;
    width: number;
  };
  resolved: {
    model: z.infer<typeof resolvedModelSchema>;
    seed: number | null;
  };
  schemaVersion: "1.0";
  submittedAt: string;
  variant: GenerationVariant;
}

interface CreateGenerationJobInput {
  configuration: GenerationConfiguration;
  dataset: Pick<EvaluationDataset, "id" | "version">;
  evaluationCase: EvaluationCase;
  experimentId: string;
  projectFolder: string;
  reference: ReferenceAsset;
  variant: GenerationVariant;
}

interface CompleteGenerationInput {
  completedAt: Date;
  job: EvaluationGenerationJob;
  response: GenerationTaskResponse;
  submittedAt: Date;
}

function createExecutedPrompt(
  evaluationCase: EvaluationCase,
  configuration: GenerationConfiguration,
) {
  return [evaluationCase.prompt, configuration.promptSuffix]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function createEvaluationGenerationJob(
  input: CreateGenerationJobInput,
): EvaluationGenerationJob {
  const configuration = generationConfigurationSchema.parse(
    input.configuration,
  );
  const variant = generationVariantSchema.parse(input.variant);
  const experimentId = identifierSchema.parse(input.experimentId);
  const projectFolder = input.projectFolder
    .split("/")
    .map((segment) => identifierSchema.parse(segment))
    .join("/");

  if (input.evaluationCase.referenceAssetKey !== input.reference.key) {
    throw new Error("The evaluation case and reference asset do not match.");
  }

  const executedPrompt = createExecutedPrompt(
    input.evaluationCase,
    configuration,
  );
  const targetPublicId = [
    projectFolder,
    experimentId,
    input.evaluationCase.id,
    variant,
  ].join("/");

  const request = imageToImageRequestSchema.parse({
    async: true,
    format: configuration.format,
    image_size: input.evaluationCase.output,
    model: configuration.model,
    prompt: executedPrompt,
    reference_images: [
      {
        asset_id: input.reference.assetId,
        source_type: "managed_asset",
      },
    ],
    seed: configuration.seed,
    target: {
      public_id: targetPublicId,
      target_type: "managed_asset",
    },
  });

  return {
    caseId: input.evaluationCase.id,
    configurationId: configuration.id,
    datasetId: input.dataset.id,
    datasetVersion: input.dataset.version,
    experimentId,
    executedPromptHash: createHash("sha256")
      .update(executedPrompt)
      .digest("hex"),
    promptVersion: `${input.evaluationCase.promptVersion}:${configuration.promptRevision}`,
    reference: input.reference,
    request,
    variant,
  };
}

export function completeGenerationProvenance(
  input: CompleteGenerationInput,
): CompletedGenerationProvenance {
  const response = generationTaskResponseSchema.parse(input.response);

  if (response.data.status !== "completed" || !response.data.result) {
    throw new Error("Cloudinary generation is not complete.");
  }

  const [asset] = response.data.result.assets;
  const quota =
    response.data.limits?.addons_quota?.find(
      (candidate) => candidate.type === "image_generation",
    ) ?? null;

  if (asset.storage.public_id !== input.job.request.target.public_id) {
    throw new Error("Cloudinary returned an unexpected managed asset.");
  }

  return {
    caseId: input.job.caseId,
    cloudinaryRequestId: response.request_id,
    cloudinaryTaskId: response.data.task_id,
    completedAt: input.completedAt.toISOString(),
    configurationId: input.job.configurationId,
    datasetId: input.job.datasetId,
    datasetVersion: input.job.datasetVersion,
    durationMs: Math.max(
      0,
      input.completedAt.getTime() - input.submittedAt.getTime(),
    ),
    executedPrompt: input.job.request.prompt,
    executedPromptHash: input.job.executedPromptHash,
    experimentId: input.job.experimentId,
    notices: response.notices ?? [],
    output: {
      assetId: asset.storage.asset_id,
      bytes: asset.bytes,
      createdAt: asset.created_at,
      format: asset.format,
      height: asset.height,
      publicId: asset.storage.public_id,
      resourceType: asset.storage.resource_type,
      secureUrl: asset.storage.secure_url,
      type: asset.storage.type,
      version: asset.storage.version,
      width: asset.width,
    },
    promptVersion: input.job.promptVersion,
    quota,
    reference: {
      assetId: input.job.reference.assetId,
      contentSha256: input.job.reference.contentSha256,
      key: input.job.reference.key,
      publicId: input.job.reference.publicId,
      version: input.job.reference.version,
    },
    requested: {
      format: input.job.request.format,
      height: input.job.request.image_size.height,
      model: input.job.request.model,
      seed: input.job.request.seed ?? null,
      targetPublicId: input.job.request.target.public_id,
      width: input.job.request.image_size.width,
    },
    resolved: {
      model: asset.model,
      seed: asset.seed,
    },
    schemaVersion: "1.0",
    submittedAt: input.submittedAt.toISOString(),
    variant: input.job.variant,
  };
}
