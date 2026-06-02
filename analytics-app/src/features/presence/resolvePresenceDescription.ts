import type { CmsPresenceMode, CmsPresenceState } from "./presenceTypes";

type ResolvePresenceDescriptionInput = {
  mode?: CmsPresenceMode | string | null;
  state?: CmsPresenceState | string | null;
  description?: string | null;
};

function normalizeToken(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

const stateDescriptionMap: Partial<Record<CmsPresenceState, string>> = {
  idle: "Standing by.",
  active: "In progress.",
  thinking: "Working through the next step.",
  loading: "Loading the latest state.",
  generating: "Generating changes.",
  saving: "Saving changes.",
  syncing: "Syncing state across the system.",
  uploading: "Uploading media.",
  queued: "Queued and waiting to run.",
  awaitingApproval: "Awaiting review or approval.",
  reviewing: "Review in progress.",
  publishing: "Publishing changes.",
  complete: "Completed successfully.",
  failed: "Something went wrong.",
  blocked: "Blocked until an issue is resolved.",
  unknown: "Status unavailable."
};

const modeHintMap: Partial<Record<CmsPresenceMode, string>> = {
  edit: "Editing the page.",
  design: "Adjusting layout and theme styling.",
  preview: "Previewing the current draft.",
  content: "Updating content blocks.",
  media: "Managing media assets.",
  workflow: "Running automated steps.",
  publish: "Preparing changes for publish.",
  settings: "Updating settings."
};

export function resolvePresenceDescription({
  mode,
  state,
  description
}: ResolvePresenceDescriptionInput): string {
  const explicit = normalizeToken(description);
  if (explicit) return explicit;

  const m = normalizeToken(mode) as CmsPresenceMode | "";
  const s = normalizeToken(state) as CmsPresenceState | "";

  if (s && stateDescriptionMap[s]) return stateDescriptionMap[s]!;
  if (m && modeHintMap[m]) return modeHintMap[m]!;

  return "Status unavailable.";
}

