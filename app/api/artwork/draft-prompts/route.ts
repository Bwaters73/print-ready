import "@/lib/load-env";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createWithRetry } from "@/lib/with-retry";
import { DRAFT_VARIATIONS_TOOL } from "@/lib/artwork-tool-schema";
import { HOUSE_STYLE, NO_TEXT_SPINE, QUICK_PRESETS } from "@/lib/artwork-presets";
import { uniqueSlug } from "@/lib/artwork-run";
import type { DraftPromptsResult, Orientation, VariationKey } from "@/lib/artwork-types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  let body: { concept?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const concept = (body.concept || "").trim();
  if (!concept) {
    return NextResponse.json({ error: "Provide an artwork concept." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await createWithRetry(client, {
      model: MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text:
            "You are the Artwork Orchestrator's prompt-drafting step: turn one artwork concept into three " +
            "print-oriented rendering directions — faithful, signature (subject only, style added separately), " +
            "and a wildcard reinterpretation. Write vivid, specific, print-worthy descriptive phrases. Never " +
            "include 'no text / no frame / no watermark' style boilerplate — that is appended by the caller.",
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [DRAFT_VARIATIONS_TOOL],
      tool_choice: { type: "tool", name: "submit_variations" },
      messages: [{ role: "user", content: `Concept: ${concept}` }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) {
      return NextResponse.json({ error: "Model did not return structured variations. Try again." }, { status: 502 });
    }

    const input = toolUse.input as {
      orientation: Orientation;
      faithfulSubject: string;
      signatureSubject: string;
      wildcardPreset: string;
      wildcardSubject: string;
    };

    const preset = QUICK_PRESETS.find((p) => p.name === input.wildcardPreset) ?? QUICK_PRESETS[0];

    const variations: { key: VariationKey; label: string; prompt: string; refs: string[] }[] = [
      {
        key: "faithful",
        label: "Faithful",
        prompt: `${input.faithfulSubject} — ${NO_TEXT_SPINE}`,
        refs: [],
      },
      {
        key: "signature",
        label: `Signature — ${HOUSE_STYLE.name}`,
        prompt:
          `${input.signatureSubject}, ${HOUSE_STYLE.description}, ${HOUSE_STYLE.antiContentGuard} — ${NO_TEXT_SPINE}`,
        refs: HOUSE_STYLE.refs,
      },
      {
        key: "wildcard",
        label: `Wildcard — ${preset.name}`,
        prompt: `${input.wildcardSubject}, ${preset.layer} — ${NO_TEXT_SPINE}`,
        refs: [],
      },
    ];

    const result: DraftPromptsResult = {
      runSlug: uniqueSlug(concept),
      orientation: input.orientation,
      variations,
    };

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 502 });
  }
}
