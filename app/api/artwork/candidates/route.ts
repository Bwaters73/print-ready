import { existsSync, readdirSync } from "node:fs";
import { NextResponse } from "next/server";
import { candidatesDirFor } from "@/lib/artwork-paths";

export const runtime = "nodejs";

function labelFor(filename: string): string {
  const stem = filename.replace(/\.png$/i, "");
  const after = stem.includes("_") ? stem.split("_").slice(1).join("_") : stem;
  return after.split("-")[0] || "candidate";
}

export async function GET(req: Request) {
  const run = new URL(req.url).searchParams.get("run");
  if (!run) return NextResponse.json({ error: "Missing run." }, { status: 400 });

  const dir = candidatesDirFor(run);
  if (!existsSync(dir)) return NextResponse.json({ candidates: [] });

  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));
  const candidates = files
    .map((file) => ({ file, label: labelFor(file) }))
    .sort((a, b) => a.file.localeCompare(b.file));

  return NextResponse.json({ candidates });
}
