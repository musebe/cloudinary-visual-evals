import { localSmokeEnabled } from "@/lib/evaluations/local-smoke";
import { readLatestSmokeRecord } from "@/lib/evaluations/local-smoke-store.server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = request.headers.get("sec-fetch-site");
  const host = request.headers.get("host") ?? url.host;
  let incoming: URL;
  try { incoming = new URL(`http://${host}`); }
  catch { return Response.json({ error: "Invalid local host." }, { status: 403 }); }
  if (!localSmokeEnabled(process.env) || url.protocol !== "http:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(incoming.hostname) ||
      (site && site !== "same-origin" && site !== "none")) {
    return Response.json({ error: "Local smoke results are not available here." }, { status: 403 });
  }
  try {
    return Response.json({ record: await readLatestSmokeRecord() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The local smoke journal could not be read." }, { status: 500 });
  }
}
