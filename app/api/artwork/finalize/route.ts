import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { ARTWORK_PY, PROJECT_ROOT, runDirFor } from "@/lib/artwork-paths";
import { runPython } from "@/lib/artwork-exec";
import { slugify } from "@/lib/artwork-presets";
import type { Orientation, SeoDraft } from "@/lib/artwork-types";

export const runtime = "nodejs";
export const maxDuration = 280;

export async function POST(req: Request) {
  let body: {
    runSlug?: string;
    title?: string;
    candidateFile?: string;
    orientation?: Orientation;
    sizes?: string[] | "all";
    model?: string;
    prompt?: string;
    seo?: SeoDraft;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { runSlug, title, candidateFile, orientation, model, seo } = body;
  const sizes = body.sizes ?? "all";
  // prompt is descriptive metadata only (written to prompt.txt/meta.json) — a
  // Bring Your Own Image piece legitimately has none, so it's optional here.
  const prompt = body.prompt || "(no prompt — user-supplied image)";
  if (!runSlug || !title || !candidateFile || !orientation || !seo) {
    return NextResponse.json({ error: "Missing required piece fields." }, { status: 400 });
  }

  const runDir = runDirFor(runSlug);
  const runDirRel = path.relative(PROJECT_ROOT, runDir).split(path.sep).join("/");
  const sourceRel = `${runDirRel}/_candidates/${candidateFile}`;
  if (!existsSync(path.join(PROJECT_ROOT, sourceRel))) {
    return NextResponse.json({ error: `Source candidate not found: ${candidateFile}` }, { status: 404 });
  }

  const piece = {
    run_dir: runDirRel,
    title,
    source_image: sourceRel,
    orientation,
    sizes,
    model: model || "nano-banana-pro",
    prompt,
    upscale: 4,
    seo: { title: seo.title, tags: seo.tags, description: seo.description },
  };

  const piecesDir = path.join(runDir, "_pieces");
  mkdirSync(piecesDir, { recursive: true });
  const pieceSlug = slugify(title);
  const pieceJsonPath = path.join(piecesDir, `${pieceSlug}.json`);
  writeFileSync(pieceJsonPath, JSON.stringify(piece, null, 2));

  const result = await runPython(ARTWORK_PY, ["finalize", pieceJsonPath]);
  if (!result.ok) {
    return NextResponse.json(
      { error: (result.stderr || result.stdout || "finalize failed").trim() },
      { status: 502 },
    );
  }

  const pieceDir = path.join(runDir, pieceSlug);
  const printsDir = path.join(pieceDir, "prints");
  const prints = existsSync(printsDir) ? readdirSync(printsDir).filter((f) => f.endsWith(".jpg")) : [];

  return NextResponse.json({
    piece: { title, slug: pieceSlug, folder: `${runSlug}/${pieceSlug}`, prints },
    log: result.stdout,
  });
}
