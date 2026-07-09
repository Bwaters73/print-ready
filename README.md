# Print Ready

Standalone companion to [The Etsy SEO Generator](../SEO%20Claude) — same concept-to-print-ready-listing
wizard (draft variations → generate locally → review candidates → title + SEO → upscale + crop to print
sizes → run index), running on its own server so it doesn't need the Etsy SEO Generator app open.

## Setup (once)

```bash
npm install
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY (used to draft prompts + SEO copy)
./artwork-orchestrator-setup.sh    # builds the Python venv + fetches the Real-ESRGAN upscaler
```

Then add your image-generation key(s) to `~/.config/ai-images/env` (created by the setup script):

```bash
export GEMINI_API_KEY=""       # https://aistudio.google.com/apikey   (required — default model)
export OPENAI_API_KEY=""       # https://platform.openai.com/api-keys (optional: GPT Image)
export OPENROUTER_API_KEY=""   # https://openrouter.ai/keys           (optional: fallback)
export MIDJOURNEY_API_KEY=""   # optional — see "Midjourney" below
export MIDJOURNEY_API_URL=""
```

This key file is shared with the Etsy SEO Generator's copy of the same tool — set it up once, both apps
read it.

## Run it

```bash
npm run dev
```

Open http://localhost:3100 and type a concept.

## Midjourney

There's no official Midjourney API, so `tooling/ad-creatives/generate.py`'s `midjourney` model routes
through whichever third-party proxy you're subscribed to (useapi.net, GoAPI, PiAPI, ImagineAPI, ...).
The adapter (`gen_midjourney` in that file) is written against the common GoAPI/PiAPI-style contract —
submit a job, poll for it, download the result. If your provider's field names differ, that function is
the only place to edit. Two current limitations:

- No `--ref` (reference image) support yet — most proxies need a public image URL, not a local file, so
  the **Signature** variation (which always passes house-style reference images) will fail if you pick
  Midjourney as the model. Uncheck Signature, or extend the adapter with your provider's upload endpoint.
- Most proxies return one 2×2 grid image per job unless you also call their upscale/variation endpoint —
  add that call in `gen_midjourney()` if you want single frames instead of a grid.

## What's shared with the Etsy SEO Generator

`lib/artwork-*.ts`, `app/api/artwork/*`, `components/ArtworkOrchestratorApp.tsx`,
`tooling/ad-creatives/generate.py`, and `.claude/skills/artwork-orchestrator/` are copies of the same
files used by the Etsy SEO Generator's `/artwork-orchestrator` page. There's no shared package between
the two — if you fix a bug or add a feature in one, copy it to the other manually.
