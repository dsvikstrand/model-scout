# Model Scout

Model Scout is a lightweight web app for ML engineers to discover Hugging Face models using plain-language prompts. Type what you need, choose between semantic or keyword search, add quick filters, and browse clean cards with stats and copy-to-clipboard model IDs.

## Features
- Natural language prompt with Semantic vs Keyword toggle to compare search modes.
- Quick task and size filters (text, vision, audio, multimodal, other; small/medium/large).
- Hugging Face model cards with downloads, likes, params, framework, license, "View on HF", and "Copy ID".
- React Query-powered data fetching with graceful loading, empty, and error states.

## Tech Stack
Vite + React + TypeScript, Tailwind, shadcn-ui, React Query.

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template and adjust if needed:
   ```bash
   cp .env.example .env
   ```
   - `VITE_SEMANTIC_SEARCH_BASE_URL` (default: davanstrien HF Space)
   - `VITE_HF_HUB_API_BASE_URL` (default: https://huggingface.co/api)
   - `VITE_HF_TOKEN` (optional HF token for gated models or higher limits; Vite embeds `VITE_*` values client-side, so do not use secrets you need to keep private)
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Open the URL shown in the terminal and start searching.

## Quick Tests
- Semantic: `I need a small vision transformer for image classification on 224x224 images.`
- Keyword: `text-embedding multilingual`

## Architecture Notes
- Single search abstraction: `src/services/searchProvider.ts` routes to semantic or keyword providers.
- Providers live in `src/services/semanticSearchProvider.ts` and `src/services/hubKeywordProvider.ts`, normalize results, and honor filters best-effort.
- Shared types in `src/types/models.ts`; data fetching via `src/hooks/useModelSearch.ts`.
- UI components are dumb/presentational under `src/components`.

## Provenance
This project started from a Lovable scaffold but now runs as a standard Vite/React app with no Lovable-specific runtime dependencies. You can move it to other frameworks by reusing `src/`.
