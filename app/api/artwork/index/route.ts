import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { ARTWORK_PY, PROJECT_ROOT, runDirFor } from "@/lib/artwork-paths";
import { runPython } from "@/lib/artwork-exec";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { runSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { runSlug } = body;
  if (!runSlug) return NextResponse.json({ error: "Missing runSlug." }, { status: 400 });

  const runDir = runDirFor(runSlug);
  const runDirRel = path.relative(PROJECT_ROOT, runDir).split(path.sep).join("/");

  const result = await runPython(ARTWORK_PY, ["index", runDirRel]);
  if (!result.ok) {
    return NextResponse.json({ error: (result.stderr || result.stdout || "index failed").trim() }, { status: 502 });
  }

  const runJsonPath = path.join(runDir, "run.json");
  const runJson = existsSync(runJsonPath) ? JSON.parse(readFileSync(runJsonPath, "utf-8")) : null;

  return NextResponse.json({ run: runJson });
}
