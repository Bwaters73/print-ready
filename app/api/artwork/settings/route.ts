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

  const houseStyles = body.houseStyles;
  const wildcardPresets = body.wildcardPresets;
  if (!Array.isArray(houseStyles) || houseStyles.length === 0) {
    return NextResponse.json({ error: "Keep at least one house style." }, { status: 400 });
  }
  const cleanStyles = houseStyles
    .map((s) => ({
      name: (s.name || "").trim(),
      description: (s.description || "").trim(),
      antiContentGuard: (s.antiContentGuard || "").trim(),
      refs: Array.isArray(s.refs) ? s.refs : [],
    }))
    .filter((s) => s.name && s.description);
  if (cleanStyles.length === 0) {
    return NextResponse.json({ error: "Each house style needs a name and description." }, { status: 400 });
  }
  const names = new Set(cleanStyles.map((s) => s.name));
  if (names.size !== cleanStyles.length) {
    return NextResponse.json({ error: "House style names must be unique." }, { status: 400 });
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

  const defaultHouseStyleName = cleanStyles.some((s) => s.name === body.defaultHouseStyleName)
    ? (body.defaultHouseStyleName as string)
    : cleanStyles[0].name;

  const settings: ArtworkSettings = {
    houseStyles: cleanStyles,
    defaultHouseStyleName,
    wildcardPresets: cleanPresets,
  };
  saveArtworkSettings(settings);
  return NextResponse.json({ settings });
}
