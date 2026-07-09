import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "@/lib/artwork-paths";
import { DEFAULT_HOUSE_STYLE, DEFAULT_WILDCARD_PRESETS } from "@/lib/artwork-presets";
import type { ArtworkSettings } from "@/lib/artwork-types";

// A global, user-editable default for the Signature house style + Wildcard preset
// pool (Style Settings in the UI) — persisted to disk so it survives across runs
// and restarts, distinct from the hardcoded seed values in lib/artwork-presets.ts
// which are only used the first time (before the user has saved anything).
export const SETTINGS_PATH = path.join(PROJECT_ROOT, "tooling", "artwork-style-settings.json");
export const STYLE_REFS_ROOT = path.join(PROJECT_ROOT, "tooling", "artwork-style-refs");

function defaults(): ArtworkSettings {
  return {
    houseStyle: { ...DEFAULT_HOUSE_STYLE },
    wildcardPresets: DEFAULT_WILDCARD_PRESETS.map((p) => ({ ...p })),
  };
}

export function loadArtworkSettings(): ArtworkSettings {
  if (!existsSync(SETTINGS_PATH)) return defaults();
  try {
    const raw = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
    const base = defaults();
    return {
      houseStyle: { ...base.houseStyle, ...raw.houseStyle },
      wildcardPresets: Array.isArray(raw.wildcardPresets) && raw.wildcardPresets.length > 0
        ? raw.wildcardPresets
        : base.wildcardPresets,
    };
  } catch {
    return defaults();
  }
}

export function saveArtworkSettings(settings: ArtworkSettings): void {
  mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}
