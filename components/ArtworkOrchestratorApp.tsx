"use client";

import { useEffect, useState } from "react";
import Shell from "./Shell";
import { MODELS, SIZES } from "@/lib/artwork-presets";
import type {
  Candidate,
  DraftPromptsResult,
  FinalizedPiece,
  Orientation,
  SeoDraft,
  VariationKey,
} from "@/lib/artwork-types";

type GenStatus = "idle" | "pending" | "ok" | "error";

type KeeperState = {
  title: string;
  seo: SeoDraft | null;
  sizesMode: "all" | "custom";
  customSizes: Record<string, boolean>;
  draftingSeo: boolean;
  seoError: string | null;
  finalizing: boolean;
  finalizeError: string | null;
  finalized: FinalizedPiece | null;
};

type RunSummary = {
  slug: string;
  pieceCount: number;
  generatedAt: string | null;
  finalized: boolean;
};

function defaultKeeper(): KeeperState {
  return {
    title: "",
    seo: null,
    sizesMode: "all",
    customSizes: {},
    draftingSeo: false,
    seoError: null,
    finalizing: false,
    finalizeError: null,
    finalized: null,
  };
}

function imageUrl(run: string, rel: string): string {
  return `/api/artwork/image?run=${encodeURIComponent(run)}&rel=${encodeURIComponent(rel)}`;
}

/** Reads a fetch Response as JSON, but if the body isn't valid JSON (e.g. a raw
 * "413 Request Entity Too Large" text page from a server/proxy in front of the app),
 * throws a clear error with the status code and a snippet of the real body instead
 * of letting JSON.parse's opaque "Unexpected token" bubble up. */
async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 200).trim() || "(empty body)";
    throw new Error(`Server returned a non-JSON response (HTTP ${res.status}): ${snippet}`);
  }
}

export default function ArtworkOrchestratorApp() {
  const [preflight, setPreflight] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [pastRuns, setPastRuns] = useState<RunSummary[]>([]);

  const [concept, setConcept] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPromptsResult | null>(null);
  const [selected, setSelected] = useState<Record<VariationKey, boolean>>({
    faithful: true,
    signature: true,
    wildcard: true,
  });
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [nPerVariation, setNPerVariation] = useState(2);
  const [model, setModel] = useState("nano-banana-pro");

  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<Record<string, GenStatus>>({});
  const [genError, setGenError] = useState<Record<string, string>>({});

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [keepers, setKeepers] = useState<Record<string, KeeperState>>({});

  const [indexing, setIndexing] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [indexDone, setIndexDone] = useState(false);

  const [byoTitle, setByoTitle] = useState("");
  const [byoOrientation, setByoOrientation] = useState<Orientation>("portrait");
  const [byoUploading, setByoUploading] = useState(false);
  const [byoError, setByoError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/artwork/preflight").then((r) => r.json()).then(setPreflight).catch(() => {});
    refreshPastRuns();
  }, []);

  function refreshPastRuns() {
    fetch("/api/artwork/runs")
      .then((r) => r.json())
      .then((d) => setPastRuns(d.runs ?? []))
      .catch(() => {});
  }

  async function refreshCandidates(runSlug: string) {
    const res = await fetch(`/api/artwork/candidates?run=${encodeURIComponent(runSlug)}`);
    const data = await parseJsonResponse(res);
    setCandidates(data.candidates ?? []);
  }

  async function handleByoFiles(files: File[]) {
    if (!files.length || byoUploading) return;
    setByoError(null);

    let runSlug = draft?.runSlug;
    const orientation = draft?.orientation ?? byoOrientation;

    if (!runSlug) {
      if (!byoTitle.trim()) {
        setByoError("Give this run a title first.");
        return;
      }
      setByoUploading(true);
      try {
        const res = await fetch("/api/artwork/start-run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ concept: byoTitle.trim(), orientation: byoOrientation }),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          setByoError(data.error || "Could not start a run.");
          setByoUploading(false);
          return;
        }
        runSlug = data.runSlug as string;
        setDraft({ runSlug, orientation: data.orientation, variations: [] });
        setConcept(byoTitle.trim());
        setCandidates([]);
        setKeepers({});
        setIndexDone(false);
      } catch (err) {
        setByoError(err instanceof Error ? err.message : "Network error.");
        setByoUploading(false);
        return;
      }
    } else {
      setByoUploading(true);
    }

    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("runSlug", runSlug);
        form.append("label", "custom");
        const res = await fetch("/api/artwork/upload", { method: "POST", body: form });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          setByoError(data.error || `Upload failed for ${file.name}.`);
        }
      }
      await refreshCandidates(runSlug);
      setByoTitle("");
    } catch (err) {
      setByoError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setByoUploading(false);
    }
  }

  async function handleDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!concept.trim() || drafting) return;
    setDrafting(true);
    setDraftError(null);
    setDraft(null);
    setCandidates([]);
    setKeepers({});
    setIndexDone(false);
    try {
      const res = await fetch("/api/artwork/draft-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ concept: concept.trim() }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        setDraftError(data.error || "Something went wrong.");
        return;
      }
      const result = data.result as DraftPromptsResult;
      setDraft(result);
      setSelected({ faithful: true, signature: true, wildcard: true });
      setPrompts(Object.fromEntries(result.variations.map((v) => [v.key, v.prompt])));
      setGenStatus({});
      setGenError({});
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setDrafting(false);
    }
  }

  async function generateOne(key: VariationKey) {
    if (!draft) return;
    const variation = draft.variations.find((v) => v.key === key);
    if (!variation) return;
    setGenStatus((s) => ({ ...s, [key]: "pending" }));
    setGenError((s) => ({ ...s, [key]: "" }));
    try {
      const res = await fetch("/api/artwork/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runSlug: draft.runSlug,
          label: key,
          prompt: prompts[key] ?? variation.prompt,
          refs: variation.refs,
          orientation: draft.orientation,
          n: nPerVariation,
          model,
        }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        setGenStatus((s) => ({ ...s, [key]: "error" }));
        setGenError((s) => ({ ...s, [key]: data.error || "Generation failed." }));
        return;
      }
      setGenStatus((s) => ({ ...s, [key]: "ok" }));
      await refreshCandidates(draft.runSlug);
    } catch (err) {
      setGenStatus((s) => ({ ...s, [key]: "error" }));
      setGenError((s) => ({ ...s, [key]: err instanceof Error ? err.message : "Network error." }));
    }
  }

  async function handleGenerateSelected() {
    if (!draft || generating) return;
    setGenerating(true);
    const keys = draft.variations.map((v) => v.key).filter((k) => selected[k]);
    for (const key of keys) {
      await generateOne(key);
    }
    setGenerating(false);
  }

  function toggleKeeper(file: string) {
    setKeepers((prev) => {
      const next = { ...prev };
      if (next[file]) {
        delete next[file];
      } else {
        const candidate = candidates.find((c) => c.file === file);
        next[file] = { ...defaultKeeper(), title: candidate?.label ?? "" };
      }
      return next;
    });
  }

  function updateKeeper(file: string, patch: Partial<KeeperState>) {
    setKeepers((prev) => (prev[file] ? { ...prev, [file]: { ...prev[file], ...patch } } : prev));
  }

  async function handleDraftSeo(file: string, candidateLabel: string) {
    if (!draft) return;
    updateKeeper(file, { draftingSeo: true, seoError: null });
    try {
      const usedPrompt =
        prompts[candidateLabel] || draft.variations.find((v) => v.key === candidateLabel)?.prompt || concept;
      const res = await fetch("/api/artwork/draft-seo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ concept, prompt: usedPrompt }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        updateKeeper(file, { draftingSeo: false, seoError: data.error || "Failed to draft SEO." });
        return;
      }
      updateKeeper(file, { draftingSeo: false, title: data.title, seo: data.seo });
    } catch (err) {
      updateKeeper(file, {
        draftingSeo: false,
        seoError: err instanceof Error ? err.message : "Network error.",
      });
    }
  }

  async function handleFinalize(file: string) {
    if (!draft) return;
    const keeper = keepers[file];
    if (!keeper || !keeper.title.trim() || !keeper.seo) return;
    updateKeeper(file, { finalizing: true, finalizeError: null });
    const sizes =
      keeper.sizesMode === "all"
        ? "all"
        : Object.entries(keeper.customSizes)
            .filter(([, v]) => v)
            .map(([k]) => k);
    const candidateLabel = candidates.find((c) => c.file === file)?.label ?? "faithful";
    const usedPrompt =
      prompts[candidateLabel] ||
      draft.variations.find((v) => v.key === candidateLabel)?.prompt ||
      concept ||
      "(no prompt — user-supplied image)";
    try {
      const res = await fetch("/api/artwork/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runSlug: draft.runSlug,
          title: keeper.title.trim(),
          candidateFile: file,
          orientation: draft.orientation,
          sizes,
          model,
          prompt: usedPrompt,
          seo: keeper.seo,
        }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        updateKeeper(file, { finalizing: false, finalizeError: data.error || "Finalize failed." });
        return;
      }
      updateKeeper(file, { finalizing: false, finalized: data.piece });
    } catch (err) {
      updateKeeper(file, {
        finalizing: false,
        finalizeError: err instanceof Error ? err.message : "Network error.",
      });
    }
  }

  async function handleBuildIndex() {
    if (!draft) return;
    setIndexing(true);
    setIndexError(null);
    try {
      const res = await fetch("/api/artwork/index", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runSlug: draft.runSlug }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        setIndexError(data.error || "Index build failed.");
        return;
      }
      setIndexDone(true);
      refreshPastRuns();
    } catch (err) {
      setIndexError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setIndexing(false);
    }
  }

  const finalizedCount = Object.values(keepers).filter((k) => k.finalized).length;

  return (
    <Shell>
      <Hero />
      {preflight && !preflight.ok && (
        <div className="mt-8 paper px-5 py-4 border-l-2 border-terra space-y-1 print:hidden">
          <div className="label text-terra mb-1">Preflight failed</div>
          {preflight.lines.map((l, i) => (
            <p key={i} className="mono text-[12px] text-ink-mid">{l}</p>
          ))}
        </div>
      )}

      {pastRuns.length > 0 && <PastRuns runs={pastRuns} />}

      <form onSubmit={handleDraft} className="mt-12 grid grid-cols-12 gap-6 reveal reveal-2 print:hidden">
        <div className="col-span-12 lg:col-span-8 space-y-2">
          <label className="label block mb-2" htmlFor="artwork-concept">
            Artwork concept
          </label>
          <input
            id="artwork-concept"
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="misty Pacific Northwest forest at dawn, muted greens"
            className="w-full paper rounded-none px-5 py-4 body-serif text-[15px] text-ink placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-ink/30"
          />
          <p className="marginalia mt-2">
            One concept you already have in mind. Claude drafts three rendering directions — faithful,
            the house signature style, and a wildcard — for you to pick from before anything generates.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 pt-7">
          <button
            type="submit"
            disabled={drafting || !concept.trim()}
            className="press-btn w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {drafting ? (
              <>
                <span className="inline-block w-3 h-3 border border-paper/40 border-t-paper rounded-full animate-spin" />
                Drafting variations…
              </>
            ) : (
              "Draft Variations →"
            )}
          </button>
        </div>
      </form>

      {draftError && (
        <div className="mt-6 paper px-5 py-4 border-l-2 border-terra print:hidden">
          <p className="body-serif text-[15px] text-ink-soft">{draftError}</p>
        </div>
      )}

      <ByoPanel
        hasRun={!!draft}
        title={byoTitle}
        setTitle={setByoTitle}
        orientation={byoOrientation}
        setOrientation={setByoOrientation}
        uploading={byoUploading}
        error={byoError}
        onFiles={handleByoFiles}
      />

      {draft && draft.variations.length > 0 && (
        <VariationsPanel
          draft={draft}
          selected={selected}
          setSelected={setSelected}
          prompts={prompts}
          setPrompts={setPrompts}
          n={nPerVariation}
          setN={setNPerVariation}
          model={model}
          setModel={setModel}
          generating={generating}
          genStatus={genStatus}
          genError={genError}
          onGenerate={handleGenerateSelected}
          onRegenerate={generateOne}
        />
      )}

      {draft && candidates.length > 0 && (
        <ReviewGallery
          runSlug={draft.runSlug}
          candidates={candidates}
          keepers={keepers}
          onToggle={toggleKeeper}
          onUpdate={updateKeeper}
          onDraftSeo={handleDraftSeo}
          onFinalize={handleFinalize}
          orientation={draft.orientation}
        />
      )}

      {finalizedCount > 0 && (
        <div className="mt-16 reveal">
          <div className="flex items-baseline gap-6 mb-8">
            <span className="display section-head text-4xl">Run Index</span>
            <span className="rule flex-1 mb-1" />
          </div>
          <p className="marginalia mb-4">
            {finalizedCount} piece{finalizedCount === 1 ? "" : "s"} finalized. Build the run index once
            you&rsquo;re done finalizing keepers — it writes index.md and run.json alongside the folders.
          </p>
          <button
            type="button"
            onClick={handleBuildIndex}
            disabled={indexing}
            className="press-btn disabled:opacity-40"
          >
            {indexing ? "Building index…" : indexDone ? "Rebuild Index" : "Build Run Index →"}
          </button>
          {indexError && <p className="marginalia text-terra mt-3">{indexError}</p>}
          {indexDone && (
            <p className="marginalia mt-3">
              Saved to <span className="mono">tooling/digital-product-research/artwork-runs/{draft?.runSlug}/index.md</span>
            </p>
          )}
        </div>
      )}
    </Shell>
  );
}

function Hero() {
  return (
    <section className="pt-8 reveal reveal-1 print:hidden">
      <div className="grid grid-cols-12 gap-6 items-end">
        <div className="col-span-12 lg:col-span-9">
          <div className="flex items-center gap-3 mb-7">
            <span className="stamp stamp-terra">Artwork Studio</span>
            <span className="stamp stamp-ochre">Local generation</span>
            <span className="stamp stamp-slate">Concept → print-ready listing</span>
          </div>
          <h2 className="display text-[64px] sm:text-[100px] xl:text-[124px] leading-[0.82] tracking-ultra-tight">
            One Concept.
            <br />
            <span className="display-italic text-terra inline-block -mt-2">Print-Ready Folders.</span>
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-3 lg:pb-6">
          <div className="rule mb-4" />
          <p className="body-serif text-[15px] leading-relaxed text-ink-soft drop-cap">
            Draft three rendering directions, generate locally, pick your keepers, then upscale, crop to
            print sizes, and write listing SEO — all without leaving this page.
          </p>
        </div>
      </div>
    </section>
  );
}

function PastRuns({ runs }: { runs: RunSummary[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-10 print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="label flex items-center gap-2 hover:text-ink"
      >
        <span>{open ? "▾" : "▸"}</span> Past runs ({runs.length})
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {runs.map((r) => (
            <div key={r.slug} className="paper-cool px-5 py-4">
              <div className="body-serif text-[15px] text-ink mb-1">{r.slug}</div>
              <div className="label">
                {r.finalized ? `${r.pieceCount} piece${r.pieceCount === 1 ? "" : "s"}` : "in progress"}
              </div>
              {r.generatedAt && (
                <div className="marginalia mt-1">
                  {new Date(r.generatedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ByoPanel({
  hasRun,
  title,
  setTitle,
  orientation,
  setOrientation,
  uploading,
  error,
  onFiles,
}: {
  hasRun: boolean;
  title: string;
  setTitle: (t: string) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  uploading: boolean;
  error: string | null;
  onFiles: (files: File[]) => void;
}) {
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) onFiles(files);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = "";
  }

  return (
    <div className="mt-10 paper px-5 py-5 print:hidden">
      <div className="flex items-baseline justify-between mb-3">
        <span className="label">Bring your own image</span>
        <span className="marginalia">Made it yourself in Midjourney or another model? Drop it in here.</span>
      </div>

      {!hasRun && (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-4">
          <div className="sm:col-span-8">
            <label className="label block mb-2" htmlFor="byo-title">Title for this run</label>
            <input
              id="byo-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="lighthouse at sunset"
              className="w-full paper-cool rounded-none px-4 py-3 body-serif text-[14px] text-ink placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-ink/30"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="label block mb-2" htmlFor="byo-orientation">Orientation</label>
            <select
              id="byo-orientation"
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as Orientation)}
              className="w-full paper-cool rounded-none px-4 py-3 body-serif text-[14px] text-ink focus:outline-none focus:ring-1 focus:ring-ink/30"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>
      )}

      <div
        tabIndex={0}
        onPaste={handlePaste}
        className="paper-cool px-5 py-8 text-center outline-none focus:ring-1 focus:ring-ink/30 cursor-text"
      >
        <p className="marginalia mb-3">Click here, then paste (Ctrl+V) an image — or choose a file</p>
        <label className="ghost-btn inline-flex cursor-pointer">
          {uploading ? "Uploading…" : "Choose image(s)"}
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={handleInput}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {error && <p className="marginalia text-terra mt-3">{error}</p>}
    </div>
  );
}

function VariationsPanel({
  draft,
  selected,
  setSelected,
  prompts,
  setPrompts,
  n,
  setN,
  model,
  setModel,
  generating,
  genStatus,
  genError,
  onGenerate,
  onRegenerate,
}: {
  draft: DraftPromptsResult;
  selected: Record<VariationKey, boolean>;
  setSelected: React.Dispatch<React.SetStateAction<Record<VariationKey, boolean>>>;
  prompts: Record<string, string>;
  setPrompts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  n: number;
  setN: (n: number) => void;
  model: string;
  setModel: (m: string) => void;
  generating: boolean;
  genStatus: Record<string, GenStatus>;
  genError: Record<string, string>;
  onGenerate: () => void;
  onRegenerate: (key: VariationKey) => void;
}) {
  const anySelected = draft.variations.some((v) => selected[v.key]);
  return (
    <div className="mt-16 reveal print:hidden">
      <div className="flex items-baseline gap-6 mb-8">
        <span className="display section-head text-4xl">Variations</span>
        <span className="rule flex-1 mb-1" />
        <span className="label">{draft.orientation}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {draft.variations.map((v) => {
          const status = genStatus[v.key] ?? "idle";
          return (
            <div key={v.key} className="paper px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 label">
                  <input
                    type="checkbox"
                    checked={selected[v.key] ?? false}
                    onChange={(e) => setSelected((s) => ({ ...s, [v.key]: e.target.checked }))}
                  />
                  {v.label}
                </label>
                {status === "ok" && <span className="stamp stamp-forest">Generated</span>}
                {status === "pending" && <span className="stamp stamp-ochre">Working…</span>}
                {status === "error" && <span className="stamp stamp-terra">Failed</span>}
              </div>
              <textarea
                value={prompts[v.key] ?? v.prompt}
                onChange={(e) => setPrompts((p) => ({ ...p, [v.key]: e.target.value }))}
                rows={6}
                className="w-full paper-cool rounded-none px-3 py-3 body-serif text-[13px] text-ink-soft focus:outline-none focus:ring-1 focus:ring-ink/30 resize-y"
              />
              {status === "ok" && (
                <button
                  type="button"
                  onClick={() => onRegenerate(v.key)}
                  className="ghost-btn self-start"
                  disabled={generating}
                >
                  Regenerate this one
                </button>
              )}
              {status === "error" && genError[v.key] && (
                <p className="marginalia text-terra">{genError[v.key]}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className="label block mb-2" htmlFor="artwork-n">Images per variation</label>
          <input
            id="artwork-n"
            type="number"
            min={1}
            max={4}
            value={n}
            onChange={(e) => setN(Math.min(4, Math.max(1, Number(e.target.value) || 1)))}
            className="paper rounded-none px-4 py-2 w-24 body-serif text-[14px] text-ink focus:outline-none focus:ring-1 focus:ring-ink/30"
          />
        </div>
        <div>
          <label className="label block mb-2" htmlFor="artwork-model">Model</label>
          <select
            id="artwork-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="paper rounded-none px-4 py-2 body-serif text-[14px] text-ink focus:outline-none focus:ring-1 focus:ring-ink/30"
          >
            {MODELS.map((m) => (
              <option key={m.alias} value={m.alias}>{m.label}</option>
            ))}
          </select>
          {model === "midjourney" && (
            <p className="marginalia mt-2 max-w-[260px]">
              Midjourney (via your proxy) can&rsquo;t use the house-style reference images —
              uncheck Signature or it will fail.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || !anySelected}
          className="press-btn disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <span className="inline-block w-3 h-3 border border-paper/40 border-t-paper rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            "Generate Selected →"
          )}
        </button>
      </div>
    </div>
  );
}

function ReviewGallery({
  runSlug,
  candidates,
  keepers,
  onToggle,
  onUpdate,
  onDraftSeo,
  onFinalize,
  orientation,
}: {
  runSlug: string;
  candidates: Candidate[];
  keepers: Record<string, KeeperState>;
  onToggle: (file: string) => void;
  onUpdate: (file: string, patch: Partial<KeeperState>) => void;
  onDraftSeo: (file: string, label: string) => void;
  onFinalize: (file: string) => void;
  orientation: Orientation;
}) {
  const sizeOptions = Object.keys(SIZES[orientation]);
  return (
    <div className="mt-16 reveal print:hidden">
      <div className="flex items-baseline gap-6 mb-8">
        <span className="display section-head text-4xl">Review Candidates</span>
        <span className="rule flex-1 mb-1" />
        <span className="label">{candidates.length} rendered</span>
      </div>
      <p className="marginalia mb-6">
        Check the ones worth keeping. Each keeper gets its own title, SEO copy, and a Finalize step
        (4× upscale → 300-DPI print crops → titled folder).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((c) => {
          const keeper = keepers[c.file];
          const isKept = !!keeper;
          return (
            <div key={c.file} className={`paper overflow-hidden ${isKept ? "ring-1 ring-terra" : ""}`}>
              <img
                src={imageUrl(runSlug, `_candidates/${c.file}`)}
                alt={c.label}
                className="w-full block bg-black"
                loading="lazy"
              />
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="label">{c.label}</span>
                  <label className="flex items-center gap-2 label">
                    <input type="checkbox" checked={isKept} onChange={() => onToggle(c.file)} />
                    Keep
                  </label>
                </div>

                {isKept && keeper && (
                  <div className="space-y-3 border-t border-ink/10 pt-3">
                    <div>
                      <label className="label block mb-1">Title</label>
                      <input
                        type="text"
                        value={keeper.title}
                        onChange={(e) => onUpdate(c.file, { title: e.target.value })}
                        placeholder="Dawn Cathedral — Misty Forest Print"
                        className="w-full paper-cool rounded-none px-3 py-2 body-serif text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-ink/30"
                      />
                    </div>

                    {!keeper.seo ? (
                      <button
                        type="button"
                        onClick={() => onDraftSeo(c.file, c.label)}
                        disabled={keeper.draftingSeo}
                        className="ghost-btn w-full justify-center"
                      >
                        {keeper.draftingSeo ? "Drafting SEO…" : "Draft Title + SEO →"}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="label block mb-1">Listing title ({keeper.seo.title.length}/140)</label>
                          <textarea
                            value={keeper.seo.title}
                            onChange={(e) => onUpdate(c.file, { seo: { ...keeper.seo!, title: e.target.value } })}
                            rows={2}
                            className="w-full paper-cool rounded-none px-3 py-2 body-serif text-[12.5px] text-ink-soft resize-y focus:outline-none focus:ring-1 focus:ring-ink/30"
                          />
                        </div>
                        <div>
                          <label className="label block mb-1">Tags ({keeper.seo.tags.length}/13)</label>
                          <input
                            type="text"
                            value={keeper.seo.tags.join(", ")}
                            onChange={(e) =>
                              onUpdate(c.file, {
                                seo: { ...keeper.seo!, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) },
                              })
                            }
                            className="w-full paper-cool rounded-none px-3 py-2 body-serif text-[12.5px] text-ink-soft focus:outline-none focus:ring-1 focus:ring-ink/30"
                          />
                        </div>
                        <div>
                          <label className="label block mb-1">Description</label>
                          <textarea
                            value={keeper.seo.description}
                            onChange={(e) => onUpdate(c.file, { seo: { ...keeper.seo!, description: e.target.value } })}
                            rows={4}
                            className="w-full paper-cool rounded-none px-3 py-2 body-serif text-[12.5px] text-ink-soft resize-y focus:outline-none focus:ring-1 focus:ring-ink/30"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <label className="label flex items-center gap-1">
                          <input
                            type="radio"
                            checked={keeper.sizesMode === "all"}
                            onChange={() => onUpdate(c.file, { sizesMode: "all" })}
                          />
                          All sizes
                        </label>
                        <label className="label flex items-center gap-1">
                          <input
                            type="radio"
                            checked={keeper.sizesMode === "custom"}
                            onChange={() => onUpdate(c.file, { sizesMode: "custom" })}
                          />
                          Choose sizes
                        </label>
                      </div>
                      {keeper.sizesMode === "custom" && (
                        <div className="flex flex-wrap gap-2">
                          {sizeOptions.map((s) => (
                            <label key={s} className="label flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={!!keeper.customSizes[s]}
                                onChange={(e) =>
                                  onUpdate(c.file, {
                                    customSizes: { ...keeper.customSizes, [s]: e.target.checked },
                                  })
                                }
                              />
                              {s}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {keeper.seoError && <p className="marginalia text-terra">{keeper.seoError}</p>}
                    {keeper.finalizeError && <p className="marginalia text-terra">{keeper.finalizeError}</p>}

                    {keeper.finalized ? (
                      <div className="stamp stamp-forest w-full justify-center py-2">
                        Finalized — {keeper.finalized.prints.length} print sizes
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onFinalize(c.file)}
                        disabled={!keeper.title.trim() || !keeper.seo || keeper.finalizing}
                        className="press-btn w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {keeper.finalizing ? "Finalizing…" : "Finalize This Piece →"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
