import { PresenceCard } from "./PresenceCard";
import { PresenceInline } from "./PresenceInline";
import type { CmsPresenceMode, CmsPresenceState } from "./presenceTypes";
import type { PresenceMotion, PresenceTone } from "./presenceTypes";
import { useEffect, useMemo, useState } from "react";

const MODES: CmsPresenceMode[] = [
  "edit",
  "design",
  "preview",
  "content",
  "media",
  "workflow",
  "publish",
  "settings",
  "unknown"
];

const STATES: CmsPresenceState[] = [
  "idle",
  "active",
  "thinking",
  "loading",
  "generating",
  "saving",
  "syncing",
  "uploading",
  "queued",
  "awaitingApproval",
  "reviewing",
  "publishing",
  "complete",
  "failed",
  "blocked",
  "unknown"
];

function styleForMode(mode: CmsPresenceMode): React.CSSProperties {
  const toVar = (m: CmsPresenceMode) => {
    switch (m) {
      case "edit":
        return "var(--cms-mode-edit)";
      case "design":
        return "var(--cms-mode-design)";
      case "preview":
        return "var(--cms-mode-preview)";
      case "content":
        return "var(--cms-mode-content)";
      case "media":
        return "var(--cms-mode-media)";
      case "workflow":
        return "var(--cms-mode-workflow)";
      case "publish":
        return "var(--cms-mode-publish)";
      case "settings":
        return "var(--cms-mode-settings)";
      default:
        return "var(--presence-brand-fg)";
    }
  };

  return {
    border: "1px solid var(--dashboard-border)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--dashboard-panel) 98%, transparent), color-mix(in srgb, var(--dashboard-panel-elevated, var(--dashboard-panel)) 92%, transparent))",
    boxShadow: "0 22px 70px rgba(0,0,0,.22)",
    ["--presence-icon-color" as string]: toVar(mode)
  };
}

export function PresencePreview() {
  const [theme, setTheme] = useState<"ember" | "classy" | "mono">(() => {
    const saved = localStorage.getItem("cms-presence-dev-theme");
    return saved === "classy" || saved === "mono" ? saved : "ember";
  });
  const [modeFilter, setModeFilter] = useState<CmsPresenceMode | "all">(() => {
    const saved = localStorage.getItem("cms-presence-dev-mode");
    return saved === "all" || (MODES as string[]).includes(saved ?? "") ? (saved as any) : "all";
  });
  const [iconSize, setIconSize] = useState<number>(() => {
    const saved = Number(localStorage.getItem("cms-presence-dev-icon-size") ?? "54");
    return Number.isFinite(saved) && saved >= 14 && saved <= 96 ? saved : 54;
  });
  const [motion, setMotion] = useState<PresenceMotion>(() => {
    const saved = localStorage.getItem("cms-presence-dev-motion");
    return saved === "none" || saved === "auto" || saved === "pulse" || saved === "spin" || saved === "glow"
      ? (saved as PresenceMotion)
      : "auto";
  });
  const [toneOverride, setToneOverride] = useState<PresenceTone | "auto">(() => {
    const saved = localStorage.getItem("cms-presence-dev-tone");
    return saved === "neutral" ||
      saved === "success" ||
      saved === "warning" ||
      saved === "danger" ||
      saved === "info" ||
      saved === "brand" ||
      saved === "auto"
      ? (saved as any)
      : "auto";
  });
  const [showUnknown, setShowUnknown] = useState<boolean>(() => {
    const saved = localStorage.getItem("cms-presence-dev-show-unknown");
    return saved === "0" ? false : true;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cms-presence-dev-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("cms-presence-dev-mode", modeFilter);
  }, [modeFilter]);

  useEffect(() => {
    localStorage.setItem("cms-presence-dev-icon-size", String(iconSize));
  }, [iconSize]);

  useEffect(() => {
    localStorage.setItem("cms-presence-dev-motion", String(motion));
  }, [motion]);

  useEffect(() => {
    localStorage.setItem("cms-presence-dev-tone", String(toneOverride));
  }, [toneOverride]);

  useEffect(() => {
    localStorage.setItem("cms-presence-dev-show-unknown", showUnknown ? "1" : "0");
  }, [showUnknown]);

  const modesToShow = useMemo(() => {
    const base = modeFilter === "all" ? MODES : MODES.filter((m) => m === modeFilter);
    if (showUnknown) return base;
    return base.filter((m) => m !== "unknown");
  }, [modeFilter, showUnknown]);

  const statesToShow = useMemo(() => {
    if (showUnknown) return STATES;
    return STATES.filter((s) => s !== "unknown");
  }, [showUnknown]);

  const toneFor = (state: CmsPresenceState): PresenceTone => {
    if (toneOverride !== "auto") return toneOverride;
    return state === "failed"
      ? "danger"
      : state === "blocked"
        ? "warning"
        : state === "complete"
          ? "success"
          : state === "awaitingApproval"
            ? "info"
            : "brand";
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header className="presence-dev-hero">
        <div>
          <div className="analytics-eyebrow">CMS Presence Library</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 28, letterSpacing: "-0.045em" }}>
            Live presence preview — modes, states, motion, and tone.
          </h1>
          <p className="analytics-status" style={{ maxWidth: 900, marginTop: 10 }}>
            Resolvers are hardened: unknown mode/state never crashes and never becomes a “default
            mode.” Use these controls to validate icon resolution, motion, and theme overrides.
          </p>
        </div>
        <aside className="presence-dev-toolbar" aria-label="Presence preview controls">
          <nav className="presence-dev-group" aria-label="Theme selector">
            <button
              className="presence-dev-btn"
              aria-pressed={theme === "classy"}
              onClick={() => setTheme("classy")}
            >
              Classy
            </button>
            <button
              className="presence-dev-btn"
              aria-pressed={theme === "ember"}
              onClick={() => setTheme("ember")}
            >
              Ember
            </button>
            <button
              className="presence-dev-btn"
              aria-pressed={theme === "mono"}
              onClick={() => setTheme("mono")}
            >
              Mono
            </button>
          </nav>

          <nav className="presence-dev-group" aria-label="Mode filter">
            <button
              className="presence-dev-btn"
              aria-pressed={modeFilter === "all"}
              onClick={() => setModeFilter("all")}
            >
              All
            </button>
            {MODES.filter((m) => m !== "unknown").map((m) => (
              <button
                key={m}
                className="presence-dev-btn"
                aria-pressed={modeFilter === m}
                onClick={() => setModeFilter(m)}
              >
                {m}
              </button>
            ))}
            <button
              className="presence-dev-btn"
              aria-pressed={modeFilter === "unknown"}
              onClick={() => setModeFilter("unknown")}
            >
              unknown
            </button>
          </nav>

          <div className="presence-dev-controls" role="group" aria-label="Live controls">
            <div className="presence-dev-row">
              <label htmlFor="presenceIconSize">Icon size</label>
              <input
                id="presenceIconSize"
                type="range"
                min={14}
                max={96}
                value={iconSize}
                onChange={(e) => setIconSize(Number(e.target.value))}
              />
              <div className="analytics-status" style={{ margin: 0 }}>
                {iconSize}px
              </div>
            </div>

            <div className="presence-dev-row">
              <label htmlFor="presenceMotion">Motion</label>
              <select
                id="presenceMotion"
                className="presence-dev-select"
                value={String(motion)}
                onChange={(e) => setMotion(e.target.value as PresenceMotion)}
              >
                <option value="auto">auto</option>
                <option value="none">none</option>
                <option value="pulse">pulse</option>
                <option value="spin">spin</option>
                <option value="glow">glow</option>
              </select>
              <div />
            </div>

            <div className="presence-dev-row">
              <label htmlFor="presenceTone">Tone</label>
              <select
                id="presenceTone"
                className="presence-dev-select"
                value={String(toneOverride)}
                onChange={(e) => setToneOverride(e.target.value as any)}
              >
                <option value="auto">auto</option>
                <option value="neutral">neutral</option>
                <option value="info">info</option>
                <option value="success">success</option>
                <option value="warning">warning</option>
                <option value="danger">danger</option>
                <option value="brand">brand</option>
              </select>
              <div />
            </div>

            <div className="presence-dev-row">
              <label htmlFor="presenceUnknown">Unknowns</label>
              <button
                id="presenceUnknown"
                className="presence-dev-btn"
                aria-pressed={showUnknown}
                onClick={() => setShowUnknown((v) => !v)}
                style={{ justifySelf: "start" }}
              >
                {showUnknown ? "Shown" : "Hidden"}
              </button>
              <div />
            </div>
          </div>
        </aside>
      </header>

      <section style={styleForMode("workflow")}>
        <h2 style={{ margin: 0, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dashboard-muted)" }}>
          Inline row preview
        </h2>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <PresenceInline
            mode="edit"
            state="saving"
            title="Saving page"
            label="Edit"
            motion={motion}
            tone={toneFor("saving")}
          />
          <PresenceInline
            mode="design"
            state="syncing"
            title="Syncing theme"
            label="Design"
            motion={motion}
            tone={toneFor("syncing")}
          />
          <PresenceInline
            mode="content"
            state="generating"
            title="Generating section"
            label="Content"
            motion={motion}
            tone={toneFor("generating")}
          />
          <PresenceInline
            mode="publish"
            state="awaitingApproval"
            title="Awaiting approval"
            label="Publish"
            motion={motion}
            tone={toneFor("awaitingApproval")}
          />
          <PresenceInline
            mode="media"
            state="complete"
            title="Media upload complete"
            label="Media"
            motion={motion}
            tone={toneFor("complete")}
          />
          <PresenceInline
            mode="workflow"
            state="failed"
            title="Workflow failed"
            label="Workflow"
            motion={motion}
            tone={toneFor("failed")}
          />
          {showUnknown ? (
            <PresenceInline
              mode={"legacy-mode"}
              state={"legacy-state"}
              title="Unknown mode/state"
              label="Fallback-safe"
              motion={motion}
              tone={toneFor("unknown")}
            />
          ) : null}
        </div>
      </section>

      {modesToShow.map((mode) => (
        <section key={mode} style={styleForMode(mode)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, letterSpacing: "-0.03em" }}>
                {mode.toUpperCase()} mode
              </h2>
              <div className="analytics-status">All canonical states for quick visual inspection.</div>
            </div>
            <span className="pill good" style={{ background: "color-mix(in srgb, var(--presence-icon-color) 12%, transparent)", color: "var(--presence-icon-color)" }}>
              {mode}
            </span>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12
            }}
          >
            {statesToShow.map((state) => (
              <PresenceCard
                key={`${mode}:${state}`}
                mode={mode}
                state={state}
                title={`${mode} · ${state}`}
                footer={`mode="${mode}" state="${state}"`}
                tone={toneFor(state)}
                motion={motion}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

