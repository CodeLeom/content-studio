"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SIGNUP_URL = "https://www.notion.so/signup";
const HELP_URL = "https://www.notion.so/help/guides/get-started-with-notion";

export default function LandingPage() {
  const [health, setHealth] = useState<{
    notionReady?: boolean;
    oauthConfigured?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ notionReady: false, oauthConfigured: false }));
  }, []);

  const openSetup = () => {
    window.open(SIGNUP_URL, "_blank", "noopener,noreferrer");
  };

  const oauthOk = health?.oauthConfigured === true;
  const connected = health?.notionReady === true;

  return (
    <main className="landing-main">
      <p className="eyebrow">Hackathon MVP</p>
      <h1>Notion AI Content Studio</h1>
      <p className="lead hero-lead">
        Plan a week of posts, get full scripts, and get repurposed copy for X, LinkedIn, short-form, and carousels—
        <strong> saved straight into Notion</strong> so you can ship from one place.
      </p>

      <ul className="value-list">
        <li>
          <strong>Creator profile</strong> — your niche, platforms, tone, and posting rhythm in one Notion page.
        </li>
        <li>
          <strong>Content Pipeline</strong> — a database with statuses from idea → ready, plus hooks and scripts per
          post.
        </li>
        <li>
          <strong>Local AI</strong> — runs on your machine with Ollama (Llama 3.1); nothing leaves your box except
          Notion API calls.
        </li>
      </ul>

      <section className="cta-section card">
        <h2 className="cta-title">Do you have a Notion account?</h2>
        <p className="cta-copy">
          Connect the workspace where you want your calendar and scripts to live. We use Notion’s secure sign-in—you
          pick which pages to share.
        </p>
        <div className="cta-buttons">
          {oauthOk ? (
            <a className="btn-primary" href="/api/auth/notion">
              Connect Notion
            </a>
          ) : (
            <button type="button" className="btn-primary" disabled title="OAuth not configured on this server">
              Connect Notion
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={openSetup}>
            I need a Notion account
          </button>
        </div>
        <p className="cta-hint">
          We’ll open Notion in a new tab. Create an account or sign in, then <strong>come back here</strong> and tap{" "}
          <strong>Connect Notion</strong> to link this app.
        </p>
        {!oauthOk && (
          <p className="dev-hint">
            <strong>Running locally?</strong> Add OAuth credentials to <code>.env.local</code> (see README), or use{" "}
            <code>NOTION_TOKEN</code> and open <Link href="/app">the studio</Link> without Connect.
          </p>
        )}
      </section>

      <div className="landing-footer">
        {connected ? (
          <Link href="/app" className="btn-primary">
            Open studio →
          </Link>
        ) : (
          <Link href="/app" className="link-muted">
            Already connected? Open studio
            </Link>
        )}
        <p className="fine-print">
          New to Notion?{" "}
          <a href={HELP_URL} target="_blank" rel="noreferrer">
            Quick start guide
          </a>
        </p>
      </div>
    </main>
  );
}
