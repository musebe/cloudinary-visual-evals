import { z } from "zod";

const PLACEHOLDER_PATTERN = /^(?:your_|replace_|change_me|changeme)/i;

const credentialSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !PLACEHOLDER_PATTERN.test(value), {
    message: "Replace the placeholder with a real credential.",
  });

export const cloudinaryEnvironmentSchema = z.object({
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: credentialSchema,
  CLOUDINARY_API_KEY: credentialSchema,
  CLOUDINARY_API_SECRET: credentialSchema,
  CLOUDINARY_PROJECT_FOLDER: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/)
    .default("visual-evals"),
  CLOUDINARY_ADMIN_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(30_000)
    .default(5_000),
  CLOUDINARY_IMAGE_GENERATION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(5_000)
    .max(120_000)
    .default(60_000),
  CLOUDINARY_ANALYZE_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(5_000)
    .max(60_000)
    .default(30_000),
});

export type CloudinaryEnvironment = z.infer<
  typeof cloudinaryEnvironmentSchema
>;

export const requiredCloudinaryVariables = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

type RequiredCloudinaryVariable = (typeof requiredCloudinaryVariables)[number];

export interface CloudinaryEnvironmentInspection {
  configured: boolean;
  invalid: string[];
  missing: RequiredCloudinaryVariable[];
}

export function parseCloudinaryEnvironment(
  source: Record<string, string | undefined>,
): CloudinaryEnvironment {
  return cloudinaryEnvironmentSchema.parse(source);
}

export function inspectCloudinaryEnvironment(
  source: Record<string, string | undefined>,
): CloudinaryEnvironmentInspection {
  const missing = requiredCloudinaryVariables.filter(
    (variable) => !source[variable]?.trim(),
  );
  const parsed = cloudinaryEnvironmentSchema.safeParse(source);

  if (parsed.success) {
    return { configured: true, invalid: [], missing: [] };
  }

  const invalid = [
    ...new Set(
      parsed.error.issues
        .map((issue) => issue.path[0])
        .filter(
          (path): path is string =>
            typeof path === "string" &&
            !missing.includes(path as RequiredCloudinaryVariable),
        ),
    ),
  ];

  return { configured: false, invalid, missing };
}
