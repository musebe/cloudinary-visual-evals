import type { ExperimentRunRecord } from "@/lib/evaluations/experiment-contracts";

// Historical, real Cloudinary run. Provider task/request IDs and account quota
// balances are omitted; asset provenance, observations, and scores are unchanged.
export const demoExperiment = {
  "aggregate": {
    "caseCount": 1,
    "dimensions": [
      {
        "baseline": {
          "averageScore": 100,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "candidate": {
          "averageScore": 100,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "dimension": "prompt_adherence",
        "passRateDelta": 0,
        "scoreDelta": 0
      },
      {
        "baseline": {
          "averageScore": 100,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "candidate": {
          "averageScore": 100,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "dimension": "reference_fidelity",
        "passRateDelta": 0,
        "scoreDelta": 0
      },
      {
        "baseline": {
          "averageScore": 100,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "candidate": {
          "averageScore": 100,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "dimension": "text_integrity",
        "passRateDelta": 0,
        "scoreDelta": 0
      },
      {
        "baseline": {
          "averageScore": 87.77,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "candidate": {
          "averageScore": 84.51,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "dimension": "technical_quality",
        "passRateDelta": 0,
        "scoreDelta": -3.26
      },
      {
        "baseline": {
          "averageScore": 100,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "candidate": {
          "averageScore": 100,
          "completeCount": 1,
          "failCount": 0,
          "incompleteCount": 0,
          "passCount": 1,
          "passRate": 100,
          "reviewCount": 0
        },
        "dimension": "safety",
        "passRateDelta": 0,
        "scoreDelta": 0
      }
    ],
    "pairedCompleteCount": 1,
    "regressionCaseIds": [],
    "variants": {
      "baseline": {
        "complete": 1,
        "fail": 0,
        "failed": 0,
        "pass": 1,
        "review": 0
      },
      "candidate": {
        "complete": 1,
        "fail": 0,
        "failed": 0,
        "pass": 1,
        "review": 0
      }
    }
  },
  "cases": [
    {
      "caseId": "cobalt-trail-bottle-studio-packshot",
      "variants": [
        {
          "configurationId": "baseline-smoke-v1",
          "provenance": {
            "caseId": "cobalt-trail-bottle-studio-packshot",
            "cloudinaryRequestId": "not-published",
            "cloudinaryTaskId": "not-published",
            "completedAt": "2026-10-07T21:12:04.397Z",
            "configurationId": "baseline-smoke-v1",
            "datasetId": "product-images-v1",
            "datasetVersion": "2026-10-07.2",
            "durationMs": 6316,
            "executedPrompt": "Using reference image [1], create a centered studio packshot of the Cobalt trail bottle. Preserve its exact product identity and print only “EVAL-01” exactly as shown. Show the entire product on a seamless white background with a soft grounded shadow.",
            "executedPromptHash": "20fc11cd4f957d34b71bc835c0d9eded205cb27a56e32f55bda8ef47810a85bc",
            "experimentId": "smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f",
            "notices": [],
            "output": {
              "assetId": "584d051d6860e63983ca311afbd0b7c0",
              "bytes": 752138,
              "createdAt": "2026-10-07T21:12:04.132645226Z",
              "format": "png",
              "height": 1024,
              "publicId": "visual-evals/smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f/cobalt-trail-bottle-studio-packshot/baseline",
              "resourceType": "image",
              "secureUrl": "https://res.cloudinary.com/demo-article-projects/image/upload/v1791407523/visual-evals/smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f/cobalt-trail-bottle-studio-packshot/baseline.png",
              "type": "upload",
              "version": 1791407523,
              "width": 1024
            },
            "promptVersion": "v1:committed-v1",
            "quota": {
              "limit": null,
              "remaining": null,
              "type": "image_generation",
              "used_by_request": 3
            },
            "reference": {
              "assetId": "b0194226e8a9a2bca42751edadd9e8cf",
              "contentSha256": "eb8fef35c84ae98f4f82c6adb8d0739f4543049538803c5cde1ba7737ffff8d8",
              "key": "reference-cobalt-trail-bottle-v1",
              "publicId": "visual-evals/references/cobalt-trail-bottle-v1",
              "version": 1791406606
            },
            "requested": {
              "format": "png",
              "height": 1024,
              "model": {
                "id": "flux-2-klein-9b-edit"
              },
              "seed": null,
              "targetPublicId": "visual-evals/smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f/cobalt-trail-bottle-studio-packshot/baseline",
              "width": 1024
            },
            "resolved": {
              "model": {
                "family": "flux",
                "id": "flux-2-klein-9b-edit",
                "tier": "standard"
              },
              "seed": 1699781668
            },
            "schemaVersion": "1.0",
            "submittedAt": "2026-10-07T21:11:58.081Z",
            "variant": "baseline"
          },
          "scoring": {
            "scoring": {
              "asset": {
                "assetId": "584d051d6860e63983ca311afbd0b7c0",
                "publicId": "visual-evals/smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f/cobalt-trail-bottle-studio-packshot/baseline",
                "version": 1791407523
              },
              "caseId": "cobalt-trail-bottle-studio-packshot",
              "results": [
                {
                  "dimension": "prompt_adherence",
                  "findings": [
                    "The image successfully contains all required prompt elements, including the cobalt blue cylindrical bottle, brushed silver screw cap, orange fabric carry loop, and proper studio background with shadow. No forbidden elements are present."
                  ],
                  "hardViolations": [],
                  "score": 100,
                  "status": "complete"
                },
                {
                  "dimension": "reference_fidelity",
                  "findings": [
                    "The product matches all reference identity attributes without introducing any forbidden attributes like a glass body or straw lid."
                  ],
                  "hardViolations": [],
                  "score": 100,
                  "status": "complete"
                },
                {
                  "dimension": "text_integrity",
                  "findings": [
                    "The text EVAL-01 appears clearly on the bottle label and below the image, although additional text outside the product is visible.",
                    "Observed text: EVAL-01"
                  ],
                  "hardViolations": [],
                  "score": 100,
                  "status": "complete"
                },
                {
                  "dimension": "technical_quality",
                  "findings": [
                    "Cloudinary image quality: high (0.878, confidence 1.000)."
                  ],
                  "hardViolations": [],
                  "score": 87.77,
                  "status": "complete"
                },
                {
                  "dimension": "safety",
                  "findings": [
                    "All configured safety rejection questions returned no."
                  ],
                  "hardViolations": [],
                  "score": 100,
                  "status": "complete"
                }
              ],
              "schemaVersion": "1.0",
              "scoredAt": "2026-10-07T21:12:05.135Z",
              "scorerVersion": "visual-scoring-1.0",
              "sources": {
                "quality": {
                  "category": null,
                  "code": null,
                  "modelVersion": 1,
                  "outcomeUnknown": null,
                  "reason": null,
                  "requestId": null,
                  "retryable": null,
                  "statusCode": null,
                  "status": "complete"
                },
                "safety": {
                  "category": null,
                  "code": null,
                  "modelVersion": 1,
                  "outcomeUnknown": null,
                  "reason": null,
                  "requestId": null,
                  "retryable": null,
                  "statusCode": null,
                  "status": "complete"
                },
                "vision": {
                  "category": null,
                  "code": null,
                  "modelVersion": 1,
                  "outcomeUnknown": null,
                  "reason": null,
                  "requestId": null,
                  "retryable": null,
                  "statusCode": null,
                  "status": "complete"
                }
              }
            },
            "decision": {
              "aggregateScore": 97.55,
              "decision": "pass",
              "dimensions": [
                {
                  "dimension": "prompt_adherence",
                  "outcome": "pass",
                  "reason": "Score meets the 85 pass threshold.",
                  "score": 100
                },
                {
                  "dimension": "reference_fidelity",
                  "outcome": "pass",
                  "reason": "Score meets the 82 pass threshold.",
                  "score": 100
                },
                {
                  "dimension": "text_integrity",
                  "outcome": "pass",
                  "reason": "Score meets the 95 pass threshold.",
                  "score": 100
                },
                {
                  "dimension": "technical_quality",
                  "outcome": "pass",
                  "reason": "Score meets the 80 pass threshold.",
                  "score": 87.77
                },
                {
                  "dimension": "safety",
                  "outcome": "pass",
                  "reason": "Score meets the 95 pass threshold.",
                  "score": 100
                }
              ],
              "policyVersion": "visual-evals-1-0"
            }
          },
          "status": "complete",
          "variant": "baseline"
        },
        {
          "configurationId": "candidate-smoke-v1",
          "provenance": {
            "caseId": "cobalt-trail-bottle-studio-packshot",
            "cloudinaryRequestId": "not-published",
            "cloudinaryTaskId": "not-published",
            "completedAt": "2026-10-07T21:12:16.999Z",
            "configurationId": "candidate-smoke-v1",
            "datasetId": "product-images-v1",
            "datasetVersion": "2026-10-07.2",
            "durationMs": 5576,
            "executedPrompt": "Using reference image [1], create a centered studio packshot of the Cobalt trail bottle. Preserve its exact product identity and print only “EVAL-01” exactly as shown. Show the entire product on a seamless white background with a soft grounded shadow. Preserve the reference product identity and copy its EVAL label exactly. Keep the label sharp and readable without adding any other text.",
            "executedPromptHash": "4646fd601c195ef3195b9ffb4954a81aec7156e816409a7d3f8d9a860adce1a0",
            "experimentId": "smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f",
            "notices": [],
            "output": {
              "assetId": "45c1f9a69042b5f68a5885c145777157",
              "bytes": 686770,
              "createdAt": "2026-10-07T21:12:15.719406308Z",
              "format": "png",
              "height": 1024,
              "publicId": "visual-evals/smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f/cobalt-trail-bottle-studio-packshot/candidate",
              "resourceType": "image",
              "secureUrl": "https://res.cloudinary.com/demo-article-projects/image/upload/v1791407534/visual-evals/smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f/cobalt-trail-bottle-studio-packshot/candidate.png",
              "type": "upload",
              "version": 1791407534,
              "width": 1024
            },
            "promptVersion": "v1:text-preservation-v1",
            "quota": {
              "limit": null,
              "remaining": null,
              "type": "image_generation",
              "used_by_request": 3
            },
            "reference": {
              "assetId": "b0194226e8a9a2bca42751edadd9e8cf",
              "contentSha256": "eb8fef35c84ae98f4f82c6adb8d0739f4543049538803c5cde1ba7737ffff8d8",
              "key": "reference-cobalt-trail-bottle-v1",
              "publicId": "visual-evals/references/cobalt-trail-bottle-v1",
              "version": 1791406606
            },
            "requested": {
              "format": "png",
              "height": 1024,
              "model": {
                "id": "flux-2-klein-9b-edit"
              },
              "seed": null,
              "targetPublicId": "visual-evals/smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f/cobalt-trail-bottle-studio-packshot/candidate",
              "width": 1024
            },
            "resolved": {
              "model": {
                "family": "flux",
                "id": "flux-2-klein-9b-edit",
                "tier": "standard"
              },
              "seed": 619922231
            },
            "schemaVersion": "1.0",
            "submittedAt": "2026-10-07T21:12:11.423Z",
            "variant": "candidate"
          },
          "scoring": {
            "scoring": {
              "asset": {
                "assetId": "45c1f9a69042b5f68a5885c145777157",
                "publicId": "visual-evals/smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f/cobalt-trail-bottle-studio-packshot/candidate",
                "version": 1791407534
              },
              "caseId": "cobalt-trail-bottle-studio-packshot",
              "results": [
                {
                  "dimension": "prompt_adherence",
                  "findings": [
                    "The image successfully fulfills all prompt requirements, showing the cobalt blue cylindrical bottle with a brushed silver screw cap, orange fabric carry loop, and correct text, presented on a white background with a shadow."
                  ],
                  "hardViolations": [],
                  "score": 100,
                  "status": "complete"
                },
                {
                  "dimension": "reference_fidelity",
                  "findings": [
                    "The object perfectly preserves identity attributes from the reference without introducing forbidden identity changes."
                  ],
                  "hardViolations": [],
                  "score": 100,
                  "status": "complete"
                },
                {
                  "dimension": "text_integrity",
                  "findings": [
                    "The text EVAL-01 is clearly visible and legible on the bottle, matching the expected output.",
                    "Observed text: EVAL-01"
                  ],
                  "hardViolations": [],
                  "score": 100,
                  "status": "complete"
                },
                {
                  "dimension": "technical_quality",
                  "findings": [
                    "Cloudinary image quality: high (0.845, confidence 1.000)."
                  ],
                  "hardViolations": [],
                  "score": 84.51,
                  "status": "complete"
                },
                {
                  "dimension": "safety",
                  "findings": [
                    "All configured safety rejection questions returned no."
                  ],
                  "hardViolations": [],
                  "score": 100,
                  "status": "complete"
                }
              ],
              "schemaVersion": "1.0",
              "scoredAt": "2026-10-07T21:12:17.835Z",
              "scorerVersion": "visual-scoring-1.0",
              "sources": {
                "quality": {
                  "category": null,
                  "code": null,
                  "modelVersion": 1,
                  "outcomeUnknown": null,
                  "reason": null,
                  "requestId": null,
                  "retryable": null,
                  "statusCode": null,
                  "status": "complete"
                },
                "safety": {
                  "category": null,
                  "code": null,
                  "modelVersion": 1,
                  "outcomeUnknown": null,
                  "reason": null,
                  "requestId": null,
                  "retryable": null,
                  "statusCode": null,
                  "status": "complete"
                },
                "vision": {
                  "category": null,
                  "code": null,
                  "modelVersion": 1,
                  "outcomeUnknown": null,
                  "reason": null,
                  "requestId": null,
                  "retryable": null,
                  "statusCode": null,
                  "status": "complete"
                }
              }
            },
            "decision": {
              "aggregateScore": 96.9,
              "decision": "pass",
              "dimensions": [
                {
                  "dimension": "prompt_adherence",
                  "outcome": "pass",
                  "reason": "Score meets the 85 pass threshold.",
                  "score": 100
                },
                {
                  "dimension": "reference_fidelity",
                  "outcome": "pass",
                  "reason": "Score meets the 82 pass threshold.",
                  "score": 100
                },
                {
                  "dimension": "text_integrity",
                  "outcome": "pass",
                  "reason": "Score meets the 95 pass threshold.",
                  "score": 100
                },
                {
                  "dimension": "technical_quality",
                  "outcome": "pass",
                  "reason": "Score meets the 80 pass threshold.",
                  "score": 84.51
                },
                {
                  "dimension": "safety",
                  "outcome": "pass",
                  "reason": "Score meets the 95 pass threshold.",
                  "score": 100
                }
              ],
              "policyVersion": "visual-evals-1-0"
            }
          },
          "status": "complete",
          "variant": "candidate"
        }
      ]
    }
  ],
  "completedAt": "2026-10-07T21:12:24.176Z",
  "datasetId": "product-images-v1",
  "datasetVersion": "2026-10-07.2",
  "id": "smoke-20261007-73814a4a-ceda-4e36-9c23-eade375f209f",
  "schemaVersion": "1.0",
  "startedAt": "2026-10-07T21:11:58.076Z"
} satisfies ExperimentRunRecord;
