import { NextResponse } from "next/server";
import { loadArtworkSettings, saveArtworkSettings } from "@/lib/artwork-settings";
import type { ArtworkSettings } from "@/lib/artwork-types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ settings: loadArtworkSettings() });
}

export async function PUT(req: Request) {
  let body: Partial<ArtworkSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const houseStyle = body.houseStyle;
  const wildcardPresets = body.wildcardPresets;
  if (!houseStyle || !houseStyle.name?.trim() || !houseStyle.description?.trim()) {
    return NextResponse.json({ error: "House style needs a name and description." }, { status: 400 });
  }
  if (!Array.isArray(wildcardPresets) || wildcardPresets.length === 0) {
    return NextResponse.json({ error: "Keep at least one wildcard preset." }, { status: 400 });
  }
  const cleanPresets = wildcardPresets
    .map((p) => ({ name: (p.name || "").trim(), layer: (p.layer || "").trim() }))
    .filter((p) => p.name && p.layer);
  if (cleanPresets.length === 0) {
    return NextResponse.json({ error: "Keep at least one wildcard preset with a name and description." }, { status: 400 });
  }

  const settings: ArtworkSettings = {
    houseStyle: {
      name: houseStyle.name.trim(),
      description: houseStyle.description.trim(),
      antiContentGuard: (houseStyle.antiContentGuard || "").trim(),
      refs: Array.isArray(houseStyle.refs) ? houseStyle.refs : [],
    },
    wildcardPresets: cleanPresets,
  };
  saveArtworkSettings(settings);
  return NextResponse.json({ settings });
}
