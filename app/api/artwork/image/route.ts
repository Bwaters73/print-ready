import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isInsideRunsRoot, runDirFor } from "@/lib/artwork-paths";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const run = searchParams.get("run");
  const rel = searchParams.get("rel");
  if (!run || !rel) return NextResponse.json({ error: "Missing run or rel." }, { status: 400 });

  const resolved = path.resolve(runDirFor(run), rel);
  if (!isInsideRunsRoot(resolved) || !existsSync(resolved)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });

  const data = readFileSync(resolved);
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
  });
}
