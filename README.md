# Agent Sam CMS Editor

[![Live Worker](https://img.shields.io/badge/worker-agentsam--cms--editor-orange)](https://agentsam-cms-editor.meauxbility.workers.dev/)
[![D1](https://img.shields.io/badge/D1-inneranimalmedia--business-blue)](https://developers.cloudflare.com/d1/)

**Standalone Cloudflare sandbox** for Agent Sam platform tooling: live D1 analytics APIs, a React analytics dashboard, Thompson routing evals, recipe cookbook sync, and (planned) CMS / Design Studio surfaces.

| | |
|---|---|
| **Live URL** | https://agentsam-cms-editor.meauxbility.workers.dev/ |
| **GitHub** | `git@github.com:SamPrimeaux/agentsam-cms-editor.git` |
| **Worker name** | `agentsam-cms-editor` (do not create aliases) |
| **Production app** | [inneranimalmedia](https://github.com/SamPrimeaux/inneranimalmedia) — **never edited from this repo** |

---

## Table of contents

1. [What this repo is (and is not)](#what-this-repo-is-and-is-not)
2. [Architecture](#architecture)
3. [Python Worker runtime](#python-worker-runtime)
4. [Repository layout](#repository-layout)
5. [Cloudflare bindings](#cloudflare-bindings)
6. [HTTP API reference](#http-api-reference)
7. [Analytics React app](#analytics-react-app)
8. [Mirror contract with inneranimalmedia](#mirror-contract-with-inneranimalmedia)
9. [Eval suite (Tier 1 & Tier 2)](#eval-suite-tier-1--tier-2)
10. [Cookbook sync (`agentsam_cookbook`)](#cookbook-sync-agentsam_cookbook)
11. [D1 workflows (Agent Sam registry)](#d1-workflows-agent-sam-registry)
12. [Local development](#local-development)
13. [Deploy & smoke tests](#deploy--smoke-tests)
14. [Branches](#branches)
15. [Secrets & security](#secrets--security)
16. [Troubleshooting](#troubleshooting)
17. [Further reading](#further-reading)

---

## What this repo is (and is not)

### This repo **is**

- A **safe edge sandbox** on the same Cloudflare account and D1 database as Inner Animal Media, but deployed to its **own Worker**.
- A place to prove **SQL, APIs, React components, and eval math** before porting patterns into production.
- The home of **`analytics-app/`** — a Vite + React 19 SPA subagents extend under D1 workflow `wf_analytics_dashboard_three_page_e2e`.
- A **Python Worker** (`src/entry.py`) that serves APIs + static assets; eval code under `evals/` is Python and can share logic with the Worker over time.

### This repo is **not**

- The IAM production dashboard or Worker (`inneranimalmedia`). No paths under `/Users/samprimeaux/inneranimalmedia` should be modified from here.
- A second production deploy target. One Worker name: **`agentsam-cms-editor`**.
- A place to commit API keys, `.env`, or `.dev.vars`.

Isolation rules: [`AGENTSAM_REPO_RULES.md`](./AGENTSAM_REPO_RULES.md).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  /  /design-studio  /dashboard/{overview,finance,health}         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Cloudflare Worker: agentsam-cms-editor                          │
│  Runtime: Python (Pyodide) — src/entry.py                        │
│  • /api/analytics/*  /api/v1/*  → D1 via env.DB (FFI)            │
│  • /dashboard/*      → ASSETS → public/analytics/ (Vite build)   │
│  • /api/evals/*      → stub / status (full matrix = CLI)         │
└────────────┬───────────────────────────────┬──────────────────────┘
             │                             │
     ┌───────▼────────┐            ┌───────▼────────┐
     │ D1              │            │ R2 + Assets     │
     │ inneranimalmedia│            │ cms bucket      │
     │ -business       │            │ public/         │
     └────────────────┘            └────────────────┘
```

**Request path**

1. `run_worker_first` routes in `wrangler.toml` send `/api/*` and `/dashboard/*` to the Worker.
2. Python `fetch()` dispatches by pathname.
3. D1 queries run through `lib/d1.py` (`prepare` → `first` / `all`).
4. Dashboard HTML/JS is served from `public/analytics/` (built from `analytics-app/`).

---

## Python Worker runtime

On branch **`python/cms-worker`** (and after merge to `main`), the Worker entry is **`src/entry.py`** with:

```toml
main = "src/entry.py"
compatibility_flags = ["python_workers"]
```

### How it works (short version)

| Phase | What happens |
|--------|----------------|
| **Deploy** | CPython via **Pyodide** (WASM) initializes; Cloudflare snapshots memory for fast cold starts. |
| **Request** | Same V8 isolate model as JS Workers; bindings are unchanged. |
| **FFI** | `self.env.DB`, `self.env.DASHBOARD`, `self.env.ASSETS` call through to JavaScript bindings. |

You write Python; D1 still feels like:

```python
from lib import d1

row = await d1.first(db, "SELECT COUNT(*) AS n FROM agentsam_workflow_runs")
```

### Why Python here

- **`evals/` is already Python** — scoring, taxonomy, cost models, Thompson proposals.
- Ergonomic HTTP / validation later (`httpx`, `pydantic`) for MCP-style tools.
- Proves queries and handlers that inform production `inneranimalmedia` JS APIs.

**Limitation:** Full Tier 1 eval (30 prompts × 8 models) is **CLI-only** today. The Worker exposes status + a small `POST /api/evals/run` stub; production trigger path is Phase 4 (queue + KV + cron).

---

## Repository layout

```
agentsam-cms-editor/
├── src/
│   ├── entry.py                 # WorkerEntrypoint — routing, assets, cache
│   ├── evals_runner.py          # Inline eval stub for POST /api/evals/run
│   ├── api/
│   │   ├── overview.py          # Platform KPIs, 30d activity, top models
│   │   ├── health.py            # ETO health, arms, deploys
│   │   ├── finance.py           # 30d spend, efficiency, Workers AI estimate
│   │   ├── arms.py              # Thompson routing arms
│   │   └── evals.py             # Eval status from D1 / artifacts
│   └── lib/
│       ├── d1.py                # D1 helpers + row_val() for FFI rows
│       ├── cache.py             # In-isolate TTL cache (60s)
│       ├── http.py              # JSON + CORS
│       └── analytics_handlers.py
├── analytics-app/               # Vite React 19 — edit here, not public/
│   ├── src/
│   │   ├── pages/               # Overview, Finance, Health
│   │   ├── components/          # kpi, charts, tables, shell
│   │   ├── portable/            # Barrel for IAM port (see contract doc)
│   │   ├── api/client.ts
│   │   └── types/analytics-api.ts
│   └── package.json
├── public/
│   ├── index.html               # IAM command-center landing
│   ├── design-studio.html
│   └── analytics/               # Generated — npm run build:analytics
├── evals/
│   ├── tier1_intent_classification.py
│   ├── tier2_subagent_spawn.py
│   ├── apply_thompson_proposals.py
│   ├── lib/                     # taxonomy, scoring, providers, cost, d1_writer
│   └── results/                 # gitignored JSON artifacts
├── scripts/
│   ├── build/
│   │   ├── build_analytics_app.sh
│   │   └── build_agentsam_cookbook.py   # agent_recipe_prompts → agentsam_cookbook
│   └── smoke/
│       ├── smoke_endpoints.py
│       └── smoke_api_v1.py
├── docs/
│   ├── ANALYTICS_PORTABLE_CONTRACT.md
│   └── WORKFLOW_ANALYTICS_REACT_BUILDOUT.md
├── wrangler.toml / wrangler.jsonc
├── pyproject.toml                 # workers-py dev deps
├── package.json                   # wrangler + analytics build scripts
├── CURSOR_BRIEF.md                # Agent/Cursor session anchor
└── AGENTSAM_REPO_RULES.md
```

---

## Cloudflare bindings

| Binding | Resource | Purpose |
|---------|----------|---------|
| `DB` | D1 `inneranimalmedia-business` | All analytics + eval status queries |
| `DASHBOARD` | R2 `cms` | CMS / dashboard blobs (Design Studio path) |
| `ASSETS` | `public/` | Static site + built analytics SPA |
| `OPENAI_API_KEY` | Secret | Eval live runs, future agent routes |
| `CLOUDFLARE_API_TOKEN` | Secret | Optional; cookbook script uses env locally |

D1 database ID: `cf87b717-d4e2-4cf8-bab0-a81268e32d49`  
Account ID: `ede6590ac0d2fb7daf155b35653457b2`

---

## HTTP API reference

All JSON responses use `Content-Type: application/json`. Analytics routes are cached **60 seconds** in-isolate.

### Analytics (dashboard-facing)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/overview` | Platform KPIs, 30d workflow activity, arms summary, top models |
| `GET` | `/api/analytics/health` | ETO provider health, arm coverage, recent deploys |
| `GET` | `/api/analytics/finance` | 30d AI spend by model, daily trend, Workers AI estimate |
| `GET` | `/api/analytics/arms` | Query: `task_type`, `mode`, `limit` — Thompson arms + leader |

### Versioned aliases (`/api/v1/*`)

Same handlers as analytics where noted:

| Method | Path |
|--------|------|
| `GET` | `/api/v1/overview` |
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/finance` |
| `GET` | `/api/v1/arms` |
| `GET` | `/api/v1/evals` |
| `GET` | `/api/v1/worker` |

### Worker meta

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness + binding flags (`runtime: python`) |
| `GET` | `/api/audit` | Route map for debugging |

### Evals

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/evals` | Tier 1/2 last-run hints from D1 `agentsam_eval_runs` when present |
| `POST` | `/api/evals/trigger` | **501** — reserved for queue/cron integration |
| `POST` | `/api/evals/run` | Small inline stub (not full tier1 matrix) |

### Pages & SPA

| Path | Served from |
|------|-------------|
| `/` | `public/index.html` |
| `/design-studio` | `public/design-studio.html` |
| `/dashboard/overview` | `public/analytics/index.html` (React router) |
| `/dashboard/finance` | same SPA |
| `/dashboard/health` | same SPA |
| `/analytics` | 307 → `/dashboard/overview` |

### Example

```bash
curl -sS "https://agentsam-cms-editor.meauxbility.workers.dev/api/analytics/overview" | jq .
curl -sS "https://agentsam-cms-editor.meauxbility.workers.dev/api/v1/worker" | jq .
```

---

## Analytics React app

Subagents and humans **edit `analytics-app/` only**. The Worker serves the **build output** at `public/analytics/`.

### Dev loop

```bash
# Terminal A — Vite with HMR (proxies API to deployed worker or wrangler dev)
cd analytics-app && npm install && npm run dev

# Terminal B — Worker + D1 (from repo root)
npm install --include=dev
npm run dev
```

### Production build (required before deploy)

```bash
npm run build:analytics   # → public/analytics/
npm run typecheck         # analytics-app tsc
```

### Portable exports

[`analytics-app/src/portable/index.ts`](./analytics-app/src/portable/index.ts) exports `KpiCard`, `KpiGrid`, `ActivityLineChart`, `SimpleTable`, formatters, and API types. These are the **only** UI surfaces promoted to production — see mirror contract below.

Workflow file contract: [`docs/WORKFLOW_ANALYTICS_REACT_BUILDOUT.md`](./docs/WORKFLOW_ANALYTICS_REACT_BUILDOUT.md).

---

## Mirror contract with inneranimalmedia

Production IAM imports sandbox components; APIs stay separate.

| Sandbox (this repo) | Production (`inneranimalmedia`) |
|---------------------|----------------------------------|
| `analytics-app/src/components/*` | `dashboard/components/analytics/portable/` |
| `GET /api/analytics/overview` (simpler JSON) | `GET /api/analytics/overview?range=7d` → rich `PulseResponse` |
| Python SQL in `src/api/*.py` | `src/api/analytics/overview.js` |

Full mapping: [`docs/ANALYTICS_PORTABLE_CONTRACT.md`](./docs/ANALYTICS_PORTABLE_CONTRACT.md).

**Rule:** Prove UI + SQL here first; port components + adapters to IAM. Do **not** copy `DashboardShell` — IAM uses `AnalyticsShell`.

---

## Eval suite (Tier 1 & Tier 2)

Offline-first Python runners write JSON artifacts to `evals/results/` and can update D1 via `evals/lib/d1_writer.py`.

### Tier 1 — Intent classification

**Script:** `evals/tier1_intent_classification.py`

- 30 traffic-weighted prompts (`chat`, `code`, `tool_use`, `code_patch`, …)
- 8 model candidates (including eval-only challengers)
- Partial credit via `evals/lib/scoring.py`
- Outputs: accuracy, calibration gap, cost projections, **`proposed_thompson_updates`** (never auto-applied)

```bash
python3 evals/tier1_intent_classification.py           # stub providers
python3 evals/tier1_intent_classification.py --live   # needs OPENAI_API_KEY etc.
```

### Tier 2 — Subagent spawn stress

**Script:** `evals/tier2_subagent_spawn.py`

- 5 scenarios × 5 model combos
- Use `--smoke-only` before a full run

```bash
python3 evals/tier2_subagent_spawn.py --smoke-only
```

### Apply Thompson proposals (manual)

```bash
python3 evals/apply_thompson_proposals.py \
  --artifact evals/results/<timestamp>_tier1_intent_classification.json \
  --dry-run
```

Remove `--dry-run` only after reviewing proposed arm deltas.

---

## Cookbook sync (`agentsam_cookbook`)

Materializes D1 table **`agentsam_cookbook`** from **`agent_recipe_prompts`** (53 recipes as of last sync).

```bash
export CLOUDFLARE_API_TOKEN=...   # or use .env.cloudflare via inneranimalmedia's wrapper
python3 scripts/build/build_agentsam_cookbook.py --dry-run
python3 scripts/build/build_agentsam_cookbook.py
```

**Note:** Cloudflare D1 REST API does not accept `ON CONFLICT DO UPDATE`; the script uses `DELETE` + `INSERT` refresh.

Verify:

```bash
npx wrangler d1 execute inneranimalmedia-business --remote \
  --command "SELECT COUNT(*) AS n FROM agentsam_cookbook;"
```

---

## D1 workflows (Agent Sam registry)

Execute from D1 — do not re-scaffold:

| `workflow_key` | Purpose |
|----------------|---------|
| `wf_analytics_dashboard_three_page_e2e` | React analytics buildout in `analytics-app/` |
| `wf_cms_live_editor_dev_app` | CMS live editor dev R2 prefix |
| `wf_python_cms_worker_buildout` | (planned) Python Worker scaffold → deploy smoke |

---

## Local development

### Prerequisites

- Node.js 20+ and `npm`
- Python 3.12+ (evals + smoke scripts)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) 4.x
- Cloudflare account access to D1 `inneranimalmedia-business`
- Optional: `uv` / `workers-py` for Python Worker local dev

### Install

```bash
git clone git@github.com:SamPrimeaux/agentsam-cms-editor.git
cd agentsam-cms-editor
npm install --include=dev
```

### Python Worker dev deps (optional)

```bash
uv sync   # installs workers-py from pyproject.toml
```

### Run locally

```bash
npm run dev              # wrangler dev (Python Worker + assets)
npm run dev:analytics    # Vite only on analytics-app
```

---

## Deploy & smoke tests

### Deploy

```bash
npm run build:analytics    # always before deploy
npm run deploy:dry         # bundle check, no upload
npm run deploy             # build + wrangler deploy
```

Cloudflare Builds may auto-deploy **`main`**; dashboard asset changes require a local `npm run deploy` (or build step in CI) so `public/analytics/` is current.

### Smoke

```bash
npm run smoke              # HTML / route checks
npm run smoke:api          # JSON endpoints on live URL
# custom base:
python3 scripts/smoke/smoke_api_v1.py https://agentsam-cms-editor.meauxbility.workers.dev
```

**Success criteria**

- `GET /api/analytics/overview` → HTTP 200, `"ok": true`, non-null D1 fields
- `GET /api/v1/worker` → `"runtime": "python"` (on `python/cms-worker` deploy)
- `/dashboard/overview` → React app loads; network shows `/api/analytics/overview` 200

---

## Branches

| Branch | State |
|--------|--------|
| `main` | React analytics SPA + TypeScript Worker (last tagged deploy) |
| `python/cms-worker` | **Python Worker** migration — same APIs + `analytics-app/` |

Merge `python/cms-worker` → `main` after live deploy + smoke on Python runtime.

---

## Secrets & security

| Secret | Set via | Used for |
|--------|---------|----------|
| `OPENAI_API_KEY` | `wrangler secret put` | Live evals, future agent chat |
| `CLOUDFLARE_API_TOKEN` | Dashboard / local `.env` | Cookbook D1 REST script only |

Never commit secrets. Never call OpenAI from browser code. See [`AGENTSAM_REPO_RULES.md`](./AGENTSAM_REPO_RULES.md).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Dashboard blank, API 200 | Stale `public/analytics/` | `npm run build:analytics && npm run deploy` |
| D1 counts zero / errors | Wrong DB or local vs remote | Use `--remote` on wrangler D1; confirm binding ID in `wrangler.toml` |
| `agentsam_cookbook` missing | Script not run or REST UPSERT | Run `build_agentsam_cookbook.py` (delete+insert path) |
| Eval POST returns stub only | By design | Run full matrix via `evals/tier1_*.py` CLI |
| Python deploy fails | Missing `python_workers` flag | Check `wrangler.toml` `compatibility_flags` |
| CORS from local Vite | API on different origin | Proxy in Vite config or hit deployed worker URL |

---

## Further reading

- [`CURSOR_BRIEF.md`](./CURSOR_BRIEF.md) — session anchor for Cursor / Agent Sam
- [`AGENTSAM_REPO_RULES.md`](./AGENTSAM_REPO_RULES.md) — isolation and deploy warnings
- [`docs/ANALYTICS_PORTABLE_CONTRACT.md`](./docs/ANALYTICS_PORTABLE_CONTRACT.md) — IAM port map
- [`docs/WORKFLOW_ANALYTICS_REACT_BUILDOUT.md`](./docs/WORKFLOW_ANALYTICS_REACT_BUILDOUT.md) — subagent file ownership

---

## License & ownership

Private repository — Inner Animal Media / Agent Sam platform. All rights reserved unless otherwise noted by the repo owner.
