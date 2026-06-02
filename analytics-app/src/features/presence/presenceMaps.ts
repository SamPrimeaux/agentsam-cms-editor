import type { CmsPresenceMode, CmsPresenceState } from "./presenceTypes";

export const CMS_PRESENCE_FALLBACK_ICON_KEY = "cms-spark";

export const modeBaselineStateMap: Record<CmsPresenceMode, CmsPresenceState> = {
  edit: "active",
  design: "active",
  preview: "idle",
  content: "active",
  media: "idle",
  workflow: "idle",
  publish: "idle",
  settings: "idle",
  unknown: "unknown"
};

/**
 * Canonical icon choice for mode + state combinations.
 * This is the highest-priority map after explicit iconKey.
 */
export const modePresenceStateMap: Partial<
  Record<CmsPresenceMode, Partial<Record<CmsPresenceState, string>>>
> = {
  edit: {
    saving: "cms-save",
    syncing: "cms-sync",
    loading: "cms-loading",
    generating: "cms-generate",
    failed: "cms-failed",
    blocked: "cms-blocked"
  },
  design: {
    generating: "cms-generate",
    syncing: "cms-sync",
    saving: "cms-save",
    publishing: "cms-publish",
    failed: "cms-failed",
    blocked: "cms-blocked"
  },
  preview: {
    loading: "cms-loading",
    active: "cms-preview",
    failed: "cms-failed"
  },
  content: {
    generating: "cms-generate",
    saving: "cms-save",
    syncing: "cms-sync",
    failed: "cms-failed"
  },
  media: {
    uploading: "cms-upload",
    complete: "cms-complete",
    failed: "cms-failed"
  },
  workflow: {
    queued: "cms-queued",
    active: "cms-workflow",
    complete: "cms-complete",
    failed: "cms-failed",
    blocked: "cms-blocked"
  },
  publish: {
    awaitingApproval: "cms-approval",
    reviewing: "cms-review",
    publishing: "cms-publish",
    complete: "cms-complete",
    failed: "cms-failed",
    blocked: "cms-blocked"
  },
  settings: {
    syncing: "cms-sync",
    saving: "cms-save",
    failed: "cms-failed"
  }
};

/**
 * Icon choice for state-only when the mode is unknown or unmapped.
 */
export const stateIconMap: Partial<Record<CmsPresenceState, string>> = {
  idle: "cms-dot",
  active: "cms-spark",
  thinking: "cms-thinking",
  loading: "cms-loading",
  generating: "cms-generate",
  saving: "cms-save",
  syncing: "cms-sync",
  uploading: "cms-upload",
  queued: "cms-queued",
  awaitingApproval: "cms-approval",
  reviewing: "cms-review",
  publishing: "cms-publish",
  complete: "cms-complete",
  failed: "cms-failed",
  blocked: "cms-blocked",
  unknown: CMS_PRESENCE_FALLBACK_ICON_KEY
};

/**
 * Mode-only baseline icon when state is unknown/unhelpful.
 */
export const modeBaselineIconMap: Partial<Record<CmsPresenceMode, string>> = {
  edit: "cms-edit",
  design: "cms-design",
  preview: "cms-preview",
  content: "cms-content",
  media: "cms-media",
  workflow: "cms-workflow",
  publish: "cms-publish",
  settings: "cms-settings",
  unknown: CMS_PRESENCE_FALLBACK_ICON_KEY
};

/**
 * Legacy runtime labels / surfaces → canonical states.
 * These MUST be safe: unknown keys just won't match.
 */
export const legacySurfaceStateMap: Record<string, CmsPresenceState> = {
  "workflow.started": "active",
  "workflow.running": "active",
  "workflow.queued": "queued",
  "workflow.completed": "complete",
  "workflow.failed": "failed",
  "section.generated": "complete",
  "section.generating": "generating",
  "theme.compiled": "complete",
  "theme.compiling": "generating",
  "media.upload.started": "uploading",
  "media.upload.completed": "complete",
  "publish.started": "publishing",
  "publish.completed": "complete",
  "approval.required": "awaitingApproval"
};

