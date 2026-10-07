import "server-only";

import { getCloudinaryEnvironment } from "@/lib/config/cloudinary-env.server";

import type { EvaluationGenerationJob } from "./image-generation-contracts";
import { createCloudinaryGenerationTransport } from "./image-generation-http";

function getGenerationTransport() {
  const environment = getCloudinaryEnvironment();

  return createCloudinaryGenerationTransport({
    apiKey: environment.CLOUDINARY_API_KEY,
    apiSecret: environment.CLOUDINARY_API_SECRET,
    cloudName: environment.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    timeoutMs: environment.CLOUDINARY_IMAGE_GENERATION_TIMEOUT_MS,
  });
}

export async function startEvaluationGeneration(
  job: EvaluationGenerationJob,
) {
  return getGenerationTransport().start(job);
}

export async function getEvaluationGenerationTask(taskId: string) {
  return getGenerationTransport().getTask(taskId);
}
