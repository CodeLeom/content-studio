"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { CreatorProfile } from "@/types";
import type { StudioState } from "@/state";
import {
  buildPlatformsFromSelection,
  CONTENT_STYLE_OPTIONS,
  DEFAULT_TONES,
  PLATFORM_OPTIONS,
  POSTING_FREQUENCY_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/creatorProfile";

const emptyProfile = (): CreatorProfile => ({
  platforms: [],
  niche: "",
  postingFrequency: "3x/week",
  contentStyle: "educational",
  tones: [],
});

function emptyPlatformChecks(): Record<string, boolean> {
  return Object.fromEntries(PLATFORM_OPTIONS.map((o) => [o.id, false]));
}

function emptyToneChecks(): Record<string, boolean> {
  return Object.fromEntries(TONE_OPTIONS.map((t) => [t, false]));
}

function toneChecksFromDefaults(): Record<string, boolean> {
  const defaults = new Set<string>(DEFAULT_TONES);
  return Object.fromEntries(TONE_OPTIONS.map((t) => [t, defaults.has(t)]));
}

function StudioContent() {
  const searchParams = useSearchParams();
  const [notionReady, setNotionReady] = useState<boolean | null>(null);
  const [state, setState] = useState<StudioState>({});
  const [profile, setProfile] = useState<CreatorProfile>(emptyProfile);
  const [platformChecks, setPlatformChecks] = useState(emptyPlatformChecks);
  const [platformOther, setPlatformOther] = useState("");
  const [useRecommendedTones, setUseRecommendedTones] = useState(true);
  const [toneChecks, setToneChecks] = useState(emptyToneChecks);
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

  const buildProfileForApi = useCallback((): CreatorProfile => {
    const selectedIds = new Set(
      Object.entries(platformChecks)
        .filter(([, on]) => on)
        .map(([id]) => id)
    );
    const platforms = buildPlatformsFromSelection(selectedIds, platformOther);
    const tones = useRecommendedTones ? [] : TONE_OPTIONS.filter((t) => toneChecks[t]);
    return {
      ...profile,
      platforms,
      tones,
    };
  }, [profile, platformChecks, platformOther, useRecommendedTones, toneChecks]);

  const togglePlatform = (id: string) => {
    setPlatformChecks((p) => ({ ...p, [id]: !p[id] }));
  };

  const toggleTone = (tone: string) => {
    setUseRecommendedTones(false);
    setToneChecks((p) => ({ ...p, [tone]: !p[tone] }));
  };

  const setRecommendedTonesMode = (on: boolean) => {
    setUseRecommendedTones(on);
    if (on) {
      setToneChecks(emptyToneChecks());
    } else {
      setToneChecks(toneChecksFromDefaults());
    }
  };

  const callApi = async (
    action: "setup" | "calendar" | "pipeline" | "run-all",
    opts?: { includeProfile?: boolean }
  ) => {
    setLoading(action);
    setLastError(null);
    const built = buildProfileForApi();
    if (!useRecommendedTones && built.tones.length === 0) {
      setLastError("Pick at least one tone, or turn on “Use recommended tone mix”.");
      setLoading(null);
      return;
    }
    try {
      const body: Record<string, unknown> = {
        action,
        state,
        force: action === "pipeline" || action === "run-all" ? force : undefined,
      };
      if (opts?.includeProfile !== false && action !== "pipeline") {
        body.profile = built;
      }
      if (action === "pipeline") {
        body.profile = built;
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

      <div className="card studio-profile-card">
        <fieldset className="studio-fieldset">
          <legend className="studio-legend">Platforms</legend>
          <p className="studio-hint">Choose every channel where you publish (you can pick more than one).</p>
          <div className="studio-checkbox-grid">
            {PLATFORM_OPTIONS.map((opt) => (
              <label key={opt.id} className="studio-checkbox-label">
                <input
                  type="checkbox"
                  checked={Boolean(platformChecks[opt.id])}
                  onChange={() => togglePlatform(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          {platformChecks.other && (
            <div className="studio-other-row">
              <label htmlFor="platform-other">Other platform name</label>
              <input
                id="platform-other"
                value={platformOther}
                onChange={(e) => setPlatformOther(e.target.value)}
                placeholder="e.g. Pinterest, newsletter, podcast"
              />
            </div>
          )}
        </fieldset>

        <label htmlFor="niche">Niche</label>
        <p className="studio-hint" id="niche-desc">
          The specific topic or audience you create for (helps scripts and titles stay on-brand).
        </p>
        <input
          id="niche"
          aria-describedby="niche-desc"
          value={profile.niche}
          onChange={(e) => setProfile((p) => ({ ...p, niche: e.target.value }))}
          placeholder="e.g. UX design for early-stage startups"
        />

        <label htmlFor="freq">Posting frequency</label>
        <p className="studio-hint">How many posts you aim to publish per week.</p>
        <select
          id="freq"
          className="studio-select"
          value={profile.postingFrequency}
          onChange={(e) => setProfile((p) => ({ ...p, postingFrequency: e.target.value }))}
        >
          {POSTING_FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label htmlFor="style">Content style</label>
        <p className="studio-hint">The format or angle of your content.</p>
        <select
          id="style"
          className="studio-select"
          value={profile.contentStyle}
          onChange={(e) => setProfile((p) => ({ ...p, contentStyle: e.target.value }))}
        >
          {CONTENT_STYLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>

        <fieldset className="studio-fieldset studio-fieldset-tones">
          <legend className="studio-legend">Tone</legend>
          <p className="studio-hint">
            Voice for scripts and repurposed posts. Use the recommended mix, or pick one or more that fit your brand.
          </p>
          <label className="studio-checkbox-label studio-checkbox-inline">
            <input
              type="checkbox"
              checked={useRecommendedTones}
              onChange={(e) => setRecommendedTonesMode(e.target.checked)}
            />
            <span>
              Use recommended tone mix ({DEFAULT_TONES.join(" & ")}) — best default if you’re unsure
            </span>
          </label>
          {!useRecommendedTones && (
            <div className="studio-checkbox-grid studio-tone-grid">
              {TONE_OPTIONS.map((tone) => (
                <label key={tone} className="studio-checkbox-label">
                  <input type="checkbox" checked={Boolean(toneChecks[tone])} onChange={() => toggleTone(tone)} />
                  <span>{tone.charAt(0).toUpperCase() + tone.slice(1)}</span>
                </label>
              ))}
            </div>
          )}
          <p className="studio-preview-line">
            <span className="studio-preview-label">Used in prompts:</span>{" "}
            {useRecommendedTones ? (
              <span>{DEFAULT_TONES.join(", ")} (recommended)</span>
            ) : (
              <span>
                {TONE_OPTIONS.filter((t) => toneChecks[t]).join(", ") || "— pick at least one tone above"}
              </span>
            )}
          </p>
        </fieldset>
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
