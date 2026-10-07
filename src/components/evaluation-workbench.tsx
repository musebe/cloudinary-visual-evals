"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  LockKeyholeIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CldImage } from "next-cloudinary";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkbenchData } from "@/lib/evaluations/workbench";
import { SmokeExperiment } from "@/components/smoke-experiment";

interface EvaluationWorkbenchProps {
  cloudinaryConfigured: boolean;
  data: WorkbenchData;
  demoAvailable?: boolean;
  localSmokeEnabled: boolean;
}

interface ReadinessRowProps {
  detail: string;
  label: string;
  ready?: boolean;
}

function ReadinessRow({ detail, label, ready }: ReadinessRowProps) {
  const Icon = ready === true ? CheckCircle2Icon : CircleDashedIcon;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
      <Icon
        className={
          ready === true
            ? "mt-0.5 size-4"
            : "mt-0.5 size-4 text-muted-foreground"
        }
        aria-hidden="true"
      />
      <div className="flex min-w-0 items-start justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-right text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}

function AttributeList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
          <span
            className="mt-[0.45rem] size-1 rounded-full bg-current"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function EvaluationWorkbench({
  cloudinaryConfigured,
  data,
  demoAvailable = cloudinaryConfigured && data.references.boundCount === data.references.expectedCount,
  localSmokeEnabled,
}: EvaluationWorkbenchProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProduct = searchParams.get("product");
  const requestedPromptFamily = searchParams.get("prompt");
  const selectedProductId =
    data.productOptions.find((option) => option.value === requestedProduct)
      ?.value ?? data.productOptions[0]?.value;
  const selectedPromptFamily =
    data.promptFamilyOptions.find(
      (option) => option.value === requestedPromptFamily,
    )?.value ?? data.promptFamilyOptions[0]?.value;
  const selectedCase = data.cases.find(
    (evaluationCase) =>
      evaluationCase.productId === selectedProductId &&
      evaluationCase.promptFamily === selectedPromptFamily,
  );

  if (!selectedProductId || !selectedPromptFamily || !selectedCase) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>The dataset cannot be inspected</AlertTitle>
        <AlertDescription>
          No valid product and prompt-family pair was found.
        </AlertDescription>
      </Alert>
    );
  }

  function updateSelection(key: "product" | "prompt", value: string | null) {
    if (!value) return;

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set(key, value);
    router.push(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  }

  const blockers = [
    ...(!cloudinaryConfigured ? ["Cloudinary credentials are incomplete."] : []),
    ...(!selectedCase.referenceReady
      ? ["The selected product reference is not bound."]
      : []),
  ];
  const readOnlyDemo = !localSmokeEnabled && demoAvailable;
  const comparison = (
    <SmokeExperiment
      caseId={selectedCase.id}
      enabled={localSmokeEnabled && cloudinaryConfigured && selectedCase.referenceReady}
      demoAvailable={demoAvailable}
    />
  );

  return (
    <section className="flex flex-col gap-5" aria-labelledby="workbench-title">
      {readOnlyDemo ? comparison : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2
            id="workbench-title"
            className="text-2xl font-semibold tracking-tight"
          >
            {readOnlyDemo ? "Inspect the dataset" : "Evaluation workbench"}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Select one of the 50 committed cases to inspect its reference,
            prompt, and pass criteria. {readOnlyDemo ? "These selections do not change the recorded demo sample." : "Then run or restore a local comparison below."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{data.dataset.id}</Badge>
          <Badge variant="outline">v{data.dataset.version}</Badge>
          <Badge variant="secondary" className="capitalize">
            {data.dataset.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Cases", String(data.dataset.caseCount)],
          [
            "Coverage",
            `${data.dataset.productCount} products × ${data.dataset.promptFamilyCount} prompts`,
          ],
          [
            "References",
            `${data.references.boundCount} / ${data.references.expectedCount} bound`,
          ],
          ["Policy", data.dataset.policyVersion],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Inspect a dataset case</CardTitle>
              <CardDescription>
                Every product and prompt-family pair maps to one pre-labeled
                test.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="product-select">Product</FieldLabel>
                  <Select
                    items={data.productOptions}
                    value={selectedProductId}
                    onValueChange={(value) =>
                      updateSelection("product", value)
                    }
                  >
                    <SelectTrigger
                      id="product-select"
                      className="min-h-11 w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {data.productOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Ten fictional product identities.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="prompt-family-select">
                    Prompt family
                  </FieldLabel>
                  <Select
                    items={data.promptFamilyOptions}
                    value={selectedPromptFamily}
                    onValueChange={(value) =>
                      updateSelection("prompt", value)
                    }
                  >
                    <SelectTrigger
                      id="prompt-family-select"
                      className="min-h-11 w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {data.promptFamilyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Five repeatable composition tests.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="min-w-0 border-b">
              <CardTitle className="min-w-0" aria-live="polite">
                {selectedCase.productName}
              </CardTitle>
              <CardDescription className="break-all">
                {selectedCase.id} · prompt {selectedCase.promptVersion}
              </CardDescription>
              <CardAction className="col-start-1 row-start-3 mt-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
                <Badge
                  variant={
                    selectedCase.referenceReady ? "secondary" : "outline"
                  }
                >
                  Reference {selectedCase.referenceReady ? "bound" : "unbound"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {selectedCase.referencePreview ? (
                <figure className="flex flex-col gap-2">
                  <CldImage
                    key={selectedCase.referencePreview.publicId}
                    src={selectedCase.referencePreview.publicId}
                    version={selectedCase.referencePreview.version}
                    width={selectedCase.referencePreview.width}
                    height={selectedCase.referencePreview.height}
                    sizes="(max-width: 640px) calc(100vw - 80px), 320px"
                    crop="fit"
                    loading="eager"
                    alt={`Synthetic reference illustration of ${selectedCase.productName}, labeled ${selectedCase.expectedText.join(", ")}`}
                    className="aspect-square w-full max-w-80 rounded-lg border object-contain"
                  />
                  <figcaption className="text-xs text-muted-foreground">
                    Fixed synthetic reference · Cloudinary v{selectedCase.referencePreview.version}
                  </figcaption>
                </figure>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Prompt family
                  </p>
                  <p className="mt-1 font-medium">
                    {selectedCase.promptFamilyLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Output
                  </p>
                  <p className="mt-1 font-medium tabular-nums">
                    {selectedCase.output.width} × {selectedCase.output.height}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Exact text
                  </p>
                  <p className="mt-1 font-mono font-medium">
                    {selectedCase.expectedText.join(", ")}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <h3 className="font-medium">Committed prompt</h3>
                <p className="rounded-lg bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {selectedCase.prompt}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-medium">Required evidence</h3>
                  <AttributeList items={selectedCase.requiredAttributes} />
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-medium">Forbidden evidence</h3>
                  <AttributeList items={selectedCase.forbiddenAttributes} />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="font-medium">Decision thresholds</h3>
                <Table>
                  <TableCaption className="text-left">
                    Scores between the fail and pass boundaries route to human
                    review.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dimension</TableHead>
                      <TableHead className="text-right">Fail below</TableHead>
                      <TableHead className="text-right">Pass at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCase.thresholds.map((threshold) => (
                      <TableRow key={threshold.dimension}>
                        <TableCell className="font-medium">
                          {threshold.label}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {threshold.failBelow}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {threshold.passAtOrAbove}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg border px-4 py-3 text-sm">
                <span className="text-muted-foreground">Reference key </span>
                <span className="break-all font-mono">
                  {selectedCase.referenceAssetKey}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside
          className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-6"
          aria-label={readOnlyDemo ? "Demo status" : "Run readiness"}
        >
          <Card>
            <CardHeader className="border-b">
              <CardTitle>{readOnlyDemo ? "Demo status" : "Run readiness"}</CardTitle>
              <CardDescription>
                {readOnlyDemo ? "Inspect the dataset and view recorded evidence." : "Checks are explicit before generation is unlocked."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ReadinessRow label="Dataset" detail="Validated" ready />
              <Separator />
              <ReadinessRow
                label="Credentials"
                detail={cloudinaryConfigured ? "Present" : "Incomplete"}
                ready={cloudinaryConfigured}
              />
              <Separator />
              <ReadinessRow
                label="Selected reference"
                detail={selectedCase.referenceReady ? "Bound" : "Unbound"}
                ready={selectedCase.referenceReady}
              />
              <Separator />
              <ReadinessRow label="Generation evidence" detail={readOnlyDemo ? "Recorded sample" : "Checked by run"} />
              <Separator />
              <ReadinessRow label="Analysis evidence" detail={readOnlyDemo ? "Recorded sample" : "Checked by run"} />
              <Separator />
              <ReadinessRow label="Mode" detail={localSmokeEnabled ? "Local smoke" : demoAvailable ? "Read-only demo" : "Unavailable"} ready={localSmokeEnabled || demoAvailable} />
            </CardContent>
          </Card>

          {!localSmokeEnabled && !demoAvailable ? <Alert>
            <LockKeyholeIcon aria-hidden="true" />
            <AlertTitle>Comparison unavailable</AlertTitle>
            <AlertDescription>
              Dataset inspection is available. A verified comparison will appear
              once its Cloudinary evidence is configured.
            </AlertDescription>
          </Alert> : null}

          {blockers.length > 0 ? <Card>
            <CardHeader>
              <CardTitle>Setup to complete</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-xs leading-5 text-muted-foreground">
                {blockers.map((blocker) => (
                  <li
                    key={blocker}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-2"
                  >
                    <span aria-hidden="true">—</span>
                    <span>{blocker}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card> : null}
        </aside>
      </div>
      {!readOnlyDemo ? comparison : null}
    </section>
  );
}
