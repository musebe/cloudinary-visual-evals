import { defineReferenceManifest } from "@/lib/cloudinary/reference-manifest";

import generatedManifest from "./reference-assets.generated.json";

export const referenceAssets = defineReferenceManifest(generatedManifest);
