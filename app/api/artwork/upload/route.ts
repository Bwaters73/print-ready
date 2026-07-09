import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { candidatesDirFor } from "@/lib/artwork-paths";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXT_FOR_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
};
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    // Reject oversized requests via the Content-Length header before buffering the
    // whole multipart body — avoids relying on any internal size limit that might
    // reject the raw request itself (with a non-JSON body) before our code runs.
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (25MB max)." }, { status: 413 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch (err) {
      return NextResponse.json(
        { error: `Could not read the upload (${err instanceof Error ? err.message : "unknown error"}).` },
        { status: 400 },
      );
    }

    const runSlug = form.get("runSlug");
    const labelRaw = form.get("label");
    const file = form.get("file");

    if (typeof runSlug !== "string" || !runSlug) {
      return NextResponse.json({ error: "Missing runSlug." }, { status: 400 });
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

    const label = (typeof labelRaw === "string" && labelRaw.trim()) || "custom";
    const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "custom";

    const dir = candidatesDirFor(runSlug);
    mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}_${safeLabel}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    writeFileSync(path.join(dir, filename), bytes);

    return NextResponse.json({ file: filename });
  } catch (err) {
    return NextResponse.json(
      { error: `Upload failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 500 },
    );
  }
}
