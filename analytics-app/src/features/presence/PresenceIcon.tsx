import type { CSSProperties, ReactElement } from "react";
import type {
  CmsPresenceMode,
  CmsPresenceState,
  PresenceIconSize,
  PresenceMotion,
  PresenceTone
} from "./presenceTypes";
import { resolvePresenceIconKey } from "./resolvePresenceIconKey";

export type PresenceIconProps = {
  mode?: CmsPresenceMode | string | null;
  state?: CmsPresenceState | string | null;
  iconKey?: string | null;
  size?: PresenceIconSize;
  title?: string;
  className?: string;
  motion?: PresenceMotion;
  tone?: PresenceTone;
  "aria-label"?: string;
};

type IconSvgProps = {
  className?: string;
  title?: string;
};

function cn(...parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join(" ");
}

function normalizeToken(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function resolveModeColorVar(mode: unknown): string {
  const m = normalizeToken(mode).toLowerCase();
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
}

function resolveAutoMotion(state: unknown): Exclude<PresenceMotion, boolean> {
  const s = normalizeToken(state);
  switch (s) {
    case "loading":
    case "syncing":
    case "publishing":
      return "spin";
    case "thinking":
    case "queued":
      return "pulse";
    case "uploading":
    case "generating":
      return "glow";
    default:
      return "none";
  }
}

function sizeClass(size: PresenceIconSize | undefined): string {
  if (!size) return "presenceIcon--md";
  if (typeof size === "number") return "";
  switch (size) {
    case "xs":
      return "presenceIcon--xs";
    case "sm":
      return "presenceIcon--sm";
    case "md":
      return "presenceIcon--md";
    case "lg":
      return "presenceIcon--lg";
  }
}

function IconSpark({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <line className="presenceStroke presenceMotion--pulse" x1="24" y1="5" x2="24" y2="11" />
      <line className="presenceStroke presenceMotion--pulse" x1="24" y1="37" x2="24" y2="43" />
      <line className="presenceStroke presenceMotion--pulse" x1="5" y1="24" x2="11" y2="24" />
      <line className="presenceStroke presenceMotion--pulse" x1="37" y1="24" x2="43" y2="24" />
      <line className="presenceStroke presenceMotion--pulse" x1="11" y1="11" x2="15" y2="15" />
      <line className="presenceStroke presenceMotion--pulse" x1="33" y1="33" x2="37" y2="37" />
      <circle className="presenceFill presenceMotion--pulse" cx="24" cy="24" r="3" />
    </svg>
  );
}

function IconLoading({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <circle className="presenceStroke presenceMotion--spin" cx="24" cy="24" r="15" />
      <path className="presenceStroke presenceMotion--dash" d="M24 9a15 15 0 0 1 15 15" />
    </svg>
  );
}

function IconSync({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path
        className="presenceStroke presenceMotion--dash"
        d="M15 18a12 12 0 0 1 20-4"
      />
      <path
        className="presenceStroke presenceMotion--dash"
        d="M33 30a12 12 0 0 1-20 4"
      />
      <path className="presenceStroke" d="M35 14v8h-8" />
      <path className="presenceStroke" d="M13 34v-8h8" />
    </svg>
  );
}

function IconSave({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path className="presenceStroke" d="M14 12h16l4 4v20H14z" />
      <path className="presenceStroke" d="M18 12v10h12V12" />
      <rect className="presenceFill presenceMotion--pulse" x="18" y="28" width="12" height="8" rx="3" />
    </svg>
  );
}

function IconUpload({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path className="presenceStroke" d="M24 30V14" />
      <path className="presenceStroke" d="M18 20l6-6 6 6" />
      <path className="presenceStroke presenceMotion--dash" d="M12 34h24" />
    </svg>
  );
}

function IconQueued({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect className="presenceFill presenceMotion--pulse" x="11" y="12" width="26" height="6" rx="3" />
      <rect className="presenceFill presenceMotion--pulse" x="11" y="21" width="20" height="6" rx="3" />
      <rect className="presenceFill presenceMotion--pulse" x="11" y="30" width="28" height="6" rx="3" />
    </svg>
  );
}

function IconApproval({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path className="presenceStroke" d="M15 17h18v16H15z" />
      <path className="presenceStroke presenceMotion--dash" d="M18 22h12" />
      <path className="presenceStroke presenceMotion--dash" d="M18 27h10" />
      <path className="presenceStroke" d="M24 8v6" />
      <circle className="presenceFill presenceMotion--pulse" cx="24" cy="37" r="2.5" />
    </svg>
  );
}

function IconReview({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <circle className="presenceStroke" cx="21" cy="21" r="9" />
      <path className="presenceStroke presenceMotion--dash" d="M27 27l11 11" />
      <circle className="presenceFill presenceMotion--pulse" cx="21" cy="21" r="2.5" />
    </svg>
  );
}

function IconPublish({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path className="presenceStroke presenceMotion--dash" d="M24 34V14" />
      <path className="presenceStroke" d="M18 20l6-6 6 6" />
      <path className="presenceStroke" d="M14 34h20" />
      <circle className="presenceFill presenceMotion--pulse" cx="38" cy="34" r="3" />
    </svg>
  );
}

function IconComplete({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <circle className="presenceStroke" cx="24" cy="24" r="15" />
      <path className="presenceStroke presenceMotion--dash" d="M16 25l6 6 12-15" />
    </svg>
  );
}

function IconFailed({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <circle className="presenceStroke" cx="24" cy="24" r="15" />
      <path className="presenceStroke" d="M19 19l10 10" />
      <path className="presenceStroke" d="M29 19l-10 10" />
    </svg>
  );
}

function IconBlocked({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path className="presenceStroke" d="M16 22v-3a8 8 0 0 1 16 0v3" />
      <rect className="presenceStroke" x="14" y="22" width="20" height="16" rx="5" />
      <circle className="presenceFill presenceMotion--pulse" cx="24" cy="30" r="2.5" />
    </svg>
  );
}

function IconThinking({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <circle className="presenceFill presenceMotion--pulse" cx="16" cy="24" r="3" />
      <circle className="presenceFill presenceMotion--pulse" cx="24" cy="24" r="3" />
      <circle className="presenceFill presenceMotion--pulse" cx="32" cy="24" r="3" />
    </svg>
  );
}

function IconGenerate({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path className="presenceStroke presenceMotion--dash" d="M24 10v10" />
      <path className="presenceStroke presenceMotion--dash" d="M24 28v10" />
      <path className="presenceStroke presenceMotion--dash" d="M10 24h10" />
      <path className="presenceStroke presenceMotion--dash" d="M28 24h10" />
      <circle className="presenceFill presenceMotion--glow presenceMotion--pulse" cx="24" cy="24" r="4" />
    </svg>
  );
}

function IconDot({ className, title }: IconSvgProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <circle className="presenceFill presenceMotion--pulse" cx="24" cy="24" r="6" />
    </svg>
  );
}

function IconMode({ className, title, kind }: IconSvgProps & { kind: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect className="presenceStroke" x="10" y="12" width="28" height="24" rx="8" />
      <path className="presenceStroke presenceMotion--dash" d="M16 20h16" />
      <path className="presenceStroke presenceMotion--dash" d="M16 28h12" />
      <circle className="presenceFill presenceMotion--pulse" cx="34" cy="28" r="3" />
      <text x="24" y="42" textAnchor="middle" fontSize="0">
        {kind}
      </text>
    </svg>
  );
}

const ICONS: Record<string, (p: IconSvgProps) => ReactElement> = {
  "cms-spark": (p) => <IconSpark {...p} />,
  "cms-loading": (p) => <IconLoading {...p} />,
  "cms-sync": (p) => <IconSync {...p} />,
  "cms-save": (p) => <IconSave {...p} />,
  "cms-upload": (p) => <IconUpload {...p} />,
  "cms-queued": (p) => <IconQueued {...p} />,
  "cms-approval": (p) => <IconApproval {...p} />,
  "cms-review": (p) => <IconReview {...p} />,
  "cms-publish": (p) => <IconPublish {...p} />,
  "cms-complete": (p) => <IconComplete {...p} />,
  "cms-failed": (p) => <IconFailed {...p} />,
  "cms-blocked": (p) => <IconBlocked {...p} />,
  "cms-thinking": (p) => <IconThinking {...p} />,
  "cms-generate": (p) => <IconGenerate {...p} />,
  "cms-dot": (p) => <IconDot {...p} />,
  "cms-edit": (p) => <IconMode {...p} kind="edit" />,
  "cms-design": (p) => <IconMode {...p} kind="design" />,
  "cms-preview": (p) => <IconMode {...p} kind="preview" />,
  "cms-content": (p) => <IconMode {...p} kind="content" />,
  "cms-media": (p) => <IconMode {...p} kind="media" />,
  "cms-workflow": (p) => <IconMode {...p} kind="workflow" />,
  "cms-settings": (p) => <IconMode {...p} kind="settings" />
};

export function PresenceIcon({
  mode,
  state,
  iconKey,
  size = "md",
  title,
  className,
  motion = "auto",
  tone = "brand",
  "aria-label": ariaLabel
}: PresenceIconProps) {
  const resolvedKey = resolvePresenceIconKey({ mode, state, iconKey });
  const Icon = ICONS[resolvedKey] ?? ICONS["cms-spark"];

  const motionResolved: Exclude<PresenceMotion, boolean> =
    motion === true ? "auto" : motion === false ? "none" : motion;
  const motionClass =
    motionResolved === "auto"
      ? resolveAutoMotion(state) === "none"
        ? ""
        : `presenceMotion--${resolveAutoMotion(state)}`
      : motionResolved === "none"
        ? ""
        : `presenceMotion--${motionResolved}`;

  const style: CSSProperties =
    typeof size === "number"
      ? { width: size, height: size, ["--presence-icon-color" as string]: resolveModeColorVar(mode) }
      : { ["--presence-icon-color" as string]: resolveModeColorVar(mode) };

  return (
    <span
      className={cn("presence", "presenceIcon", sizeClass(size), motionClass, className)}
      data-tone={tone}
      style={style}
      aria-label={ariaLabel}
      title={title}
    >
      <Icon className={cn("presenceSvg")} title={ariaLabel ?? title} />
    </span>
  );
}

