import { z } from "zod";

import { productImagesV1 } from "@/data/product-images-v1";
import { defineExperimentPlan } from "./experiment-contracts";

export const smokeRequestSchema = z.object({
  caseId: z.string().min(1).max(120),
  confirmQuota: z.literal(true),
}).strict();

export function localSmokeEnabled(environment: Record<string, string | undefined>) {
  return environment.NODE_ENV === "development" &&
    environment.CLOUDINARY_ENABLE_LOCAL_SMOKE === "true";
}

export function localSmokeRequestAllowed(request: Request, environment: Record<string, string | undefined>) {
  if (!localSmokeEnabled(environment)) return false;
  const url = new URL(request.url);
  if (!new Set(["localhost", "127.0.0.1", "[::1]"]).has(url.hostname)) return false;
  // Next.js may canonicalize request.url to localhost while the browser uses
  // 127.0.0.1. Bind CSRF checks to the actual HTTP Host header when present.
  let incoming: URL;
  try { incoming = new URL(`http://${request.headers.get("host") ?? url.host}`); }
  catch { return false; }
  if (!new Set(["localhost", "127.0.0.1", "[::1]"]).has(incoming.hostname)) return false;
  if (url.protocol !== "http:" || request.headers.get("origin") !== incoming.origin) return false;
  if (request.headers.has("x-vercel-id")) return false;
  return request.headers.get("x-visual-evals-action") === "smoke" &&
    request.headers.get("content-type")?.split(";")[0].trim() === "application/json";
}

export function createSmokePlan(caseId: string, id: string) {
  return defineExperimentPlan(productImagesV1, {
    baseline: {
      format: "png",
      id: "baseline-smoke-v1",
      label: "Committed prompt",
      model: { id: "flux-2-klein-9b-edit" },
      promptRevision: "committed-v1",
      promptSuffix: "",
    },
    candidate: {
      format: "png",
      id: "candidate-smoke-v1",
      label: "Text-preservation prompt",
      model: { id: "flux-2-klein-9b-edit" },
      promptRevision: "text-preservation-v1",
      promptSuffix: "Preserve the reference product identity and copy its EVAL label exactly. Keep the label sharp and readable without adding any other text.",
    },
    caseIds: [caseId],
    datasetId: productImagesV1.id,
    datasetVersion: productImagesV1.version,
    id,
    schemaVersion: "1.0",
  });
}
