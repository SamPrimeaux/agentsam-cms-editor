## Presence UI Library (CMS)

Single source-of-truth **presence** primitives for the CMS/editor UI: icons, labels/descriptions, inline rows, cards, and a runtime resolver for “what state should we display right now?”

### What this is for

- **Editor surfaces**: canvas load, section/theme operations, save/sync status
- **Workflow panels**: queued/running/complete/failed
- **Publish queues**: awaiting approval / reviewing / publishing
- **Media uploads**: uploading → complete/failed
- **AI-assisted generation**: generating/thinking states

### Canonical modes

`CmsPresenceMode`:

- `edit`
- `design`
- `preview`
- `content`
- `media`
- `workflow`
- `publish`
- `settings`
- `unknown`

### Canonical states

`CmsPresenceState`:

- `idle`
- `active`
- `thinking`
- `loading`
- `generating`
- `saving`
- `syncing`
- `uploading`
- `queued`
- `awaitingApproval`
- `reviewing`
- `publishing`
- `complete` (flash/temporary)
- `failed` (flash/temporary)
- `blocked`
- `unknown`

### Resolver order (icons)

`resolvePresenceIconKey()` is hardened and never throws. Icon resolution order:

1. **explicit `iconKey`**
2. **mode + state** (`modePresenceStateMap`)
3. **state-only** (`stateIconMap`)
4. **mode baseline state** (`modeBaselineStateMap` → `stateIconMap`)
5. **mode baseline icon** (`modeBaselineIconMap`)
6. **fallback**: `cms-spark`

Unknown modes/states, nulls, or legacy labels never crash the UI.

### Runtime state bridge

Use `resolveCmsPresenceState(input)` to convert “what the CMS is doing” into a canonical display state. Priority rules:

- `error` or `workflowFailed` → `failed`
- `blockedReason` → `blocked`
- `hasPendingApproval` / `approvalCount > 0` → `awaitingApproval`
- `workflowQueued` → `queued`
- `isPublishing` → `publishing`
- `isUploading` → `uploading`
- `isSaving` → `saving`
- `isSyncing` → `syncing`
- `isGenerating` → `generating`
- `workflowRunning` → `active`
- `workflowComplete` → `complete` (flash)
- `lastEventType` legacy names (e.g. `workflow.started`, `publish.completed`, …)
- otherwise: **mode baseline state** (no “default mode” concept)

### Usage examples

Editor toolbar save/sync:

```tsx
import { PresenceInline, resolveCmsPresenceState } from "@/features/presence";

const state = resolveCmsPresenceState({ mode: "edit", isSaving, isSyncing, error });
return <PresenceInline mode="edit" state={state} title="Page status" label="Edit" />;
```

Publish panel:

```tsx
import { PresenceCard } from "@/features/presence";

return (
  <PresenceCard
    mode="publish"
    state="awaitingApproval"
    title="Publish review"
    description="Waiting for approval before publishing."
    footer='mode="publish" state="awaitingApproval"'
  />
);
```

Media upload:

```tsx
import { PresenceInline } from "@/features/presence";

return <PresenceInline mode="media" state="uploading" title="Uploading media" />;
```

### Styling + global CSS

Motion + tone styles live in `presenceMotion.css` and are imported globally from the app CSS entry:

- `analytics-app/src/styles/app.css` imports:
  - `../features/presence/presenceMotion.css`

Theme overrides can redefine the CSS variables (e.g. `--cms-mode-*`, `--presence-*-*`) without changing components.

### Adding a new mode/state

- **Add to unions** in `presenceTypes.ts`
- **Add baseline state** in `modeBaselineStateMap`
- **Add optional mode+state icon** in `modePresenceStateMap`
- **Add state icon** in `stateIconMap` if needed
- If needed, add a **legacy event mapping** in `legacySurfaceStateMap`

