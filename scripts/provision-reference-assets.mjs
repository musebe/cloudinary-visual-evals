import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import nextEnvironment from "@next/env";
import { v2 as cloudinary } from "cloudinary";

const { loadEnvConfig } = nextEnvironment;

loadEnvConfig(process.cwd());

const datasetId = "product-images-v1";
const datasetVersion = "2026-10-07.2";
const manifestPath = resolve(
  process.cwd(),
  "src/data/reference-assets.generated.json",
);
const requiredCredentials = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const missingCredentials = requiredCredentials.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingCredentials.length > 0) {
  console.error(
    `[cloudinary:references] Configuration is incomplete: ${missingCredentials.length} credential value(s) are missing.`,
  );
  process.exit(1);
}

cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  secure: true,
});

const text = (value, x, y, options = {}) => `
  <text x="${x}" y="${y}" text-anchor="${options.anchor ?? "middle"}"
    font-family="Arial, Helvetica, sans-serif" font-size="${options.size ?? 52}"
    font-weight="700" letter-spacing="3" fill="${options.fill ?? "#ffffff"}">${value}</text>`;

const designs = [
  {
    key: "reference-cobalt-trail-bottle-v1",
    productId: "cobalt-trail-bottle",
    expectedText: "EVAL-01",
    art: `
      <ellipse cx="512" cy="836" rx="220" ry="36" fill="#172033" opacity=".16"/>
      <path d="M646 195 C725 134 768 188 725 247" fill="none" stroke="#ef7b32" stroke-width="34" stroke-linecap="round"/>
      <rect x="394" y="150" width="236" height="120" rx="32" fill="url(#silver)" stroke="#8b94a3" stroke-width="8"/>
      <g stroke="#7f8998" stroke-width="5" opacity=".65">
        <path d="M420 172v76M455 166v88M490 166v88M525 166v88M560 166v88M595 172v76"/>
      </g>
      <rect x="328" y="236" width="368" height="590" rx="150" fill="#194c9b" stroke="#10366f" stroke-width="12"/>
      <path d="M384 320 C420 278 585 255 644 330" fill="none" stroke="#4e7fd0" stroke-width="24" opacity=".7"/>
      <rect x="384" y="490" width="256" height="130" rx="34" fill="#123b78" stroke="#6c94d8" stroke-width="5"/>
      ${text("EVAL-01", 512, 570, { size: 48 })}`,
  },
  {
    key: "reference-amber-serum-pump-v1",
    productId: "amber-serum-pump",
    expectedText: "EVAL-02",
    art: `
      <ellipse cx="512" cy="838" rx="205" ry="32" fill="#172033" opacity=".15"/>
      <rect x="404" y="138" width="216" height="92" rx="20" fill="#efe9d8" stroke="#c7beaa" stroke-width="7"/>
      <path d="M516 138V96H662V134H582" fill="none" stroke="#efe9d8" stroke-width="36" stroke-linejoin="round"/>
      <rect x="454" y="216" width="116" height="85" rx="18" fill="#e8e1cf" stroke="#bdb39d" stroke-width="7"/>
      <rect x="328" y="282" width="368" height="548" rx="70" fill="#8b481d" stroke="#5b2b13" stroke-width="12"/>
      <path d="M380 316v455" stroke="#c37a3b" stroke-width="34" opacity=".35"/>
      <rect x="386" y="476" width="252" height="178" rx="16" fill="#17191d" stroke="#34383f" stroke-width="5"/>
      ${text("EVAL-02", 512, 578, { size: 47 })}`,
  },
  {
    key: "reference-mint-earbud-case-v1",
    productId: "mint-earbud-case",
    expectedText: "EVAL-03",
    art: `
      <ellipse cx="512" cy="808" rx="270" ry="42" fill="#172033" opacity=".14"/>
      <rect x="278" y="320" width="468" height="370" rx="176" fill="#8edbc4" stroke="#489b85" stroke-width="12"/>
      <path d="M318 420 C382 335 650 335 706 426" fill="none" stroke="#c2f0e3" stroke-width="16" opacity=".7"/>
      <rect x="429" y="302" width="166" height="30" rx="14" fill="#171b20"/>
      <g fill="#fbfbf8" stroke="#d4d7d7" stroke-width="8">
        <rect x="365" y="255" width="116" height="250" rx="58"/>
        <rect x="543" y="255" width="116" height="250" rx="58"/>
      </g>
      <g fill="#c8cccc">
        <ellipse cx="423" cy="302" rx="20" ry="26"/>
        <ellipse cx="601" cy="302" rx="20" ry="26"/>
      </g>
      <rect x="369" y="538" width="286" height="92" rx="38" fill="#56af97"/>
      ${text("EVAL-03", 512, 599, { size: 44 })}`,
  },
  {
    key: "reference-coral-trail-shoe-v1",
    productId: "coral-trail-shoe",
    expectedText: "EVAL-04",
    art: `
      <ellipse cx="518" cy="800" rx="340" ry="42" fill="#172033" opacity=".15"/>
      <path d="M236 625 C300 570 330 438 391 308 C445 342 485 430 548 483 C616 540 733 558 810 637 C840 669 820 724 772 740 H250 C198 730 188 674 236 625Z" fill="#ef7469" stroke="#a83e3a" stroke-width="12"/>
      <path d="M222 704 H794 C846 704 856 756 806 780 H244 C194 766 184 724 222 704Z" fill="#1c2228"/>
      <g stroke="#f7b0aa" stroke-width="16" stroke-linecap="round">
        <path d="M395 420l145 76M368 468l158 80M340 518l148 74"/>
      </g>
      <path d="M337 344V250H389V319" fill="#a9d84e" stroke="#668c23" stroke-width="8"/>
      <rect x="497" y="585" width="208" height="84" rx="28" fill="#c64f48"/>
      ${text("EVAL-04", 601, 641, { size: 40 })}
      <g fill="#090c0f"><path d="M270 768v34h48v-34M380 768v40h48v-40M635 768v40h48v-40M744 768v34h48v-34"/></g>`,
  },
  {
    key: "reference-ivory-coffee-pouch-v1",
    productId: "ivory-coffee-pouch",
    expectedText: "EVAL-05",
    art: `
      <ellipse cx="512" cy="838" rx="242" ry="38" fill="#172033" opacity=".14"/>
      <path d="M328 184 H696 L740 792 Q724 832 680 832 H344 Q300 832 284 792Z" fill="#f1ead8" stroke="#b9ad94" stroke-width="12"/>
      <path d="M340 184V142H684V184" fill="none" stroke="#c5baa2" stroke-width="20"/>
      <rect x="294" y="566" width="436" height="110" fill="#b95e42"/>
      <circle cx="512" cy="340" r="44" fill="#3f8f58" stroke="#21663a" stroke-width="9"/>
      <circle cx="512" cy="340" r="15" fill="#dce7d4" opacity=".7"/>
      <rect x="368" y="422" width="288" height="100" rx="20" fill="#ded4be"/>
      ${text("EVAL-05", 512, 488, { size: 46, fill: "#5d3b2a" })}`,
  },
  {
    key: "reference-violet-perfume-bottle-v1",
    productId: "violet-perfume-bottle",
    expectedText: "EVAL-06",
    art: `
      <ellipse cx="512" cy="842" rx="225" ry="36" fill="#172033" opacity=".14"/>
      <rect x="418" y="142" width="188" height="136" rx="22" fill="url(#gold)" stroke="#9a7223" stroke-width="9"/>
      <rect x="348" y="260" width="328" height="570" rx="48" fill="#7852a3" fill-opacity=".86" stroke="#4e2d75" stroke-width="14"/>
      <path d="M380 632H644V782Q628 806 602 810H422Q396 806 380 782Z" fill="#d9c8ea" opacity=".42"/>
      <path d="M396 300V580" stroke="#c9ace4" stroke-width="28" opacity=".4"/>
      <rect x="392" y="460" width="240" height="128" rx="12" fill="#efe9f3" fill-opacity=".9"/>
      ${text("EVAL-06", 512, 540, { size: 44, fill: "#4b2a67" })}`,
  },
  {
    key: "reference-charcoal-smartwatch-v1",
    productId: "charcoal-smartwatch",
    expectedText: "EVAL-07",
    art: `
      <ellipse cx="512" cy="850" rx="180" ry="32" fill="#172033" opacity=".14"/>
      <rect x="392" y="108" width="240" height="808" rx="110" fill="#777c82" stroke="#484c51" stroke-width="12"/>
      <g stroke="#979ba0" stroke-width="5" opacity=".6"><path d="M430 150v180M470 140v190M554 140v190M594 150v180M430 690v180M470 690v190M554 690v190M594 690v180"/></g>
      <rect x="300" y="306" width="424" height="414" rx="98" fill="#252a2f" stroke="#111418" stroke-width="16"/>
      <rect x="334" y="340" width="356" height="346" rx="72" fill="#343b43"/>
      <circle cx="743" cy="468" r="38" fill="#e27632" stroke="#994317" stroke-width="9"/>
      <path d="M392 410H632" stroke="#59636d" stroke-width="5"/>
      ${text("EVAL-07", 512, 548, { size: 46 })}`,
  },
  {
    key: "reference-teal-desk-lamp-v1",
    productId: "teal-desk-lamp",
    expectedText: "EVAL-08",
    art: `
      <ellipse cx="512" cy="852" rx="290" ry="38" fill="#172033" opacity=".14"/>
      <path d="M302 344 Q512 118 722 344 L682 438 H342Z" fill="#177f83" stroke="#0c5559" stroke-width="13"/>
      <path d="M512 426V656" stroke="#22272b" stroke-width="42" stroke-linecap="round"/>
      <path d="M512 516L690 688" stroke="#22272b" stroke-width="38" stroke-linecap="round"/>
      <circle cx="512" cy="438" r="48" fill="#b68b3c" stroke="#76551e" stroke-width="10"/>
      <circle cx="690" cy="688" r="44" fill="#b68b3c" stroke="#76551e" stroke-width="10"/>
      <ellipse cx="512" cy="790" rx="286" ry="76" fill="#181d21" stroke="#090b0d" stroke-width="12"/>
      <rect x="390" y="746" width="244" height="70" rx="30" fill="#2d353a"/>
      ${text("EVAL-08", 512, 794, { size: 39 })}`,
  },
  {
    key: "reference-orange-carry-on-v1",
    productId: "orange-carry-on",
    expectedText: "EVAL-09",
    art: `
      <ellipse cx="512" cy="852" rx="260" ry="38" fill="#172033" opacity=".14"/>
      <path d="M426 270V126H598V270" fill="none" stroke="#20252a" stroke-width="36" stroke-linejoin="round"/>
      <rect x="298" y="244" width="428" height="578" rx="88" fill="#e56f2d" stroke="#9e3d14" stroke-width="14"/>
      <g stroke="#f09562" stroke-width="18" opacity=".72"><path d="M370 294v466M438 278v498M506 274v506M574 278v498M642 294v466"/></g>
      <rect x="372" y="496" width="276" height="102" rx="26" fill="#b34c20"/>
      ${text("EVAL-09", 510, 562, { size: 44 })}
      <path d="M706 360l90 36-48 112-82-34Z" fill="#2876bd" stroke="#124b7e" stroke-width="9"/>
      <circle cx="382" cy="832" r="34" fill="#1b2025"/><circle cx="642" cy="832" r="34" fill="#1b2025"/>`,
  },
  {
    key: "reference-olive-lunchbox-v1",
    productId: "olive-lunchbox",
    expectedText: "EVAL-10",
    art: `
      <ellipse cx="512" cy="828" rx="292" ry="38" fill="#172033" opacity=".14"/>
      <path d="M312 352 Q512 104 712 352" fill="none" stroke="#eee3c8" stroke-width="42" stroke-linecap="round"/>
      <rect x="242" y="316" width="540" height="480" rx="100" fill="#687548" stroke="#3d4827" stroke-width="14"/>
      <path d="M274 472 Q512 412 750 472" fill="none" stroke="#c49962" stroke-width="30"/>
      <path d="M276 484 Q512 430 748 484" fill="none" stroke="#f0c48e" stroke-width="7" stroke-dasharray="16 14"/>
      <rect x="354" y="540" width="316" height="118" rx="30" fill="#53603a"/>
      ${text("EVAL-10", 512, 616, { size: 44 })}
      <rect x="724" y="470" width="38" height="74" rx="16" fill="#c49962"/>`,
  },
];

function renderSvg(design) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="silver" x1="0" x2="1"><stop stop-color="#8d96a2"/><stop offset=".5" stop-color="#f1f3f4"/><stop offset="1" stop-color="#7b8591"/></linearGradient>
    <linearGradient id="gold" x1="0" x2="1"><stop stop-color="#8d651f"/><stop offset=".48" stop-color="#f1cf72"/><stop offset="1" stop-color="#936b25"/></linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="#f7f6f2"/>
  <circle cx="88" cy="88" r="10" fill="#d8d5cc"/>
  <circle cx="936" cy="88" r="10" fill="#d8d5cc"/>
  ${design.art}
</svg>`;
}

function svgDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function statusCode(error) {
  if (!error || typeof error !== "object") return null;
  return error.http_code ?? error.error?.http_code ?? null;
}

async function contentFingerprint(url) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error("Reference bytes could not be read for fingerprinting.");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return createHash("sha256").update(bytes).digest("hex");
}

async function getAsset(publicId) {
  try {
    return await cloudinary.api.resource(publicId, {
      resource_type: "image",
      type: "upload",
      context: true,
    });
  } catch (error) {
    if (statusCode(error) === 404) return null;
    throw error;
  }
}

async function provisionDesign(design, previousManifest) {
  const publicId = `visual-evals/references/${design.productId}-v1`;
  let asset = await getAsset(publicId);
  let action = "reused";
  const previous = previousManifest?.assets?.find((item) => item.key === design.key);

  if (previous && (!asset || asset.asset_id !== previous.assetId || asset.version !== previous.version)) {
    throw new Error(`Previously bound reference changed for ${design.key}. Review and version the dataset before replacing it.`);
  }

  if (!asset) {
    await cloudinary.uploader.upload(svgDataUri(renderSvg(design)), {
      context: {
        dataset_id: datasetId,
        dataset_version: datasetVersion,
        expected_text: design.expectedText,
        reference_key: design.key,
      },
      display_name: `${design.productId} reference v1`,
      format: "png",
      headers: "X-Robots-Tag: noindex, nofollow",
      overwrite: false,
      public_id: publicId,
      resource_type: "image",
      tags: [
        "visual-evals",
        "evaluation-reference",
        datasetId,
        datasetVersion,
      ],
      type: "upload",
      unique_filename: false,
      use_filename: false,
    });
    asset = await getAsset(publicId);
    action = "created";
  }

  if (!asset) throw new Error("Cloudinary asset readback was empty.");
  if (
    asset.public_id !== publicId ||
    asset.resource_type !== "image" ||
    asset.type !== "upload" ||
    asset.format !== "png" ||
    asset.width !== 1024 ||
    asset.height !== 1024 ||
    asset.context?.custom?.dataset_id !== datasetId ||
    asset.context?.custom?.dataset_version !== datasetVersion ||
    asset.context?.custom?.reference_key !== design.key ||
    asset.context?.custom?.expected_text !== design.expectedText
  ) {
    throw new Error(`Reference readback failed validation for ${design.key}.`);
  }

  console.info(`[cloudinary:references] ${action} ${design.key}`);

  const contentSha256 = await contentFingerprint(asset.secure_url);
  const previousFingerprint = previous?.contentSha256 ?? previous?.etag;
  if (previousFingerprint && contentSha256 !== previousFingerprint) {
    throw new Error(`Previously bound reference bytes changed for ${design.key}.`);
  }

  return {
    assetId: asset.asset_id,
    bytes: asset.bytes,
    contentSha256,
    format: asset.format,
    height: asset.height,
    key: design.key,
    publicId: asset.public_id,
    resourceType: asset.resource_type,
    type: asset.type,
    version: asset.version,
    width: asset.width,
  };
}

try {
  let previousManifest = null;
  try {
    previousManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (previousManifest.datasetId !== datasetId || previousManifest.datasetVersion !== datasetVersion || !Array.isArray(previousManifest.assets)) {
      throw new Error("The existing reference manifest does not match this dataset.");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const assets = [];

  for (const design of designs) {
    assets.push(await provisionDesign(design, previousManifest));
  }

  const manifest = {
    schemaVersion: "1.0",
    datasetId,
    datasetVersion,
    updatedAt:
      previousManifest &&
      JSON.stringify(previousManifest.assets) === JSON.stringify(assets)
        ? previousManifest.updatedAt
        : new Date().toISOString(),
    assets,
  };
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

  if (serialized !== JSON.stringify(previousManifest, null, 2) + "\n") {
    await writeFile(manifestPath, serialized, "utf8");
  }

  console.info(
    `[cloudinary:references] Bound ${assets.length}/${designs.length} references.`,
  );
} catch (error) {
  console.error("[cloudinary:references] Provisioning failed.", {
    name: error instanceof Error ? error.name : "UnknownError",
    status: statusCode(error),
  });
  process.exitCode = 1;
}
