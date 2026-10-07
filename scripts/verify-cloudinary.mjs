import nextEnvironment from "@next/env";
import { v2 as cloudinary } from "cloudinary";

const { loadEnvConfig } = nextEnvironment;

loadEnvConfig(process.cwd());

const credentialNames = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const placeholderPattern = /^(?:your_|replace_|change_me|changeme)/i;
const missingCredentials = credentialNames.filter(
  (credentialName) => !process.env[credentialName]?.trim(),
);
const placeholderCredentials = credentialNames.filter((credentialName) => {
  const value = process.env[credentialName]?.trim();
  return value ? placeholderPattern.test(value) : false;
});

if (missingCredentials.length > 0 || placeholderCredentials.length > 0) {
  console.error(
    `[cloudinary:verify] Configuration is incomplete: ${missingCredentials.length} missing and ${placeholderCredentials.length} unchanged placeholder value(s).`,
  );
  process.exitCode = 1;
} else {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const requestedTimeout = Number(
    process.env.CLOUDINARY_ADMIN_API_TIMEOUT_MS ?? 5_000,
  );
  const timeout =
    Number.isInteger(requestedTimeout) &&
    requestedTimeout >= 1_000 &&
    requestedTimeout <= 30_000
      ? requestedTimeout
      : 5_000;

  cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: cloudName,
    secure: true,
  });

  const startedAt = performance.now();

  try {
    const response = await cloudinary.api.ping({ timeout });

    if (response.status !== "ok") {
      throw new Error("Unexpected Cloudinary ping response.");
    }

    console.info(
      `[cloudinary:verify] Connected to ${cloudName} in ${Math.round(performance.now() - startedAt)} ms.`,
    );
  } catch (error) {
    console.error("[cloudinary:verify] Connection failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    process.exitCode = 1;
  }
}
