import "server-only";

import {
  getEvaluationGenerationTask,
  startEvaluationGeneration,
} from "@/lib/cloudinary/image-generation.server";
import { readManagedGenerationAsset } from "@/lib/cloudinary/managed-generation-readback.server";
import { scoreManagedEvaluationCase } from "@/lib/cloudinary/analyze.server";
import { getCloudinaryEnvironment } from "@/lib/config/cloudinary-env.server";
import { productImagesV1 } from "@/data/product-images-v1";
import { referenceAssets } from "@/data/reference-assets";
import { verifyExperimentReferences } from "@/lib/cloudinary/reference-readback.server";
import type { EvaluationGenerationJob, GenerationTaskResponse } from "@/lib/cloudinary/image-generation-contracts";

import type {
  ExperimentPlan,
  ExperimentProgressEvent,
} from "./experiment-contracts";
import { runExperiment } from "./experiment-runner";

export async function runManagedExperiment(input: {
  onProgress?: (
    event: ExperimentProgressEvent,
  ) => Promise<void> | void;
  plan: ExperimentPlan;
  onSubmission?: (job: EvaluationGenerationJob, response: GenerationTaskResponse | null) => Promise<void>;
}) {
  const environment = getCloudinaryEnvironment();
  await verifyExperimentReferences(input.plan.caseIds);

  return runExperiment({
    dataset: productImagesV1,
    dependencies: {
      getGenerationTask: getEvaluationGenerationTask,
      now: () => new Date(),
      readManagedAsset: readManagedGenerationAsset,
      scoreCase: scoreManagedEvaluationCase,
      sleep: (delayMs) =>
        new Promise((resolve) => setTimeout(resolve, delayMs)),
      startGeneration: async (job) => {
        await input.onSubmission?.(job, null);
        const response = await startEvaluationGeneration(job);
        await input.onSubmission?.(job, response);
        return response;
      },
    },
    onProgress: input.onProgress,
    plan: input.plan,
    projectFolder: environment.CLOUDINARY_PROJECT_FOLDER,
    references: referenceAssets,
  });
}
