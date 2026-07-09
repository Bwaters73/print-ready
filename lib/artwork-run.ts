import { existsSync } from "node:fs";
import { runDirFor } from "@/lib/artwork-paths";
import { slugify } from "@/lib/artwork-presets";

/** Slugifies a concept/title into a run folder name, appending -2, -3, ... on collision. */
export function uniqueSlug(concept: string): string {
  const base = slugify(concept);
  let slug = base;
  let n = 2;
  while (existsSync(runDirFor(slug))) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}
