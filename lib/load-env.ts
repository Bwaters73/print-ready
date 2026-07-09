import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Loads .env.local from the project root into process.env if not already set.
 *
 * Next.js's built-in env loading depends on workspace-root auto-detection, which
 * picks the wrong directory when a stale package-lock.json sits above this
 * project. This is a defensive fallback that runs at module-load time on the
 * server. Safe to import multiple times — the loaded flag prevents reparses.
 */

let loaded = false;

export function loadEnvLocal(): void {
  if (loaded) return;
  loaded = true;

  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^["'](.*)["']$/, "$1");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();
