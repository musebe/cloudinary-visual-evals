import { z } from "zod";

const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const scoreDimensions = [
  "prompt_adherence",
  "reference_fidelity",
  "text_integrity",
  "technical_quality",
  "safety",
] as const;

export const promptFamilyIds = [
  "studio_packshot",
  "lifestyle_scene",
  "label_closeup",
  "multi_angle_layout",
  "campaign_banner",
] as const;

export const scoreDimensionSchema = z.enum(scoreDimensions);
export const promptFamilySchema = z.enum(promptFamilyIds);

export type ScoreDimension = z.infer<typeof scoreDimensionSchema>;
export type PromptFamily = z.infer<typeof promptFamilySchema>;

export const scoreThresholdSchema = z
  .object({
    failBelow: z.number().min(0).max(100),
    passAtOrAbove: z.number().min(0).max(100),
  })
  .strict()
  .refine(
    (threshold) => threshold.passAtOrAbove > threshold.failBelow,
    { message: "The pass threshold must be greater than the fail threshold." },
  );

export const scoreThresholdsSchema = z.record(
  scoreDimensionSchema,
  scoreThresholdSchema,
);

export const productDefinitionSchema = z
  .object({
    expectedText: z.string().trim().min(1).max(40),
    forbiddenAttributes: z.array(z.string().trim().min(1)).min(1),
    id: identifierSchema,
    lifestyleSetting: z.string().trim().min(1).max(240),
    name: z.string().trim().min(1).max(120),
    referenceAssetKey: identifierSchema,
    requiredAttributes: z.array(z.string().trim().min(1)).min(3),
  })
  .strict();

export const evaluationCaseSchema = z
  .object({
    expected: z
      .object({
        exactText: z.array(z.string().trim().min(1)).min(1),
        forbidAdditionalText: z.boolean(),
        forbiddenAttributes: z.array(z.string().trim().min(1)).min(1),
        requiredAttributes: z.array(z.string().trim().min(1)).min(3),
      })
      .strict(),
    id: identifierSchema,
    output: z
      .object({
        height: z.number().int().min(256).max(4096),
        width: z.number().int().min(256).max(4096),
      })
      .strict(),
    productId: identifierSchema,
    prompt: z.string().trim().min(40).max(2_000),
    promptFamily: promptFamilySchema,
    promptVersion: identifierSchema,
    referenceAssetKey: identifierSchema,
    requiredDimensions: z
      .array(scoreDimensionSchema)
      .min(1)
      .refine((dimensions) => new Set(dimensions).size === dimensions.length, {
        message: "Required dimensions must be unique.",
      }),
  })
  .strict();

export const evaluationDatasetSchema = z
  .object({
    cases: z.array(evaluationCaseSchema).min(1),
    createdAt: z.iso.datetime(),
    description: z.string().trim().min(1).max(500),
    id: identifierSchema,
    labelProtocol: z.literal("human-authored-before-generation"),
    name: z.string().trim().min(1).max(160),
    policyVersion: identifierSchema,
    products: z.array(productDefinitionSchema).min(1),
    schemaVersion: z.literal("1.0"),
    status: z.literal("draft"),
    thresholds: scoreThresholdsSchema,
    version: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
  })
  .strict()
  .superRefine((dataset, context) => {
    const productIds = new Set<string>();
    const referenceKeysByProduct = new Map<string, string>();

    for (const [index, product] of dataset.products.entries()) {
      if (productIds.has(product.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate product ID: ${product.id}`,
          path: ["products", index, "id"],
        });
      }

      productIds.add(product.id);
      referenceKeysByProduct.set(product.id, product.referenceAssetKey);
    }

    const caseIds = new Set<string>();
    const productFamilyPairs = new Set<string>();

    for (const [index, evaluationCase] of dataset.cases.entries()) {
      if (caseIds.has(evaluationCase.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate case ID: ${evaluationCase.id}`,
          path: ["cases", index, "id"],
        });
      }

      caseIds.add(evaluationCase.id);

      if (!productIds.has(evaluationCase.productId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown product ID: ${evaluationCase.productId}`,
          path: ["cases", index, "productId"],
        });
      }

      if (
        referenceKeysByProduct.get(evaluationCase.productId) !==
        evaluationCase.referenceAssetKey
      ) {
        context.addIssue({
          code: "custom",
          message: "The case reference key must match its product.",
          path: ["cases", index, "referenceAssetKey"],
        });
      }

      const pair = `${evaluationCase.productId}:${evaluationCase.promptFamily}`;
      if (productFamilyPairs.has(pair)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate product and prompt-family pair: ${pair}`,
          path: ["cases", index, "promptFamily"],
        });
      }
      productFamilyPairs.add(pair);
    }
  });

export type EvaluationDataset = z.infer<typeof evaluationDatasetSchema>;
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export type ProductDefinition = z.infer<typeof productDefinitionSchema>;

export function defineEvaluationDataset(input: unknown): EvaluationDataset {
  return evaluationDatasetSchema.parse(input);
}
