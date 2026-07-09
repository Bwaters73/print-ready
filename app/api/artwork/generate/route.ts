import path from "node:path";
import { NextResponse } from "next/server";
import { GENERATE_PY, PROJECT_ROOT, candidatesDirFor } from "@/lib/artwork-paths";
import { runPython } from "@/lib/artwork-exec";
import type { Orientation } from "@/lib/artwork-types";

export const runtime = "nodejs";
export const maxDuration = 280;

const ASPECT: Record<Orientation, string> = { portrait: "4:5", landscape: "3:2" };

export async function POST(req: Request) {
  let body: {
    runSlug?: string;
    label?: string;
    prompt?: string;
    refs?: string[];
    orientation?: Orientation;
    n?: number;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { runSlug, label, prompt, orientation, refs = [], model = "nano-banana-pro" } = body;
  const n = Math.min(Math.max(body.n ?? 2, 1), 4);
  if (!runSlug || !label || !prompt || !orientation) {
    return NextResponse.json({ error: "Missing runSlug, label, prompt, or orientation." }, { status: 400 });
  }

  const outDir = candidatesDirFor(runSlug);
  const args = [
    prompt,
    "--model", model,
    "--aspect", ASPECT[orientation],
    "--n", String(n),
    "--label", label,
    "--out", outDir,
  ];
  for (const r of refs) {
    args.push("--ref", path.join(PROJECT_ROOT, r));
  }

  const result = await runPython(GENERATE_PY, args, 270_000);
  const outLines = (result.stdout + "\n" + result.stderr).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const files: string[] = [];
  const errors: string[] = [];
  for (const line of outLines) {
    if (line.startsWith("✓")) {
      const full = line.split("->")[1]?.trim();
      if (full) files.push(path.basename(full));
    } else if (line.startsWith("✗") || line.startsWith("!") || line.startsWith("~")) {
      errors.push(line.replace(/^[✗!~]\s*/, ""));
    }
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: errors.join(" ") || "Generation failed with no output. Check the server logs." },
      { status: 502 },
    );
  }

  return NextResponse.json({ files, warnings: errors });
}
