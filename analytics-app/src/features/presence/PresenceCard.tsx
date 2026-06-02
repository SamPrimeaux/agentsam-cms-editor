import type { ReactNode } from "react";
import type { CmsPresenceMode, CmsPresenceState, PresenceMotion, PresenceTone } from "./presenceTypes";
import { resolvePresenceDescription } from "./resolvePresenceDescription";
import { resolvePresenceLabel } from "./resolvePresenceLabel";
import { PresenceIcon } from "./PresenceIcon";

function cn(...parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join(" ");
}

export type PresenceCardProps = {
  mode?: CmsPresenceMode | string | null;
  state?: CmsPresenceState | string | null;
  iconKey?: string | null;
  title?: string | null;
  description?: string | null;
  label?: string | null;
  footer?: string | null;
  children?: ReactNode;
  className?: string;
  motion?: PresenceMotion;
  tone?: PresenceTone;
};

export function PresenceCard({
  mode,
  state,
  iconKey,
  title,
  description,
  label,
  footer,
  children,
  className,
  motion = "auto",
  tone = "brand"
}: PresenceCardProps) {
  const resolvedTitle = resolvePresenceLabel({ mode, state, label: title });
  const resolvedDesc = resolvePresenceDescription({ mode, state, description });
  const chip = resolvePresenceLabel({ mode, state, label });

  return (
    <section className={cn("presence", "presenceCard", className)} data-tone={tone} aria-label={chip}>
      <header className="presenceCard__head">
        <div>
          <h3 className="presenceCard__title">{resolvedTitle}</h3>
          <p className="presenceCard__desc">{resolvedDesc}</p>
        </div>
        <span className="presenceInline__chip">{chip}</span>
      </header>
      <div className="presenceCard__stage">
        <PresenceIcon mode={mode} state={state} iconKey={iconKey} size="lg" motion={motion} tone={tone} aria-label={chip} />
      </div>
      {children}
      {footer ? <footer className="presenceCard__footer">{footer}</footer> : null}
    </section>
  );
}

