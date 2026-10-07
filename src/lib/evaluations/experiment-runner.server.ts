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

import type {
  ExperimentPlan,
  ExperimentProgressEvent,
} from "./experiment-contracts";
import { runExperiment } from "./experiment-runner";

export function runManagedExperiment(input: {
  onProgress?: (
    event: ExperimentProgressEvent,
  ) => Promise<void> | void;
  plan: ExperimentPlan;
}) {
  const environment = getCloudinaryEnvironment();

  return runExperiment({
    dataset: productImagesV1,
    dependencies: {
      getGenerationTask: getEvaluationGenerationTask,
      now: () => new Date(),
      readManagedAsset: readManagedGenerationAsset,
      scoreCase: scoreManagedEvaluationCase,
      sleep: (delayMs) =>
        new Promise((resolve) => setTimeout(resolve, delayMs)),
      startGeneration: startEvaluationGeneration,
    },
    onProgress: input.onProgress,
    plan: input.plan,
    projectFolder: environment.CLOUDINARY_PROJECT_FOLDER,
    references: referenceAssets,
  });
}
