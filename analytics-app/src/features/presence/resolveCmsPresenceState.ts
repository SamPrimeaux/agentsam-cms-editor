import type { CmsPresenceMode, CmsPresenceState } from "./presenceTypes";
import { legacySurfaceStateMap, modeBaselineStateMap } from "./presenceMaps";

export type ResolveCmsPresenceStateInput = {
  mode?: CmsPresenceMode | string | null;
  isSaving?: boolean;
  isSyncing?: boolean;
  isUploading?: boolean;
  isGenerating?: boolean;
  isPublishing?: boolean;
  hasPendingApproval?: boolean;
  approvalCount?: number;
  workflowQueued?: boolean;
  workflowRunning?: boolean;
  workflowComplete?: boolean;
  workflowFailed?: boolean;
  lastEventType?: string | null;
  error?: unknown;
  blockedReason?: string | null;
};

function normalizeToken(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function hasError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) return true;
  if (typeof error === "string" && error.trim()) return true;
  return true;
}

export function resolveCmsPresenceState(input: ResolveCmsPresenceStateInput): CmsPresenceState {
  const lastEvent = normalizeToken(input.lastEventType);
  if (lastEvent) {
    const legacy = legacySurfaceStateMap[lastEvent];
    if (legacy) {
      // Legacy events are lower priority than explicit failure/blocking, but higher than baseline.
      // We'll still allow later logic to override for failure/blocking.
    }
  }

  // Highest priority: explicit failure / error.
  if (input.workflowFailed || hasError(input.error)) return "failed";

  // Blocking should beat queued/running/saving/etc.
  const blockedReason = normalizeToken(input.blockedReason);
  if (blockedReason) return "blocked";

  // Approval state should beat saving/syncing.
  if (input.hasPendingApproval) return "awaitingApproval";
  if (typeof input.approvalCount === "number" && input.approvalCount > 0) return "awaitingApproval";

  // Queue / workflow flags.
  if (input.workflowQueued) return "queued";
  if (input.isPublishing) return "publishing";
  if (input.isUploading) return "uploading";
  if (input.isSaving) return "saving";
  if (input.isSyncing) return "syncing";
  if (input.isGenerating) return "generating";
  if (input.workflowRunning) return "active";

  // Flash/temporary display states.
  if (input.workflowComplete) return "complete";

  // Legacy/runtime event names.
  const legacy = lastEvent ? legacySurfaceStateMap[lastEvent] : undefined;
  if (legacy) return legacy;

  // Mode baseline.
  const mode = normalizeToken(input.mode) as CmsPresenceMode | "";
  if (mode && modeBaselineStateMap[mode]) return modeBaselineStateMap[mode];

  return "unknown";
}

