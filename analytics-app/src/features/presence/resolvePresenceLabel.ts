import type { CmsPresenceMode, CmsPresenceState } from "./presenceTypes";

type ResolvePresenceLabelInput = {
  mode?: CmsPresenceMode | string | null;
  state?: CmsPresenceState | string | null;
  label?: string | null;
};

function normalizeToken(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function titleCase(token: string): string {
  if (!token) return token;
  return token.slice(0, 1).toUpperCase() + token.slice(1);
}

const modeLabelMap: Record<string, string> = {
  edit: "Edit",
  design: "Design",
  preview: "Preview",
  content: "Content",
  media: "Media",
  workflow: "Workflow",
  publish: "Publish",
  settings: "Settings",
  unknown: "Unknown"
};

const stateLabelMap: Record<string, string> = {
  idle: "Idle",
  active: "Active",
  thinking: "Thinking",
  loading: "Loading",
  generating: "Generating",
  saving: "Saving",
  syncing: "Syncing",
  uploading: "Uploading",
  queued: "Queued",
  awaitingApproval: "Awaiting approval",
  reviewing: "Reviewing",
  publishing: "Publishing",
  complete: "Complete",
  failed: "Failed",
  blocked: "Blocked",
  unknown: "Unknown"
};

export function resolvePresenceLabel({
  mode,
  state,
  label
}: ResolvePresenceLabelInput): string {
  const explicit = normalizeToken(label);
  if (explicit) return explicit;

  const m = normalizeToken(mode).toLowerCase();
  const s = normalizeToken(state);

  const modeLabel = m ? modeLabelMap[m] : undefined;
  const stateLabel = s ? stateLabelMap[s] ?? titleCase(s) : undefined;

  if (modeLabel && stateLabel) return `${modeLabel} · ${stateLabel}`;
  if (stateLabel) return stateLabel;
  if (modeLabel) return modeLabel;

  return "Presence";
}

