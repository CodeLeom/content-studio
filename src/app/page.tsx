"use client";

import { useCallback, useState } from "react";
import type { CreatorProfile } from "@/types";
import type { StudioState } from "@/state";

const emptyProfile = (): CreatorProfile => ({
  platforms: [],
  niche: "",
  postingFrequency: "3x/week",
  contentStyle: "educational",
  tone: "casual",
});

export default function HomePage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<StudioState>({});
  const [profile, setProfile] = useState<CreatorProfile>(emptyProfile);
  const [platformsText, setPlatformsText] = useState("YouTube, TikTok, X");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [force, setForce] = useState(false);

  const syncPlatforms = useCallback(() => {
    setProfile((p) => ({
      ...p,
      platforms: platformsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  }, [platformsText]);

  const callApi = async (
    action: "setup" | "calendar" | "pipeline" | "run-all",
    opts?: { includeProfile?: boolean }
  ) => {
    setLoading(action);
    setLastError(null);
    syncPlatforms();
    try {
      const body: Record<string, unknown> = {
        action,
        state,
        force: action === "pipeline" || action === "run-all" ? force : undefined,
      };
      if (opts?.includeProfile !== false && action !== "pipeline") {
        body.profile = {
          ...profile,
          platforms: platformsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };
      }
      if (action === "pipeline") {
        body.profile = {
          ...profile,
          platforms: platformsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token.trim()) headers.Authorization = `Bearer ${token.trim()}`;

      const res = await fetch("/api/studio", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        state?: StudioState;
        logs?: string[];
        error?: string;
      };

      if (data.state) setState(data.state);
      setLogs(data.logs ?? []);
      if (!res.ok || !data.ok) {
        setLastError(data.error ?? `Request failed (${res.status})`);
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <main>
      <h1>Notion AI Content Studio</h1>
      <p className="lead">
        Connect your Notion integration, describe your channel, then generate a weekly plan and scripts—written
        straight into a Content Pipeline database.
      </p>

      <div className="card">
        <label htmlFor="token">Notion integration token (optional if server has NOTION_TOKEN)</label>
        <input
          id="token"
          type="password"
          autoComplete="off"
          placeholder="secret_… or ntn_…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <small className="hint">
          Create an internal integration at{" "}
          <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer">
            notion.so/my-integrations
          </a>{" "}
          and share pages with it. The token stays in your browser unless you rely on server env.
        </small>
      </div>

      <div className="card">
        <label htmlFor="platforms">Platforms (comma-separated)</label>
        <input
          id="platforms"
          value={platformsText}
          onChange={(e) => setPlatformsText(e.target.value)}
          onBlur={syncPlatforms}
        />
        <label htmlFor="niche">Niche</label>
        <input
          id="niche"
          value={profile.niche}
          onChange={(e) => setProfile((p) => ({ ...p, niche: e.target.value }))}
        />
        <label htmlFor="freq">Posting frequency</label>
        <input
          id="freq"
          value={profile.postingFrequency}
          onChange={(e) => setProfile((p) => ({ ...p, postingFrequency: e.target.value }))}
          placeholder="e.g. 3x/week"
        />
        <label htmlFor="style">Content style</label>
        <input
          id="style"
          value={profile.contentStyle}
          onChange={(e) => setProfile((p) => ({ ...p, contentStyle: e.target.value }))}
        />
        <label htmlFor="tone">Tone</label>
        <input
          id="tone"
          value={profile.tone}
          onChange={(e) => setProfile((p) => ({ ...p, tone: e.target.value }))}
        />
      </div>

      <div className="card">
        <p style={{ marginTop: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
          Requires Ollama running locally with Llama 3.1 (same as CLI). Default model:{" "}
          <code>llama3.1</code>.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Force regenerate scripts (ignore existing script text)
        </label>
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button type="button" disabled={!!loading} onClick={() => callApi("setup")}>
            {loading === "setup" ? "…" : "1. Setup Notion"}
          </button>
          <button type="button" className="secondary" disabled={!!loading} onClick={() => callApi("calendar")}>
            {loading === "calendar" ? "…" : "2. Generate calendar"}
          </button>
        </div>
        <div className="row" style={{ marginTop: "0.5rem" }}>
          <button type="button" className="secondary" disabled={!!loading} onClick={() => callApi("pipeline")}>
            {loading === "pipeline" ? "…" : "3. Run pipeline"}
          </button>
          <button type="button" disabled={!!loading} onClick={() => callApi("run-all")}>
            {loading === "run-all" ? "…" : "Run all"}
          </button>
        </div>
      </div>

      {lastError && <p className="error">{lastError}</p>}

      {logs.length > 0 && (
        <div className="card">
          <label>Log</label>
          <div className="logs">{logs.join("\n")}</div>
        </div>
      )}

      {state.hubPageId && (
        <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          Session state saved in the browser for the next actions. Open your Notion workspace to find{" "}
          <strong>Notion AI Content Studio Hub</strong>.
        </p>
      )}
    </main>
  );
}
