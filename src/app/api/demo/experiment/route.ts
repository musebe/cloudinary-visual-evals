import { io } from "next/cache";

import { getPublishedDemo } from "@/lib/evaluations/published-demo.server";

/** Read-only evidence: no generation, analysis, or local filesystem writes. */
export async function GET() {
  await io();
  try {
    return Response.json(await getPublishedDemo(), { headers: {
      "cache-control": "public, max-age=0, s-maxage=60",
      "x-content-type-options": "nosniff",
    } });
  } catch {
    return Response.json({ error: "The recorded comparison could not be verified with Cloudinary. Please try again later." }, {
      status: 503, headers: { "cache-control": "no-store" },
    });
  }
}
