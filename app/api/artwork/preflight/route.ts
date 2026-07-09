import { NextResponse } from "next/server";
import { ARTWORK_PY } from "@/lib/artwork-paths";
import { runPython } from "@/lib/artwork-exec";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const result = await runPython(ARTWORK_PY, ["preflight"], 20_000);
  const lines = (result.stdout + result.stderr)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return NextResponse.json({ ok: result.ok, lines });
}
