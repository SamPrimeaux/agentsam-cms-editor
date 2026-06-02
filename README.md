# agentsam-cms-editor

[![Worker](https://img.shields.io/badge/worker-agentsam--cms--editor-orange)](https://agentsam-cms-editor.meauxbility.workers.dev/)
[![Design Studio](https://img.shields.io/badge/design--studio-live-brightgreen)](https://agentsam-cms-editor.meauxbility.workers.dev/design-studio)
[![D1](https://img.shields.io/badge/D1-inneranimalmedia--business-blue)](https://developers.cloudflare.com/d1/)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Cloudflare-blueviolet)](#stack)

**The home of the AgentSam Design Studio** — a Shopify-style, no-code visual web editor built on Cloudflare Workers, D1, R2, and a React/Vite frontend. No-code users drag, drop, and publish. Agent Sam edits alongside them in real time.

---

## URLs

| Surface | URL |
|---------|-----|
| Landing / command center | https://agentsam-cms-editor.meauxbility.workers.dev/ |
| **Design Studio (primary focus)** | https://agentsam-cms-editor.meauxbility.workers.dev/design-studio |
| Analytics dashboard | https://agentsam-cms-editor.meauxbility.workers.dev/dashboard/overview |
| Worker name | `agentsam-cms-editor` — do not alias |
| GitHub | `git@github.com:SamPrimeaux/agentsam-cms-editor.git` |

> **Production IAM app lives at [`SamPrimeaux/inneranimalmedia`](https://github.com/SamPrimeaux/inneranimalmedia) — never modify it from this repo.**

---

## What this repo is

### Primary: Design Studio (`/design-studio`)

A full GUI web editor for the no-code crowd — think Shopify Online Store 2.0 meets Webflow, running entirely on Cloudflare's edge. Target users are clients, marketers, and site owners who should never need to touch code.

**Core editing model:**

```
Editing target (page / template / global / section)
  → Canvas (live preview at Desktop / Tablet / Phone)
    → Section tree (drag-to-reorder)
      → Component fields (inline editing panel)
        → Publish readiness gate
          → Save draft / Publish
```

**Current state (from live /design-studio):**

- Pages panel with status badges (Draft, Published, Saved, Archived)
- Section/component tree with sort_order
- Live field editing panel (eyebrow, heading, subheading, CTAs, layout toggles, image)
- Theme switcher (Clay Editorial, etc.)
- Device preview (Desktop / Tablet / Phone)
- Publish readiness checklist (orphan check, sort order validation, schema health)
- Agent Sam build stream + session log at bottom
- Draft save → D1, R2 artifact queue

### Secondary: Analytics sandbox

Vite + React 19 SPA for platform KPIs, Thompson routing evals, and AI spend dashboards — proven here before porting to the IAM production dashboard.

---

## The rebuildout vision

The `/design-studio` route is being rebuilt as an **epic React/Vite SPA** — a reusable, component-driven GUI editor that any Inner Animal Media client site can plug into.

### Why React + Vite

- Matches the existing `analytics-app/` toolchain — no new build system
- Vite HMR = instant canvas feedback during development
- React component model maps 1:1 to the Pages / Templates / Sections / Globals mental model
- First-class support for `dnd-kit` (drag-and-drop), color pickers, asset uploaders, live preview iframes
- Cloudflare Pages can serve the Vite build; the Worker handles save/publish APIs

### Target UX — what it will feel like

**Topbar:**
```
[Brand / Site]  [Page selector ▼]  [Theme: Clay Editorial ▼]  [Desktop|Tablet|Phone]  [Preview]  [Save draft]  [Publish]
```

**Left panel — Page/Template/Section/Global Library:**

The page selector opens as a command-palette library, not a tiny dropdown:

```
Search pages, templates, sections…

Pages           Templates          Globals           Sections
  Home            Default page       Header            Hero
  About           Landing page       Footer            Services grid
  Services        Blog post          Announcement bar  CTA banner
  Contact         Product page       Navigation        FAQ accordion
  Donate          Donation page      Cookie banner     Team grid
  FAQ             Event page         Popup             Gallery
```

**Center — Live canvas:**
- Iframe preview of the actual rendered page
- Click-to-select sections/components
- Drag-to-reorder sections
- Inline image upload (drag onto canvas or click placeholder)

**Right panel — Fields & Design:**
- Context-aware field editor for the selected component
- Tabs: Content | Design | Theme | SEO
- Color picker bound to CSS variables / theme tokens
- Font selector from theme presets
- Layout toggles (split-left, split-right, centered)

**Bottom — Agent Sam bar:**
- Floating chatbar context-aware to current editing target
- Context chips: `Home page` · `Hero section` · `Desktop` · `Draft` · `Clay Editorial`
- Build stream / session log

---

## Editing target model

Every selectable item is an **editing target** with a type:

| Type | Examples | Notes |
|------|----------|-------|
| `page` | Home, About, Services | Real public pages — editable instances |
| `template` | Default page, Landing page, Blog post | Reusable layout recipes |
| `section` | Hero, CTA banner, FAQ accordion | Drag-and-drop blocks |
| `global` | Header, Footer, Announcement bar | Shared across site — edit with warning |
| `theme` | Clay Editorial, etc. | Visual design system |
| `system` | 404, Search results, Password | Edge-case pages |

**Item states to design:**

| State | Meaning |
|-------|---------|
| Active | Currently selected/editing |
| Draft | Unpublished changes exist |
| Published | Live, no pending changes |
| Saved | Saved but not published |
| Unsaved changes | In-memory edits not yet saved |
| Needs review | Flagged for approval |
| Has issue | Schema/sort_order/orphan error |
| Locked | Read-only (another session editing) |
| Global/Shared | Editing affects entire site |
| Scheduled | Set to publish at a future time |
| Archived | Hidden from active library |

**Three-dot context menu per item:**

- Pages: Rename, Duplicate, Preview, Set as homepage, Change template, Create variant, View live, SEO settings, Archive, Delete
- Templates: Rename, Duplicate, Assign to content type, View pages using this, Set as default, Archive
- Globals: Edit, View where used, Duplicate, Detach from page, Reset to theme default

Destructive actions always require confirmation.

---

## No-code feature checklist

Features the rebuilt Design Studio must support for the no-code target audience:

- [ ] Drag-and-drop section reordering
- [ ] Click-to-edit inline text (heading, subheading, paragraph, CTA labels)
- [ ] Image upload — drag onto canvas, click placeholder, or browse from asset library
- [ ] Color theme picker — select from preset palettes or custom hex
- [ ] Font picker — bound to theme presets
- [ ] Layout toggle — split-left / split-right / centered / full-bleed
- [ ] Device preview toggle (Desktop / Tablet / Phone)
- [ ] Section library — add new sections from a component catalog
- [ ] Template switcher — change the page template without losing content
- [ ] Global element editing with site-wide warning
- [ ] Save draft (auto-save on field blur + manual)
- [ ] Rollback to last published version
- [ ] Publish readiness gate before going live
- [ ] SEO fields (meta title, meta description, OG image, canonical)
- [ ] Page slug / URL editing
- [ ] Schedule publish (future datetime)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite (in `cms-app/`) |
| Styling | CSS variables / theme tokens, Tailwind optional |
| Drag-and-drop | `dnd-kit` |
| Worker / API | Cloudflare Worker (`src/index.js` or `src/entry.py`) |
| Database | D1 `inneranimalmedia-business` (`cms_pages`, `cms_page_sections`, `cms_section_components`, `cms_themes`) |
| Asset storage | R2 `cms` bucket via `ASSETS_BUCKET` binding |
| Auth | AgentSam OAuth (`user_oauth_tokens`) |
| AI assistant | Agent Sam via MCP (`mcp.inneranimalmedia.com`) |

---

## Cloudflare bindings

| Binding | Resource | Purpose |
|---------|----------|---------|
| `DB` | D1 `inneranimalmedia-business` | All CMS data + analytics queries |
| `ASSETS_BUCKET` | R2 `cms` | Page artifacts, uploaded images, compiled assets |
| `ASSETS` | `public/` | Static site + built SPAs |
| `OPENAI_API_KEY` | Secret | Eval live runs, Agent Sam routes |
| `CLOUDFLARE_API_TOKEN` | Secret | Cookbook sync script (local only) |

D1 database ID: `cf87b717-d4e2-4cf8-bab0-a81268e32d49`
Account ID: `ede6590ac0d2fb7daf155b35653457b2`

---

## Repository layout

```
agentsam-cms-editor/
├── cms-app/                    # React/Vite Design Studio SPA (primary focus)
│   ├── src/
│   │   ├── pages/              # Route-level pages (DesignStudio, Library, etc.)
│   │   ├── components/
│   │   │   ├── canvas/         # Live preview iframe + section overlays
│   │   │   ├── panels/         # Left (library), right (fields), bottom (agent)
│   │   │   ├── topbar/         # Page selector, theme picker, device toggle, publish
│   │   │   ├── sections/       # Section component renderers
│   │   │   └── shared/         # Buttons, badges, modals, confirmations
│   │   ├── hooks/              # useDragDrop, useEditTarget, useTheme, usePublish
│   │   ├── store/              # Zustand or Context — editing session state
│   │   ├── api/                # Worker API client (save, publish, load, assets)
│   │   └── types/              # EditTarget, Page, Template, Section, Global, Theme
│   └── package.json
├── analytics-app/              # Vite React 19 analytics SPA (secondary)
│   └── src/
│       ├── pages/              # Overview, Finance, Health
│       ├── components/         # kpi, charts, tables, shell
│       └── portable/           # Barrel for IAM port
├── src/                        # Cloudflare Worker
│   ├── index.js                # Main Worker entry + routing
│   ├── api/
│   │   ├── cms/                # Pages, sections, components, themes CRUD
│   │   ├── analytics/          # Overview, health, finance, arms
│   │   └── assets/             # R2 upload, list, delete
│   └── lib/
│       ├── d1.js               # D1 query helpers
│       ├── r2.js               # R2 asset helpers
│       └── auth.js             # OAuth session resolution
├── public/
│   ├── index.html              # Landing / command center
│   ├── design-studio.html      # Design Studio shell (until SPA takes over)
│   └── analytics/              # Built analytics SPA output
├── evals/                      # Python eval runners (Tier 1 + Tier 2)
├── scripts/
│   ├── build/
│   └── smoke/
├── docs/
│   ├── TEMPLATE_LIBRARY_PLANNING.md
│   ├── ANALYTICS_PORTABLE_CONTRACT.md
│   └── WORKFLOW_ANALYTICS_REACT_BUILDOUT.md
├── wrangler.toml
├── package.json
├── CURSOR_BRIEF.md
└── AGENTSAM_REPO_RULES.md
```

> `cms-app/` is the new home for the Design Studio React/Vite SPA. `analytics-app/` remains for the analytics dashboard. Both build into `public/` subdirectories before deploy.

---

## CMS data model (D1)

The Design Studio reads and writes these tables on `inneranimalmedia-business`:

| Table | Purpose |
|-------|---------|
| `cms_pages` | Page instances (slug, title, template, status, tenant) |
| `cms_page_sections` | Sections assigned to a page with sort_order |
| `cms_section_components` | Component field values within a section |
| `cms_component_templates` | Reusable section/component type definitions |
| `cms_themes` | Theme token sets (colors, fonts, spacing) |

Key invariants:
- No orphan components (`cms_section_components.section_id` must exist in `cms_page_sections`)
- `sort_order` must be contiguous and non-null before publish
- Theme tokens compile to a CSS hash stored on `cms_themes.compiled_css_hash`
- R2 artifact is queued on draft save; finalized on publish

---

## HTTP API reference

### CMS endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/cms/pages` | List pages for workspace |
| `GET` | `/api/cms/pages/:id` | Get page with sections + components |
| `POST` | `/api/cms/pages/:id/draft` | Save draft (D1 + R2 queue) |
| `POST` | `/api/cms/pages/:id/publish` | Run publish readiness gate then publish |
| `GET` | `/api/cms/templates` | List component templates |
| `GET` | `/api/cms/themes` | List available themes |
| `POST` | `/api/cms/assets/upload` | Upload image to R2 |

### Analytics endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/overview` | Platform KPIs, 30d activity, top models |
| `GET` | `/api/analytics/health` | ETO health, arms, deploys |
| `GET` | `/api/analytics/finance` | 30d AI spend by model |
| `GET` | `/api/analytics/arms` | Thompson routing arms |

### Worker meta

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness + binding flags |
| `GET` | `/api/audit` | Route map |

---

## Local development

### Prerequisites

- Node.js 20+ and `npm`
- Python 3.12+ (evals + smoke scripts only)
- Wrangler 4.x
- Cloudflare account access to D1 `inneranimalmedia-business`

### Install

```bash
git clone git@github.com:SamPrimeaux/agentsam-cms-editor.git
cd agentsam-cms-editor
npm install --include=dev
```

### Run locally

```bash
# Worker + D1 local
npm run dev

# Design Studio SPA with HMR (once cms-app/ exists)
cd cms-app && npm install && npm run dev

# Analytics SPA with HMR
cd analytics-app && npm install && npm run dev
```

---

## Deploy

```bash
# Always build SPAs before deploying
npm run build:cms        # cms-app → public/cms/
npm run build:analytics  # analytics-app → public/analytics/

# Deploy Worker + assets
npm run deploy           # wrangler deploy
```

Deploy command for this repo is always `npm run deploy` from repo root (no `:full` suffix — that's the MCP server repo).

### Smoke

```bash
npm run smoke      # HTML + route checks
npm run smoke:api  # JSON endpoints on live worker URL
```

**Success criteria:**
- `/api/health` → 200, `ok: true`
- `/design-studio` → Design Studio SPA loads
- `/api/cms/pages` → returns page list from D1
- `/dashboard/overview` → analytics SPA loads

---

## Branches

| Branch | State |
|--------|-------|
| `main` | Current deploy target |
| `design-studio/rebuildout` | React/Vite SPA rebuildout (primary active branch) |
| `python/cms-worker` | Python Worker experiment (parked) |

---

## Secrets & security

| Secret | Set via | Used for |
|--------|---------|----------|
| `OPENAI_API_KEY` | `wrangler secret put` | Agent Sam routes, evals |
| `CLOUDFLARE_API_TOKEN` | Local `.env` only | Cookbook sync script |

Never commit secrets. Never expose API keys in browser code. See [`AGENTSAM_REPO_RULES.md`](./AGENTSAM_REPO_RULES.md).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Design Studio blank | Stale `public/cms/` | `npm run build:cms && npm run deploy` |
| Analytics blank | Stale `public/analytics/` | `npm run build:analytics && npm run deploy` |
| D1 returns empty | Wrong DB or missing `--remote` | Confirm `database_id` in `wrangler.toml` |
| Image upload fails | R2 binding missing | Check `ASSETS_BUCKET` in `wrangler.toml` bindings |
| Theme not applying | Compiled CSS hash mismatch | Re-save theme or force recompile via `/api/cms/themes/:id/compile` |
| Publish gate fails | Orphan components or null sort_order | Fix schema errors shown in Publish Readiness panel |
| Agent Sam context wrong | Editing target not set | Check context chips in Agent Sam bar |

---

## Further reading

- [`docs/TEMPLATE_LIBRARY_PLANNING.md`](./docs/TEMPLATE_LIBRARY_PLANNING.md) — Page/Template/Section/Global library design
- [`CURSOR_BRIEF.md`](./CURSOR_BRIEF.md) — session anchor for Cursor / Agent Sam
- [`AGENTSAM_REPO_RULES.md`](./AGENTSAM_REPO_RULES.md) — isolation and deploy rules
- [`docs/ANALYTICS_PORTABLE_CONTRACT.md`](./docs/ANALYTICS_PORTABLE_CONTRACT.md) — IAM analytics port map

---

## License & ownership

Private repository — Inner Animal Media / Agent Sam platform. All rights reserved.
