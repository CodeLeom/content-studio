# Notion AI Content Studio

Plan a week of posts, generate scripts, and get repurposed copy for social, all saved in **Notion**. Drafts are produced by **Ollama** on your computer (e.g. Llama 3.1); only syncing with Notion uses the network.

---

## What you need

- A **Notion** account and permission to connect this app to a workspace (you’ll sign in and choose what to share).
- **Ollama** installed and running locally, with a model pulled (the app expects **Llama 3.1** by default—run `ollama pull llama3.1` once).

---

## Using the app

### 1. Open the app

Go to your app URL (for example `http://localhost:3000` if you’re running it yourself).

### 2. Connect Notion

On the home page, use **Connect Notion** and complete Notion’s sign-in. Pick the workspace (and pages) you’re okay with this app using.

If **Connect Notion** is disabled, whoever hosts the app must finish setup—see *If you run the app yourself* below.

### 3. Open the studio

After connecting, open **Studio** (or follow the link you’re given). You’ll see a **creator profile**:

- **Platforms**: check the channels you use (and add another name if needed).
- **Niche**: what you create about (helps titles and scripts stay on-topic).
- **Posting frequency**: how many posts per week you aim for.
- **Content style**: the kind of content you make.
- **Tone**: use the **recommended** mix or choose one or more tones.

### 4. Run the workflow

- **Run everything, setup, calendar & pipeline**: creates or updates your Notion **hub**, **Creator Profile**, and **Content Pipeline**, adds **your duration of weeks calendar** of ideas (if the pipeline is empty), then writes **hooks**, **scripts**, and **repurposed outputs** for each idea.

Use **Individual steps** only if you need to redo one part (for example, only regenerate the calendar).

### 5. Optional: force new scripts

Turn on **Force regenerate scripts** if you want the AI to **rewrite** scripts for ideas that already have text—for example after you change your profile or you’re unhappy with the last run. Leave it off to **skip** rows that already have a script.

### 6. Find everything in Notion

Open the **Notion AI Content Studio Hub** in your workspace. You’ll find:

- **Creator Profile**: your settings in one place.
- **Content Pipeline**: a database with your posts, **Status** (Idea → Draft → Ready), **Hook**, **Script**, and **Repurposed Outputs**.

---

## If you run the app yourself

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Configure environment variables (for example in `.env.local`): Notion OAuth credentials for **Connect Notion**, or `NOTION_TOKEN` for an **internal** integration without OAuth. If you use `NOTION_TOKEN`, Notion does not allow creating a page at the **workspace root**: create any page in Notion, connect your integration to it (**⋯ → Connections**), copy its ID from the URL, and set **`NOTION_PARENT_PAGE_ID`** (see `.env.example`). Optional: `OLLAMA_HOST`, `OLLAMA_MODEL`.

Restart the server after changing configuration.

---

## Disconnecting

In the studio, use **Disconnect Notion** when you want to sign out of this app’s access (session is cleared in the browser).
