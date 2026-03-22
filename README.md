# Notion AI Content Studio (Hackathon MVP)

A **Next.js** app that connects a **Notion** workspace to **local Llama 3.1** (via Ollama), creates a **Creator Profile** and **Content Pipeline** database, generates a **1-week calendar**, then fills in **hooks, scripts, and repurposed multi-platform outputs**—all written back to Notion with **Status** tracking.

## What it does

1. **Creator profile (onboarding)** — Creates or updates a page titled **Creator Profile** under a hub page **Notion AI Content Studio Hub**, storing platforms, niche, posting frequency, content style, and tone.
2. **Content Pipeline database** — Ensures a database **Content Pipeline** exists with: Title, Status (Idea → Draft → Repurposed → Ready), Platform, Scheduled Date, Hook, Script, Repurposed Outputs.
3. **Weekly calendar** — Generates **3–5** posts for the next week (from posting frequency), assigns platforms in rotation, and inserts rows with **Status = Idea**.
4. **Content pipeline** — For each **Idea** row: generates **Hook + Script + key points**, writes to Notion (**Draft**), generates repurposed assets (**X ×3, LinkedIn ×1, short-form hook/outline, 5-slide carousel**), writes **Repurposed Outputs**, then sets **Ready**.

## Prerequisites

- **Node.js 20+**
- **Notion integration token** (`ntn_…`) with access to the pages you want to use ([create an integration](https://www.notion.so/my-integrations), then **Share** / connect pages to it).
- **Ollama** with **Llama 3.1** pulled locally, e.g.  
  `ollama pull llama3.1`  
  Default model name: `llama3.1` (override with `OLLAMA_MODEL`).

## Install & run

```bash
cd "/path/to/content studio"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Paste your **Notion integration token** (unless the server already has `NOTION_TOKEN` in `.env.local`), fill in the profile fields, then use **Setup Notion → Generate calendar → Run pipeline**, or **Run all**.

The browser keeps **session state** (Notion page/database ids) between actions so you do not need to re-enter anything.

### Production

Set `NOTION_TOKEN` in the host environment so users do not need to paste secrets (recommended for any shared deployment).

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTION_TOKEN` | Yes\* | Notion internal integration secret (\*optional if users paste token in the UI—only for local demos) |
| `OLLAMA_HOST` | No | Default `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | No | Default `llama3.1` |

Create a `.env.local` file for local dev:

```bash
NOTION_TOKEN=ntn_your_token_here
```

## How it works

- **Frontend:** `src/app/page.tsx` — simple form and action buttons.
- **API:** `POST /api/studio` with `{ action, state?, profile?, force? }` — actions: `setup`, `calendar`, `pipeline`, `run-all`.
- **Notion:** Server uses the official **Notion REST API** via `@notionhq/client` (`src/lib/notionRest.ts`).

Optional: you can still attach **Notion MCP** in Cursor for browsing your workspace while developing; it is not required for this app.

## Expected Notion layout

Under **Notion AI Content Studio Hub**:

- **Creator Profile** (page) — body text lines: `Platforms:`, `Niche:`, `Posting frequency:`, `Content style:`, `Tone:`.
- **Content Pipeline** (database) — columns as listed above; each row is one scheduled post.

## Demo walkthrough

1. Connect your integration to a workspace (or allow it to create workspace-level pages).
2. Run `npm run dev`, open the app, enter your token if needed, fill the profile, then click **Run all** (or the numbered steps).
3. Open **Content Pipeline** in Notion: rows move **Idea → Draft → Repurposed → Ready** with Hook, Script, and Repurposed Outputs filled in.

## Project structure

```
src/
  app/
    api/studio/route.ts   # POST actions: setup | calendar | pipeline | run-all
    page.tsx              # Creator UI
    layout.tsx, globals.css
  lib/
    notionRest.ts         # Notion REST (@notionhq/client)
    webOrchestrator.ts    # ensureHub, ensureCreatorProfile, ensureContentPipeline
  pipeline/
    calendarGenerator.ts
    contentPipeline.ts    # Script + repurpose pipeline
  notion/
    profileText.ts        # Parse Creator Profile body
    parse.ts, richText.ts
  llm/
    ollama.ts, scriptGenerator.ts, repurposer.ts
  types.ts, state.ts
next.config.ts
```

## Logging

The API returns a **log** array for each run (e.g. `Found N ideas`, `Generating script for …`, `Writing to Notion`, `Repurposing content`, `Completed item`). Per-row errors are logged without stopping the whole batch.
