import { existsSync, readFileSync } from "node:fs";
import { AI_KEYS_ENV_FILE } from "@/lib/artwork-paths";

/**
 * Parses the `export KEY="value"` lines from ~/.config/ai-images/env (the artwork
 * orchestrator's key file, created by artwork-orchestrator-setup.sh). These keys
 * live outside .env.local on purpose (shared with the CLI skill flow), so Next's
 * normal env loading never sees them — we read the file directly and hand the
 * values to spawned python processes as extra env vars.
 */
/** Extracts a shell-style value: quoted values may be followed by a trailing
 * `# comment` (as in the setup.sh-generated template) which must NOT be included. */
function parseShellValue(raw: string): string {
  const trimmed = raw.trim();
  const quote = trimmed[0];
  if (quote === '"' || quote === "'") {
    const end = trimmed.indexOf(quote, 1);
    if (end !== -1) return trimmed.slice(1, end);
    return trimmed.slice(1);
  }
  const hashIdx = trimmed.indexOf("#");
  return (hashIdx === -1 ? trimmed : trimmed.slice(0, hashIdx)).trim();
}

export function loadArtworkKeys(): Record<string, string> {
  if (!existsSync(AI_KEYS_ENV_FILE)) return {};
  const out: Record<string, string> = {};
  const content = readFileSync(AI_KEYS_ENV_FILE, "utf-8");
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.startsWith("export ")) continue;
    const body = line.slice("export ".length);
    const eq = body.indexOf("=");
    if (eq === -1) continue;
    const key = body.slice(0, eq).trim();
    const value = parseShellValue(body.slice(eq + 1));
    if (key) out[key] = value;
  }
  return out;
}
