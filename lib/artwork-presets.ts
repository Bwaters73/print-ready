// Ported from .claude/skills/artwork-orchestrator/references/art-direction-presets.md
// and references/style-refs/plein-air-tonal-oil/style.md — kept as static, exact
// wording rather than re-derived by the model each run, since the spine/style block
// have been iterated on (see the skill's CHANGELOG) to avoid framed-mockup renders.

export const NO_TEXT_SPINE =
  "full-bleed artwork filling the entire image edge to edge, NOT a photo of a framed print, " +
  "no picture frame, no mat, no border, no wall, no room, no mockup, high detail, no text, " +
  "no watermark, no signature";

// Appended whenever a user-uploaded reference image is attached (Variations panel),
// so the model treats it as a style/technique guide and never reproduces its
// specific subject/content — same anti-content-guard pattern as HOUSE_STYLE below.
export const USER_REF_STYLE_GUARD =
  "Use the attached reference image ONLY as a style and technique guide — match its art style, " +
  "palette, linework, texture, lighting, and rendering technique. Do NOT reproduce the reference " +
  "image's specific subject, objects, or composition; render the requested subject only, as a new " +
  "and different image in that style.";

export const HOUSE_STYLE = {
  name: "Plein-air tonal oil",
  description:
    "painted as a small late-19th-century plein-air oil sketch on panel — somber muted tonal " +
    "palette of olive green, ochre, slate grey, umber and warm stone, soft grey overcast sky, " +
    "heavy textured impasto and visible directional palette-knife strokes, low contrast, " +
    "restrained and atmospheric, antique muted panel finish",
  antiContentGuard:
    "replicate ONLY the brushwork, palette, muted tone and panel texture of the reference — do " +
    "NOT include any farmhouse, buildings, cypress trees, or other content from the reference; " +
    "render the requested subject only",
  refs: [
    ".claude/skills/artwork-orchestrator/references/style-refs/plein-air-tonal-oil/ref-farmhouse.png",
    ".claude/skills/artwork-orchestrator/references/style-refs/plein-air-tonal-oil/ref-mountains.png",
  ],
};

export const QUICK_PRESETS: { name: string; layer: string }[] = [
  { name: "Japandi", layer: "matte minimalist, warm neutral palette (oatmeal, clay, soft black), negative space, natural light, fine grain, calm" },
  { name: "Vintage botanical", layer: "antique lithograph / engraving style, aged parchment tones, precise linework, muted sage & sepia, subtle foxing" },
  { name: "Mid-century abstract", layer: "bold geometric shapes, 1950s palette (mustard, teal, burnt orange, cream), flat matte color, clean hard edges" },
  { name: "Moody coastal", layer: "soft fog, low-contrast desaturated blue-greys, atmospheric depth, film-grain, quiet horizon" },
  { name: "Scandinavian line", layer: "single-weight continuous line art, off-white ground, charcoal line, airy, lots of breathing room" },
  { name: "Dark academia", layer: "oil-painting richness, deep umbers and forest greens, chiaroscuro lighting, classical, aged varnish" },
  { name: "Desert modern", layer: "warm terracotta & sand, high sun, long soft shadows, organic curves, sun-bleached matte finish" },
  { name: "Dreamy pastel", layer: "soft gradients, blush/lavender/mint, gentle bloom, low contrast, ethereal" },
  { name: "Bold graphic", layer: "high-contrast poster style, limited 3-color palette, strong silhouette, screen-print texture" },
  { name: "Fine-art watercolour", layer: "loose wet-on-wet washes, organic bleed, paper texture, gentle pigment pooling, white margins" },
];

export const SIZES: Record<"portrait" | "landscape", Record<string, [number, number]>> = {
  portrait: { "4x6": [4, 6], "5x7": [5, 7], "8x10": [8, 10], "11x14": [11, 14] },
  landscape: { "12x9": [12, 9], "20x16": [20, 16], "24x18": [24, 18], "36x24": [36, 24], A2: [23.39, 16.54] },
};

export const MODELS = [
  { alias: "nano-banana-pro", label: "Nano Banana Pro (Gemini 3 Pro, up to 4K) — default" },
  { alias: "nano-banana-2", label: "Nano Banana 2 (Gemini 3.1 Flash, fast/cheap)" },
  { alias: "gpt-image-2", label: "GPT Image 2 (OpenAI)" },
  { alias: "midjourney", label: "Midjourney (via your proxy — no --ref support yet)" },
];

export function slugify(text: string): string {
  const cleaned = text
    .replace(/[—–]/g, "-")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase();
  return cleaned.replace(/[\s_-]+/g, "-") || "untitled";
}
