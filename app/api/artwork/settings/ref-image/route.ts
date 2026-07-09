import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PROJECT_ROOT, STYLE_REFS_DIR } from "@/lib/artwork-paths";
import { STYLE_REFS_ROOT } from "@/lib/artwork-settings";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

// House style refs can live in either the shipped defaults (.claude/skills/.../style-refs/)
// or the user-uploaded location (tooling/artwork-style-refs/) — allow both roots.
function isAllowed(resolved: string): boolean {
  for (const root of [STYLE_REFS_ROOT, STYLE_REFS_DIR]) {
    const rel = path.relative(root, resolved);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) return true;
  }
  return false;
}

export async function GET(req: Request) {
  const rel = new URL(req.url).searchParams.get("path");
  if (!rel) return NextResponse.json({ error: "Missing path." }, { status: 400 });

  const resolved = path.resolve(PROJECT_ROOT, rel);
  if (!isAllowed(resolved) || !existsSync(resolved)) {
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
