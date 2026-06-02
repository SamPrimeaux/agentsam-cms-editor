export type CmsPresenceMode =
  | "edit"
  | "design"
  | "preview"
  | "content"
  | "media"
  | "workflow"
  | "publish"
  | "settings"
  | "unknown";

export type CmsPresenceState =
  | "idle"
  | "active"
  | "thinking"
  | "loading"
  | "generating"
  | "saving"
  | "syncing"
  | "uploading"
  | "queued"
  | "awaitingApproval"
  | "reviewing"
  | "publishing"
  | "complete"
  | "failed"
  | "blocked"
  | "unknown";

export type PresenceTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand";

export type PresenceMotion = boolean | "auto" | "none" | "pulse" | "spin" | "glow";

export type PresenceIconSize = "xs" | "sm" | "md" | "lg" | number;

