import {
  defineEvaluationDataset,
  promptFamilyIds,
  scoreDimensions,
  type ProductDefinition,
  type PromptFamily,
} from "@/lib/evaluations/contracts";

const products = [
  {
    id: "cobalt-trail-bottle",
    name: "Cobalt trail bottle",
    referenceAssetKey: "reference-cobalt-trail-bottle-v1",
    expectedText: "EVAL-01",
    requiredAttributes: [
      "cobalt blue cylindrical bottle",
      "brushed silver screw cap",
      "orange fabric carry loop",
    ],
    forbiddenAttributes: ["straw lid", "glass body"],
    lifestyleSetting: "on a dark slate beside a folded hiking map",
  },
  {
    id: "amber-serum-pump",
    name: "Amber serum pump",
    referenceAssetKey: "reference-amber-serum-pump-v1",
    expectedText: "EVAL-02",
    requiredAttributes: [
      "amber glass bottle",
      "matte ivory pump",
      "narrow black label panel",
    ],
    forbiddenAttributes: ["dropper pipette", "plastic jar"],
    lifestyleSetting: "on pale stone beside a folded white face cloth",
  },
  {
    id: "mint-earbud-case",
    name: "Mint earbud case",
    referenceAssetKey: "reference-mint-earbud-case-v1",
    expectedText: "EVAL-03",
    requiredAttributes: [
      "mint green oval charging case",
      "two white stem earbuds",
      "small black rear hinge",
    ],
    forbiddenAttributes: ["over-ear headphones", "charging cable"],
    lifestyleSetting: "on a light oak desk beside a closed notebook",
  },
  {
    id: "coral-trail-shoe",
    name: "Coral trail shoe",
    referenceAssetKey: "reference-coral-trail-shoe-v1",
    expectedText: "EVAL-04",
    requiredAttributes: [
      "coral mesh upper",
      "black lugged outsole",
      "lime green heel pull tab",
    ],
    forbiddenAttributes: ["high heel", "smooth leather upper"],
    lifestyleSetting: "on a dry stone trail with soft morning light",
  },
  {
    id: "ivory-coffee-pouch",
    name: "Ivory coffee pouch",
    referenceAssetKey: "reference-ivory-coffee-pouch-v1",
    expectedText: "EVAL-05",
    requiredAttributes: [
      "ivory stand-up pouch",
      "small green freshness valve",
      "terracotta horizontal band",
    ],
    forbiddenAttributes: ["coffee cup", "transparent bag"],
    lifestyleSetting: "on a walnut counter beside a wooden coffee scoop",
  },
  {
    id: "violet-perfume-bottle",
    name: "Violet perfume bottle",
    referenceAssetKey: "reference-violet-perfume-bottle-v1",
    expectedText: "EVAL-06",
    requiredAttributes: [
      "square violet glass bottle",
      "short brushed gold cap",
      "clear pale liquid",
    ],
    forbiddenAttributes: ["atomizer bulb", "round bottle"],
    lifestyleSetting: "on a mirrored tray beside one white flower petal",
  },
  {
    id: "charcoal-smartwatch",
    name: "Charcoal smartwatch",
    referenceAssetKey: "reference-charcoal-smartwatch-v1",
    expectedText: "EVAL-07",
    requiredAttributes: [
      "square charcoal watch face",
      "orange side crown",
      "grey woven strap",
    ],
    forbiddenAttributes: ["round dial", "metal link bracelet"],
    lifestyleSetting: "on a concrete desk beside a graphite stylus",
  },
  {
    id: "teal-desk-lamp",
    name: "Teal desk lamp",
    referenceAssetKey: "reference-teal-desk-lamp-v1",
    expectedText: "EVAL-08",
    requiredAttributes: [
      "teal dome shade",
      "brass elbow hinge",
      "flat black circular base",
    ],
    forbiddenAttributes: ["floor lamp", "fabric shade"],
    lifestyleSetting: "on a compact writing desk beside two stacked books",
  },
  {
    id: "orange-carry-on",
    name: "Orange carry-on suitcase",
    referenceAssetKey: "reference-orange-carry-on-v1",
    expectedText: "EVAL-09",
    requiredAttributes: [
      "orange ribbed hard shell",
      "black telescopic handle",
      "small blue luggage tag",
    ],
    forbiddenAttributes: ["backpack straps", "soft fabric body"],
    lifestyleSetting: "on a clean station platform beside a simple bench",
  },
  {
    id: "olive-lunchbox",
    name: "Olive insulated lunchbox",
    referenceAssetKey: "reference-olive-lunchbox-v1",
    expectedText: "EVAL-10",
    requiredAttributes: [
      "olive rectangular insulated bag",
      "tan wraparound zipper",
      "cream adjustable shoulder strap",
    ],
    forbiddenAttributes: ["plastic bento box", "metal clasp"],
    lifestyleSetting: "on a picnic table beside a folded cream napkin",
  },
] satisfies ProductDefinition[];

interface PromptFamilyDefinition {
  buildPrompt: (product: ProductDefinition) => string;
  forbidAdditionalText: boolean;
  forbiddenAttributes: string[];
  id: PromptFamily;
  output: { height: number; width: number };
  requiredAttributes: string[];
}

const promptFamilies = [
  {
    id: "studio_packshot",
    output: { width: 1024, height: 1024 },
    forbidAdditionalText: true,
    requiredAttributes: [
      "entire product visible",
      "centered on a seamless white background",
      "soft grounded studio shadow",
    ],
    forbiddenAttributes: ["human hands", "decorative props"],
    buildPrompt: (product) =>
      `Using the provided reference image, create a centered studio packshot of the ${product.name}. Preserve its exact product identity and print only “${product.expectedText}” exactly as shown. Show the entire product on a seamless white background with a soft grounded shadow.`,
  },
  {
    id: "lifestyle_scene",
    output: { width: 1024, height: 1280 },
    forbidAdditionalText: true,
    requiredAttributes: [
      "product remains the clear focal point",
      "natural contact shadow",
      "plausible scale for the setting",
    ],
    forbiddenAttributes: ["promotional headline", "price badge"],
    buildPrompt: (product) =>
      `Using the provided reference image, place the ${product.name} ${product.lifestyleSetting}. Preserve every defining product detail and keep “${product.expectedText}” unchanged and legible. Use restrained commercial photography with no promotional copy.`,
  },
  {
    id: "label_closeup",
    output: { width: 1024, height: 1024 },
    forbidAdditionalText: true,
    requiredAttributes: [
      "label area fills most of the frame",
      "expected text is sharp and unobstructed",
      "product material remains recognizable",
    ],
    forbiddenAttributes: ["invented fine print", "cropped expected text"],
    buildPrompt: (product) =>
      `Create a precise close-up of the label area on the referenced ${product.name}. The only visible text must be “${product.expectedText}”, spelled exactly with the hyphen and digits intact. Preserve the original materials, colors, and proportions.`,
  },
  {
    id: "multi_angle_layout",
    output: { width: 1536, height: 1024 },
    forbidAdditionalText: true,
    requiredAttributes: [
      "exactly three views of one product",
      "front, side, and three-quarter views",
      "consistent identity across all views",
    ],
    forbiddenAttributes: ["fourth product view", "mixed product variants"],
    buildPrompt: (product) =>
      `Using the same referenced ${product.name}, create one clean comparison board with exactly three views: front, side, and three-quarter. Keep all colors, materials, proportions, and the text “${product.expectedText}” consistent. Use a light grey background and no captions.`,
  },
  {
    id: "campaign_banner",
    output: { width: 1536, height: 864 },
    forbidAdditionalText: true,
    requiredAttributes: [
      "product occupies the right third",
      "left half remains usable negative space",
      "landscape campaign composition",
    ],
    forbiddenAttributes: ["call-to-action button", "marketing headline"],
    buildPrompt: (product) =>
      `Create a 16:9 campaign image from the referenced ${product.name}. Place the complete product in the right third, preserve “${product.expectedText}” exactly, and leave the left half as calm negative space. Do not add a headline, button, price, or extra logo.`,
  },
] satisfies PromptFamilyDefinition[];

function createCases() {
  return products.flatMap((product) =>
    promptFamilies.map((family) => ({
      id: `${product.id}-${family.id.replaceAll("_", "-")}`,
      productId: product.id,
      promptFamily: family.id,
      promptVersion: "v1",
      prompt: family.buildPrompt(product),
      referenceAssetKey: product.referenceAssetKey,
      output: family.output,
      requiredDimensions: [...scoreDimensions],
      expected: {
        exactText: [product.expectedText],
        forbidAdditionalText: family.forbidAdditionalText,
        requiredAttributes: [
          ...product.requiredAttributes,
          ...family.requiredAttributes,
        ],
        forbiddenAttributes: [
          ...product.forbiddenAttributes,
          ...family.forbiddenAttributes,
        ],
      },
    })),
  );
}

export const productImagesV1 = defineEvaluationDataset({
  schemaVersion: "1.0",
  id: "product-images-v1",
  version: "2026-10-07.1",
  policyVersion: "visual-evals-1-0",
  status: "draft",
  labelProtocol: "human-authored-before-generation",
  name: "Synthetic product-image regression set",
  description:
    "Fifty pre-labeled product-image cases covering identity, composition, text integrity, technical quality, and safety without asserting model performance.",
  createdAt: "2026-10-07T00:00:00.000Z",
  thresholds: {
    prompt_adherence: { failBelow: 60, passAtOrAbove: 85 },
    reference_fidelity: { failBelow: 55, passAtOrAbove: 82 },
    text_integrity: { failBelow: 75, passAtOrAbove: 95 },
    technical_quality: { failBelow: 60, passAtOrAbove: 80 },
    safety: { failBelow: 80, passAtOrAbove: 95 },
  },
  products,
  cases: createCases(),
});

export const productImagesV1Summary = {
  caseCount: productImagesV1.cases.length,
  productCount: productImagesV1.products.length,
  promptFamilyCount: promptFamilyIds.length,
  version: productImagesV1.version,
};
