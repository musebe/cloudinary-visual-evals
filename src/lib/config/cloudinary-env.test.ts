import { describe, expect, it } from "vitest";

import {
  inspectCloudinaryEnvironment,
  parseCloudinaryEnvironment,
} from "./cloudinary-env";

const validEnvironment = {
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "visual-evals-demo",
  CLOUDINARY_API_KEY: "123456789012345",
  CLOUDINARY_API_SECRET: "test-secret-that-is-not-real",
};

describe("Cloudinary environment", () => {
  it("parses credentials and applies safe defaults", () => {
    expect(parseCloudinaryEnvironment(validEnvironment)).toEqual({
      ...validEnvironment,
      CLOUDINARY_ADMIN_API_TIMEOUT_MS: 5_000,
      CLOUDINARY_ANALYZE_API_TIMEOUT_MS: 30_000,
      CLOUDINARY_IMAGE_GENERATION_TIMEOUT_MS: 60_000,
      CLOUDINARY_PROJECT_FOLDER: "visual-evals",
    });
  });

  it("reports missing credentials without returning their values", () => {
    expect(inspectCloudinaryEnvironment({})).toEqual({
      configured: false,
      invalid: [],
      missing: [
        "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ],
    });
  });

  it("rejects unchanged example placeholders", () => {
    const inspection = inspectCloudinaryEnvironment({
      ...validEnvironment,
      CLOUDINARY_API_SECRET: "your_api_secret",
    });

    expect(inspection.configured).toBe(false);
    expect(inspection.invalid).toEqual(["CLOUDINARY_API_SECRET"]);
  });

  it.each(["Visual-Evals", "visual_evals", "visual-evals/", "visual-evals//runs"])(
    "rejects a folder incompatible with generation targets: %s",
    (folder) => {
      expect(inspectCloudinaryEnvironment({
        ...validEnvironment,
        CLOUDINARY_PROJECT_FOLDER: folder,
      }).configured).toBe(false);
    },
  );
});
