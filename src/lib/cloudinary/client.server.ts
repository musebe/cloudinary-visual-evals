import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

import { getCloudinaryEnvironment } from "@/lib/config/cloudinary-env.server";

const pingResponseSchema = z.object({
  status: z.literal("ok"),
});

export function getCloudinaryClient() {
  const environment = getCloudinaryEnvironment();

  cloudinary.config({
    api_key: environment.CLOUDINARY_API_KEY,
    api_secret: environment.CLOUDINARY_API_SECRET,
    cloud_name: environment.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    secure: true,
  });

  return cloudinary;
}

export async function verifyCloudinaryConnection() {
  const environment = getCloudinaryEnvironment();
  const startedAt = performance.now();
  const response = await getCloudinaryClient().api.ping({
    timeout: environment.CLOUDINARY_ADMIN_API_TIMEOUT_MS,
  });

  pingResponseSchema.parse(response);

  return {
    cloudName: environment.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    latencyMs: Math.round(performance.now() - startedAt),
    status: "ok" as const,
  };
}
