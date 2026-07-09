export type Orientation = "portrait" | "landscape";

export type VariationKey = "faithful" | "signature" | "wildcard";

export type DraftedVariation = {
  key: VariationKey;
  label: string;
  prompt: string;
  refs: string[];
};

export type DraftPromptsResult = {
  runSlug: string;
  orientation: Orientation;
  variations: DraftedVariation[];
};

export type Candidate = {
  file: string; // filename only, inside _candidates/
  label: string; // faithful / signature / wildcard / wildcard-v2 ...
};

export type SeoDraft = {
  title: string;
  tags: string[];
  description: string;
};

export type FinalizedPiece = {
  title: string;
  slug: string;
  folder: string;
  prints: string[]; // filenames inside <slug>/prints/
};

export type HouseStyleSettings = {
  name: string;
  description: string;
  antiContentGuard: string;
  refs: string[]; // project-root-relative paths
};

export type WildcardPreset = {
  name: string;
  layer: string;
};

export type ArtworkSettings = {
  houseStyles: HouseStyleSettings[];
  defaultHouseStyleName: string; // must match one of houseStyles[].name
  wildcardPresets: WildcardPreset[];
};
