import type { ReferenceManifest } from "@/lib/cloudinary/reference-manifest";

import type {
  EvaluationDataset,
  PromptFamily,
  ScoreDimension,
} from "./contracts";

const promptFamilyLabels = {
  studio_packshot: "Studio packshot",
  lifestyle_scene: "Lifestyle scene",
  label_closeup: "Label close-up",
  multi_angle_layout: "Multi-angle layout",
  campaign_banner: "Campaign banner",
} satisfies Record<PromptFamily, string>;

const scoreDimensionLabels = {
  prompt_adherence: "Prompt adherence",
  reference_fidelity: "Reference fidelity",
  text_integrity: "Text integrity",
  technical_quality: "Technical quality",
  safety: "Safety",
} satisfies Record<ScoreDimension, string>;

export interface WorkbenchThreshold {
  dimension: ScoreDimension;
  failBelow: number;
  label: string;
  passAtOrAbove: number;
}

export interface WorkbenchCase {
  expectedText: string[];
  forbidAdditionalText: boolean;
  forbiddenAttributes: string[];
  id: string;
  output: { height: number; width: number };
  productId: string;
  productName: string;
  prompt: string;
  promptFamily: PromptFamily;
  promptFamilyLabel: string;
  promptVersion: string;
  referenceAssetKey: string;
  referenceReady: boolean;
  requiredAttributes: string[];
  thresholds: WorkbenchThreshold[];
}

export interface WorkbenchData {
  cases: WorkbenchCase[];
  dataset: {
    caseCount: number;
    description: string;
    id: string;
    name: string;
    policyVersion: string;
    productCount: number;
    promptFamilyCount: number;
    status: EvaluationDataset["status"];
    version: string;
  };
  productOptions: Array<{ label: string; value: string }>;
  promptFamilyOptions: Array<{
    label: string;
    value: PromptFamily;
  }>;
  references: {
    boundCount: number;
    expectedCount: number;
    missingKeys: string[];
    ready: boolean;
  };
}

export function buildEvaluationWorkbenchData(
  dataset: EvaluationDataset,
  manifest: ReferenceManifest,
): WorkbenchData {
  const productsById = new Map(
    dataset.products.map((product) => [product.id, product]),
  );
  const expectedReferenceKeys = new Set(
    dataset.products.map((product) => product.referenceAssetKey),
  );
  const boundReferenceKeys = new Set(
    manifest.assets
      .map((asset) => asset.key)
      .filter((key) => expectedReferenceKeys.has(key)),
  );
  const missingKeys = [...expectedReferenceKeys].filter(
    (key) => !boundReferenceKeys.has(key),
  );
  const promptFamilies = [
    ...new Set(dataset.cases.map((evaluationCase) => evaluationCase.promptFamily)),
  ];

  const cases = dataset.cases.map((evaluationCase) => {
    const product = productsById.get(evaluationCase.productId);

    if (!product) {
      throw new Error(
        `Workbench case ${evaluationCase.id} references an unknown product.`,
      );
    }

    return {
      expectedText: evaluationCase.expected.exactText,
      forbidAdditionalText: evaluationCase.expected.forbidAdditionalText,
      forbiddenAttributes: evaluationCase.expected.forbiddenAttributes,
      id: evaluationCase.id,
      output: evaluationCase.output,
      productId: product.id,
      productName: product.name,
      prompt: evaluationCase.prompt,
      promptFamily: evaluationCase.promptFamily,
      promptFamilyLabel: promptFamilyLabels[evaluationCase.promptFamily],
      promptVersion: evaluationCase.promptVersion,
      referenceAssetKey: evaluationCase.referenceAssetKey,
      referenceReady: boundReferenceKeys.has(
        evaluationCase.referenceAssetKey,
      ),
      requiredAttributes: evaluationCase.expected.requiredAttributes,
      thresholds: evaluationCase.requiredDimensions.map((dimension) => ({
        dimension,
        failBelow: dataset.thresholds[dimension].failBelow,
        label: scoreDimensionLabels[dimension],
        passAtOrAbove: dataset.thresholds[dimension].passAtOrAbove,
      })),
    } satisfies WorkbenchCase;
  });

  return {
    cases,
    dataset: {
      caseCount: dataset.cases.length,
      description: dataset.description,
      id: dataset.id,
      name: dataset.name,
      policyVersion: dataset.policyVersion,
      productCount: dataset.products.length,
      promptFamilyCount: promptFamilies.length,
      status: dataset.status,
      version: dataset.version,
    },
    productOptions: dataset.products.map((product) => ({
      label: product.name,
      value: product.id,
    })),
    promptFamilyOptions: promptFamilies.map((promptFamily) => ({
      label: promptFamilyLabels[promptFamily],
      value: promptFamily,
    })),
    references: {
      boundCount: boundReferenceKeys.size,
      expectedCount: expectedReferenceKeys.size,
      missingKeys,
      ready: missingKeys.length === 0,
    },
  };
}
