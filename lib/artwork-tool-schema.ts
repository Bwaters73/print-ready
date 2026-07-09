import type Anthropic from "@anthropic-ai/sdk";

export function buildDraftVariationsTool(presetNames: string[]): Anthropic.Tool {
  return {
    name: "submit_variations",
    description:
      "Submit the three print-art prompt variations for a concept: faithful, signature, and wildcard.",
    input_schema: {
      type: "object",
      required: ["orientation", "faithfulSubject", "signatureSubject", "wildcardPreset", "wildcardSubject"],
      properties: {
        orientation: {
          type: "string",
          enum: ["portrait", "landscape"],
          description: "Which orientation best suits this concept as wall art.",
        },
        faithfulSubject: {
          type: "string",
          description:
            "The concept rendered straight — a rich, print-oriented descriptive phrase (subject, mood, light, " +
            "detail). Do NOT include any 'no text / no frame / no watermark' boilerplate — that is appended separately.",
        },
        signatureSubject: {
          type: "string",
          description:
            "The SAME concept phrased as a subject only (mood, light, composition) — this will be combined with " +
            "a fixed house-style art-direction block server-side, so do not describe painting style/medium here.",
        },
        wildcardPreset: {
          type: "string",
          enum: presetNames,
          description: "Pick ONE preset for a deliberate reinterpretation that surfaces a surprise.",
        },
        wildcardSubject: {
          type: "string",
          description:
            "The concept reimagined for the chosen wildcard preset — a rich descriptive phrase. Do NOT include " +
            "the 'no text / no frame' boilerplate — that is appended separately.",
        },
      },
    },
  };
}

export const DRAFT_SEO_TOOL: Anthropic.Tool = {
  name: "submit_seo",
  description: "Submit a title and Etsy listing SEO copy for one finished print-art piece.",
  input_schema: {
    type: "object",
    required: ["title", "seoTitle", "tags", "description"],
    properties: {
      title: {
        type: "string",
        description: "A short, evocative product name for this piece (drives the folder name).",
      },
      seoTitle: {
        type: "string",
        description: "Etsy listing title, front-loaded keywords, <= 140 characters.",
      },
      tags: {
        type: "array",
        minItems: 8,
        maxItems: 13,
        items: { type: "string" },
        description: "Etsy tags, each <= 20 characters.",
      },
      description: {
        type: "string",
        description:
          "Benefit-led listing description. Mention it's an instant-download printable, note 300 DPI, and " +
          "that no physical item ships.",
      },
    },
  },
};
