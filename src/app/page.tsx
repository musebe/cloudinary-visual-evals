import {
  ActivityIcon,
  ArrowRightIcon,
  ImagesIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { productImagesV1Summary } from "@/data/product-images-v1";

const workflow = [
  {
    title: "Define",
    description: "Lock the cases, prompts, references, and pass criteria.",
    icon: ImagesIcon,
  },
  {
    title: "Generate",
    description: "Run baseline and candidate configurations through Cloudinary.",
    icon: ActivityIcon,
  },
  {
    title: "Score",
    description: "Measure adherence, fidelity, quality, text, and safety.",
    icon: ScanSearchIcon,
  },
  {
    title: "Decide",
    description: "Expose regressions and keep uncertain cases in human review.",
    icon: ShieldCheckIcon,
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
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
        <Badge variant="secondary">Dataset ready · Cloudinary pending</Badge>
      </header>

      <section className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-5">
          <Badge variant="outline" className="w-fit">
            AI image regression testing
          </Badge>
          <div className="flex max-w-3xl flex-col gap-4">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Catch visual regressions before generated images ship.
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              Run the same product-image cases against a baseline and a
              candidate, inspect Cloudinary-backed evidence, and send uncertain
              results to review.
            </p>
          </div>
          <Button className="w-fit" disabled>
            Connect Cloudinary to continue
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>Current experiment</CardDescription>
            <CardTitle>No run yet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Dataset</span>
              <span className="font-medium">
                {productImagesV1Summary.caseCount} validated cases
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Coverage</span>
              <span className="font-medium">
                {productImagesV1Summary.productCount} products ×{" "}
                {productImagesV1Summary.promptFamilyCount} prompts
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Comparison</span>
              <span className="font-medium">Baseline vs candidate</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Evidence</span>
              <span className="font-medium">Cloudinary readback</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="workflow-title">
        <div className="flex flex-col gap-1">
          <h2
            id="workflow-title"
            className="text-2xl font-semibold tracking-tight"
          >
            One traceable evaluation loop
          </h2>
          <p className="text-sm text-muted-foreground">
            The interface will stay focused on the experiment and its evidence.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map(({ title, description, icon: Icon }, index) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <Icon
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
