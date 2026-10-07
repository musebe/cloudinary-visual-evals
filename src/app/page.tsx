import { ActivityIcon } from "lucide-react";
import { io } from "next/cache";
import { Suspense } from "react";

import { EvaluationWorkbench } from "@/components/evaluation-workbench";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { productImagesV1 } from "@/data/product-images-v1";
import { referenceAssets } from "@/data/reference-assets";
import { inspectCloudinaryEnvironment } from "@/lib/config/cloudinary-env";
import { buildEvaluationWorkbenchData } from "@/lib/evaluations/workbench";
import { localSmokeEnabled } from "@/lib/evaluations/local-smoke";

const workbenchData = buildEvaluationWorkbenchData(
  productImagesV1,
  referenceAssets,
);

async function EvaluationWorkbenchRuntime() {
  await io();

  return (
    <EvaluationWorkbench
      cloudinaryConfigured={
        inspectCloudinaryEnvironment(process.env).configured
      }
      data={workbenchData}
      localSmokeEnabled={localSmokeEnabled(process.env)}
    />
  );
}

function EvaluationWorkbenchFallback() {
  return (
    <Card aria-busy="true">
      <CardContent className="py-8 text-sm text-muted-foreground">
        Checking local runtime readiness…
      </CardContent>
    </Card>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-lg border bg-card"
            aria-hidden="true"
          >
            <ActivityIcon className="size-4" />
          </div>
          <div>
            <p className="font-medium">Visual Evals Lab</p>
            <p className="text-sm text-muted-foreground">
              Cloudinary × Next.js
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="max-w-full">
          Dataset draft · {workbenchData.references.boundCount}/
          {workbenchData.references.expectedCount} refs
        </Badge>
      </header>

      <section className="flex max-w-3xl flex-col gap-3">
        <Badge variant="outline" className="w-fit">
          AI image regression testing
        </Badge>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Compare generated product images.
        </h1>
        <p className="text-pretty text-base leading-7 text-muted-foreground">
          Choose a fixed product-image case, run a baseline and candidate, and
          inspect their Cloudinary-backed evidence. Restore the last local
          result to explore the comparison without generating again.
        </p>
      </section>

      <Suspense fallback={<EvaluationWorkbenchFallback />}>
        <EvaluationWorkbenchRuntime />
      </Suspense>
    </main>
  );
}
