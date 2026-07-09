import "@/lib/load-env";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createWithRetry } from "@/lib/with-retry";
import { DRAFT_SEO_TOOL } from "@/lib/artwork-tool-schema";

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

  let body: { concept?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const concept = (body.concept || "").trim();
  const prompt = (body.prompt || "").trim();
  if (!concept || !prompt) {
    return NextResponse.json({ error: "Missing concept or prompt." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await createWithRetry(client, {
      model: MODEL,
      max_tokens: 1200,
      system: [
        {
          type: "text",
          text:
            "You write Etsy listing SEO for printable wall-art pieces. Title <=140 chars, front-loaded " +
            "keywords. 8-13 tags, each <=20 chars, no duplicate words across tags where avoidable. " +
            "Description is benefit-led and must mention it's an instant-download printable, 300 DPI, " +
            "and that no physical item ships.",
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [DRAFT_SEO_TOOL],
      tool_choice: { type: "tool", name: "submit_seo" },
      messages: [
        {
          role: "user",
          content: `Concept: ${concept}\n\nFinal render prompt used: ${prompt}`,
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) {
      return NextResponse.json({ error: "Model did not return SEO copy. Try again." }, { status: 502 });
    }

    const input = toolUse.input as {
      title: string;
      seoTitle: string;
      tags: string[];
      description: string;
    };

    return NextResponse.json({
      title: input.title,
      seo: { title: input.seoTitle, tags: input.tags, description: input.description },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 502 });
  }
}
