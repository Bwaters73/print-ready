import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { STYLE_REFS_ROOT } from "@/lib/artwork-settings";
import { toProjectRelative } from "@/lib/artwork-paths";
import { slugify } from "@/lib/artwork-presets";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXT_FOR_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
};
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (25MB max)." }, { status: 413 });
    }

    const form = await req.formData();
    const styleName = form.get("styleName");
    const file = form.get("file");

    if (typeof styleName !== "string" || !styleName.trim()) {
      return NextResponse.json({ error: "Missing style name." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file." }, { status: 400 });
    }
    const ext = EXT_FOR_TYPE[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: `Unsupported image type: ${file.type || "unknown"}. Use PNG or JPEG.` },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (25MB max)." }, { status: 413 });
    }

    const dir = path.join(STYLE_REFS_ROOT, slugify(styleName));
    mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}_ref${ext}`;
    const filePath = path.join(dir, filename);
    writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ path: toProjectRelative(filePath) });
  } catch (err) {
    return NextResponse.json(
      { error: `Upload failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 500 },
    );
  }
}
