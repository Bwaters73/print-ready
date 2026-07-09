import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { RUNS_ROOT } from "@/lib/artwork-paths";

export const runtime = "nodejs";

export async function GET() {
  if (!existsSync(RUNS_ROOT)) return NextResponse.json({ runs: [] });

  const slugs = readdirSync(RUNS_ROOT).filter((f) => statSync(path.join(RUNS_ROOT, f)).isDirectory());
  const runs = slugs.map((slug) => {
    const runJsonPath = path.join(RUNS_ROOT, slug, "run.json");
    if (existsSync(runJsonPath)) {
      const run = JSON.parse(readFileSync(runJsonPath, "utf-8"));
      return { slug, pieceCount: run.piece_count ?? 0, generatedAt: run.generated_at ?? null, finalized: true };
    }
    return { slug, pieceCount: 0, generatedAt: null, finalized: false };
  });

  runs.sort((a, b) => b.slug.localeCompare(a.slug));
  return NextResponse.json({ runs });
}
