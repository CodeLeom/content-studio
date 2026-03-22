"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { CreatorProfile } from "@/types";
import type { StudioState } from "@/state";

const emptyProfile = (): CreatorProfile => ({
  platforms: [],
  niche: "",
  postingFrequency: "3x/week",
  contentStyle: "educational",
  tone: "casual",
});

function StudioContent() {
  const searchParams = useSearchParams();
  const [notionReady, setNotionReady] = useState<boolean | null>(null);
  const [state, setState] = useState<StudioState>({});
  const [profile, setProfile] = useState<CreatorProfile>(emptyProfile);
  const [platformsText, setPlatformsText] = useState("YouTube, TikTok, X");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [force, setForce] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setToast("You’re connected to Notion. Fill in your profile below, then run the steps.");
    }
    const err = searchParams.get("error");
    if (err) {
      setLastError(decodeURIComponent(err));
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { notionReady?: boolean }) => setNotionReady(Boolean(d.notionReady)))
      .catch(() => setNotionReady(false));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

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

      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      <nav className="studio-nav">
        <Link href="/">← Home</Link>
        <button type="button" className="linkish" onClick={() => void logout()}>
          Disconnect Notion
        </button>
      </nav>

      <h1>Your content studio</h1>
      <p className="lead">
        Tell us about your channel, then generate a weekly plan and scripts in Notion.
      </p>

      {toast && (
        <div className="card banner banner-ok">
          {toast}
          <button type="button" className="toast-dismiss" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}

      {notionReady === false && (
        <div className="card banner">
          <strong>Notion isn’t connected.</strong>{" "}
          <Link href="/">Go to the home page</Link> and use <strong>Connect Notion</strong>, or ask your developer to
          set <code>NOTION_TOKEN</code> for server-only testing.
        </div>
      )}

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
          Uses Ollama locally (e.g. <code>ollama pull llama3.1</code>). Default model: <code>llama3.1</code>.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Force regenerate scripts (ignore existing script text)
        </label>
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button type="button" disabled={!!loading || notionReady !== true} onClick={() => callApi("setup")}>
            {loading === "setup" ? "…" : "1. Setup Notion"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!!loading || notionReady !== true}
            onClick={() => callApi("calendar")}
          >
            {loading === "calendar" ? "…" : "2. Generate calendar"}
          </button>
        </div>
        <div className="row" style={{ marginTop: "0.5rem" }}>
          <button
            type="button"
            className="secondary"
            disabled={!!loading || notionReady !== true}
            onClick={() => callApi("pipeline")}
          >
            {loading === "pipeline" ? "…" : "3. Run pipeline"}
          </button>
          <button type="button" disabled={!!loading || notionReady !== true} onClick={() => callApi("run-all")}>
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
          Progress is saved in your browser for the next steps. In Notion, open{" "}
          <strong>Notion AI Content Studio Hub</strong>.
        </p>
      )}
    </main>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<main className="studio-loading"><p className="lead">Loading…</p></main>}>
      <StudioContent />
    </Suspense>
  );
}
