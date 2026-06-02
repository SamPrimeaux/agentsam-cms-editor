import type { CmsPresenceMode, CmsPresenceState } from "./presenceTypes";
import {
  CMS_PRESENCE_FALLBACK_ICON_KEY,
  modeBaselineIconMap,
  modeBaselineStateMap,
  modePresenceStateMap,
  stateIconMap
} from "./presenceMaps";

type ResolvePresenceIconKeyInput = {
  mode?: CmsPresenceMode | string | null;
  state?: CmsPresenceState | string | null;
  iconKey?: string | null;
};

function normalizeToken(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

export function resolvePresenceIconKey({
  mode,
  state,
  iconKey
}: ResolvePresenceIconKeyInput): string {
  const explicit = normalizeToken(iconKey);
  if (explicit) return explicit;

  const m = normalizeToken(mode) as CmsPresenceMode | "";
  const s = normalizeToken(state) as CmsPresenceState | "";

  const modeStateIcon = m && s ? modePresenceStateMap[m]?.[s] : undefined;
  if (modeStateIcon) return modeStateIcon;

  const stateOnlyIcon = s ? stateIconMap[s] : undefined;
  if (stateOnlyIcon) return stateOnlyIcon;

  const baselineState = m ? modeBaselineStateMap[m] : undefined;
  const baselineViaState = baselineState ? stateIconMap[baselineState] : undefined;
  if (baselineViaState) return baselineViaState;

  const baselineViaMode = m ? modeBaselineIconMap[m] : undefined;
  if (baselineViaMode) return baselineViaMode;

  return CMS_PRESENCE_FALLBACK_ICON_KEY;
}

