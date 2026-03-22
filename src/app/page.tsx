"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SIGNUP_URL = "https://www.notion.so/signup";
const HELP_URL = "https://www.notion.so/help/guides/get-started-with-notion";

function IconCalendar() {
  return (
    <svg className="landing-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconPipeline() {
  return (
    <svg className="landing-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 6h16M4 12h10M4 18h16" />
      <circle cx="18" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLocal() {
  return (
    <svg className="landing-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 9h6v6H9z" />
    </svg>
  );
}

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
    <div className="landing">
      <main className="landing-inner">
        <header className="landing-hero">
          <p className="landing-tagline">Plan, write, publish — in Notion</p>
          <h1 className="hero-title">Your AI content studio</h1>
          <p className="hero-subtitle">
            Build a weekly calendar, full scripts, and repurposed posts for social — all saved where you already work.
          </p>
        </header>

        <section className="feature-grid" aria-label="What you get">
          <article className="feature-card">
            <div className="feature-icon" aria-hidden>
              <IconCalendar />
            </div>
            <h2 className="feature-title">One-week calendar</h2>
            <p className="feature-desc">
              Titles, platforms, and dates laid out from your niche and posting rhythm — ready to produce.
            </p>
          </article>
          <article className="feature-card">
            <div className="feature-icon" aria-hidden>
              <IconPipeline />
            </div>
            <h2 className="feature-title">Pipeline in Notion</h2>
            <p className="feature-desc">
              A database that tracks every piece from idea to ready, with hooks and scripts on each row.
            </p>
          </article>
          <article className="feature-card">
            <div className="feature-icon" aria-hidden>
              <IconLocal />
            </div>
            <h2 className="feature-title">Your AI, your machine</h2>
            <p className="feature-desc">
              Drafts run locally with Ollama. Only Notion syncs to the cloud — on your terms.
            </p>
          </article>
        </section>

        <section className="cta-panel" aria-labelledby="cta-heading">
          <div className="cta-panel-inner">
            <h2 id="cta-heading" className="cta-heading">
              Ready to connect?
            </h2>
            <p className="cta-lead">
              Sign in with Notion and choose which pages this app can use. Your workspace stays in your control.
            </p>
            <div className="cta-actions">
              {oauthOk ? (
                <a className="btn-cta btn-cta-primary" href="/api/auth/notion">
                  Connect Notion
                </a>
              ) : (
                <button type="button" className="btn-cta btn-cta-primary" disabled title="OAuth not configured on this server">
                  Connect Notion
                </button>
              )}
              <button type="button" className="btn-cta btn-cta-secondary" onClick={openSetup}>
                Create a Notion account
              </button>
            </div>
            <p className="cta-note">
              We’ll open Notion in a new window. When you’re done, return here and tap <strong>Connect Notion</strong>.
            </p>
            {!oauthOk && (
              <p className="cta-dev">
                <span className="cta-dev-label">Developer</span> Add OAuth env vars or use <code>NOTION_TOKEN</code> and
                open <Link href="/app">Studio</Link> — see README.
              </p>
            )}
          </div>
        </section>

        <footer className="landing-footer">
          {connected ? (
            <Link href="/app" className="btn-cta btn-cta-primary btn-cta-wide">
              Continue to studio
            </Link>
          ) : (
            <Link href="/app" className="landing-skip">
              Skip to studio <span aria-hidden>→</span>
            </Link>
          )}
          <p className="landing-meta">
            New to Notion?{" "}
            <a href={HELP_URL} target="_blank" rel="noreferrer">
              Get started
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
