import { inspectCloudinaryEnvironment } from "@/lib/config/cloudinary-env";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
} as const;

export function buildHealthReport(
  source: Record<string, string | undefined>,
  checkedAt: Date,
) {
  const configuration = inspectCloudinaryEnvironment(source);

  return {
    checkedAt: checkedAt.toISOString(),
    checks: {
      application: { status: "ok" as const },
      cloudinaryConfiguration: {
        status: configuration.configured ? ("ok" as const) : ("error" as const),
        invalidCount: configuration.invalid.length,
        missingCount: configuration.missing.length,
      },
      cloudinaryConnection: {
        status: "not_checked" as const,
        verificationCommand: "pnpm cloudinary:verify",
      },
    },
    service: "cloudinary-visual-evals",
    status: configuration.configured ? ("ok" as const) : ("degraded" as const),
  };
}

export function createHealthResponse(
  source: Record<string, string | undefined>,
  checkedAt: Date,
) {
  const report = buildHealthReport(source, checkedAt);

  return Response.json(report, {
    headers: NO_STORE_HEADERS,
    status: report.status === "ok" ? 200 : 503,
  });
}
