import path from "node:path";

// All paths are anchored to the Next.js project root (process.cwd()), matching the
// layout the artwork-orchestrator skill's SKILL.md documents (paths relative to repo root).
export const PROJECT_ROOT = process.cwd();
export const VENV_DIR = path.join(PROJECT_ROOT, "tooling", "ad-creatives", ".venv");
export const PYTHON_BIN = path.join(
  VENV_DIR,
  process.platform === "win32" ? "bin/python.exe" : "bin/python",
);
export const GENERATE_PY = path.join(PROJECT_ROOT, "tooling", "ad-creatives", "generate.py");
export const ARTWORK_PY = path.join(
  PROJECT_ROOT,
  ".claude",
  "skills",
  "artwork-orchestrator",
  "scripts",
  "artwork.py",
);
export const RUNS_ROOT = path.join(
  PROJECT_ROOT,
  "tooling",
  "digital-product-research",
  "artwork-runs",
);
export const STYLE_REFS_DIR = path.join(
  PROJECT_ROOT,
  ".claude",
  "skills",
  "artwork-orchestrator",
  "references",
  "style-refs",
);
export const AI_KEYS_ENV_FILE = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".config",
  "ai-images",
  "env",
);

export function runDirFor(slug: string): string {
  return path.join(RUNS_ROOT, slug);
}

export function candidatesDirFor(slug: string): string {
  return path.join(runDirFor(slug), "_candidates");
}

export function refsDirFor(slug: string): string {
  return path.join(runDirFor(slug), "_refs");
}

/** PROJECT_ROOT-relative path (forward slashes), suitable for --ref args passed to generate.py. */
export function toProjectRelative(absolutePath: string): string {
  return path.relative(PROJECT_ROOT, absolutePath).split(path.sep).join("/");
}

/** Guard against path traversal: resolved path must live inside RUNS_ROOT. */
export function isInsideRunsRoot(resolved: string): boolean {
  const rel = path.relative(RUNS_ROOT, resolved);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
