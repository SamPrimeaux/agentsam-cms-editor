import type { ReactNode } from "react";
import type { CmsPresenceMode, CmsPresenceState, PresenceMotion, PresenceTone } from "./presenceTypes";
import { resolvePresenceDescription } from "./resolvePresenceDescription";
import { resolvePresenceLabel } from "./resolvePresenceLabel";
import { PresenceIcon } from "./PresenceIcon";

function cn(...parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join(" ");
}

export type PresenceInlineProps = {
  mode?: CmsPresenceMode | string | null;
  state?: CmsPresenceState | string | null;
  iconKey?: string | null;
  title?: string | null;
  description?: string | null;
  label?: string | null;
  rightSlot?: ReactNode;
  className?: string;
  motion?: PresenceMotion;
  tone?: PresenceTone;
  size?: "sm" | "md";
};

export function PresenceInline({
  mode,
  state,
  iconKey,
  title,
  description,
  label,
  rightSlot,
  className,
  motion = "auto",
  tone = "brand",
  size = "md"
}: PresenceInlineProps) {
  const fallbackTitle = resolvePresenceLabel({ mode, state, label: title });
  const meta = resolvePresenceDescription({ mode, state, description });
  const chip = resolvePresenceLabel({ mode, state, label });

  return (
    <div className={cn("presence", "presenceInline", size === "sm" ? "presenceInline--sm" : "", className)} data-tone={tone}>
      <PresenceIcon
        mode={mode}
        state={state}
        iconKey={iconKey}
        size={size === "sm" ? "sm" : "md"}
        motion={motion}
        tone={tone}
        aria-label={chip}
      />
      <div className="presenceInline__content">
        <div className="presenceInline__title">{fallbackTitle}</div>
        <div className="presenceInline__meta">{meta}</div>
      </div>
      {rightSlot ? <div>{rightSlot}</div> : <span className="presenceInline__chip">{chip}</span>}
    </div>
  );
}

