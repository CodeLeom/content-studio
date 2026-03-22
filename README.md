# Notion AI Content Studio

A **Next.js** app that connects a **Notion** workspace to **local Llama 3.1** (via Ollama), creates a **Creator Profile** and **Content Pipeline** database, generates a **1-week calendar**, then fills in **hooks, scripts, and repurposed multi-platform outputs**—all written back to Notion with **Status** tracking.

## Do we “get their token”?

**Yes, after they connect with Notion’s OAuth flow** (recommended for real users):

- Notion redirects back with a **short-lived `code`**, which the server **exchanges** for an **`access_token`** and **`refresh_token`**.
- Those are **not** the same as copying an internal integration secret—they’re **per authorization** and scoped to what the user shared in the page picker.
- This app stores tokens in **httpOnly cookies** (not in `localStorage`). For production you’d typically persist them in a database keyed by user id.

**Internal integration token** (`NOTION_TOKEN` in `.env.local`) still works for **local dev** or single-user server setups without OAuth.

## UX

1. **Home (`/`)** — What the app does + **Do you have a Notion account?**
   - **Connect Notion** — starts OAuth (`/api/auth/notion`).
   - **I need a Notion account** — opens Notion’s signup in a **new tab**; user returns and taps **Connect Notion**.
2. **Studio (`/app`)** — Creator profile + calendar / pipeline actions (after connection or with `NOTION_TOKEN`).

## Prerequisites

- **Node.js 20+**
- **Notion**: either a [public OAuth integration](https://developers.notion.com/docs/authorization#public-integration-auth-flow-set-up) (for Connect Notion) or an internal integration token for dev-only.
- **Ollama** with **Llama 3.1**, e.g. `ollama pull llama3.1` (`OLLAMA_MODEL` overrides the default).

## OAuth setup (Connect Notion)

1. In [Notion integrations](https://www.notion.so/my-integrations), create a **public** integration (or convert an existing one to public).
2. Under **OAuth**, set the **redirect URI** to exactly:
   - Local: `http://localhost:3000/api/auth/callback`
   - Production: `https://your-domain.com/api/auth/callback`
3. Copy **OAuth client ID** and **OAuth client secret** from the integration settings.

Add to **`.env.local`**:

```bash
NOTION_OAUTH_CLIENT_ID=your_client_id
NOTION_OAUTH_CLIENT_SECRET=your_client_secret
NOTION_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

Restart `npm run dev`. The home page **Connect Notion** button will enable once `/api/health` reports `oauthConfigured`.

## Install & run

```bash
cd "/path/to/content studio"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Connect Notion** → you’ll return to **`/app`** with a session cookie.

## Environment

| Variable | When |
|----------|------|
| `NOTION_OAUTH_CLIENT_ID` | OAuth (Connect Notion) |
| `NOTION_OAUTH_CLIENT_SECRET` | OAuth |
| `NOTION_OAUTH_REDIRECT_URI` | Must match the redirect URI in Notion (e.g. `http://localhost:3000/api/auth/callback`) |
| `NOTION_TOKEN` | Optional: internal integration secret for dev / server-only (no OAuth UI) |
| `OLLAMA_HOST` | Optional, default `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Optional, default `llama3.1` |

## API

| Route | Purpose |
|-------|---------|
| `GET /api/health` | `{ notionReady, oauthConfigured }` — no secrets |
| `GET /api/auth/notion` | Redirects to Notion OAuth |
| `GET /api/auth/callback` | Exchanges `code`, sets cookies, redirects to `/app` |
| `POST /api/auth/logout` | Clears Notion cookies |
| `POST /api/studio` | `{ action: setup \| calendar \| pipeline \| run-all, state?, profile?, force? }` |

## Expected Notion layout

Under **Notion AI Content Studio Hub**:

- **Creator Profile** (page) — platforms, niche, frequency, style, tone.
- **Content Pipeline** (database) — Title, Status, Platform, Scheduled Date, Hook, Script, Repurposed Outputs.

## Project structure

```
src/
  app/
    page.tsx              # Landing (what it does + Connect / setup CTA)
    app/page.tsx          # Studio (profile + actions)
    api/auth/notion/      # OAuth start
    api/auth/callback/    # OAuth callback
    api/auth/logout/
    api/health/
    api/studio/
  lib/
    notionSession.ts      # Cookie + env token resolution
    notionRest.ts
    webOrchestrator.ts
  pipeline/
  notion/
  llm/
```

## Logging

`POST /api/studio` returns a `logs` array for each run. Row-level failures don’t stop the batch.
