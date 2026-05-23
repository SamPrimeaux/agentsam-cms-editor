# agentsam-cms-editor — Cursor Brief
# Last updated: 2026-05-23

## What this repo is

Standalone Cloudflare Worker sandbox at:
- https://agentsam-cms-editor.meauxbility.workers.dev/
- git@github.com:SamPrimeaux/agentsam-cms-editor.git
- local: `/Users/samprimeaux/agentsam-cms-editor`

**Hard boundary:** this repo NEVER touches `/Users/samprimeaux/inneranimalmedia`.
Deploy only to worker `agentsam-cms-editor`.

## Runtime bindings

| Binding | Target |
|---------|--------|
| DB | D1 `inneranimalmedia-business` (`cf87b717-d4e2-4cf8-bab0-a81268e32d49`) |
| DASHBOARD | R2 `cms` |
| ASSETS | static `public/` |
| Secrets | `OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN` (CF dashboard only) |

Account: `ede6590ac0d2fb7daf155b35653457b2`

## Workflow-driven buildout (D1 source of truth)

Execute workflows in D1 — do not re-scaffold from scratch:

1. `wf_analytics_dashboard_three_page_e2e` — analytics dashboard E2E
2. `wf_cms_live_editor_dev_app` — CMS live editor dev app (R2 dev prefix)

## Live API routes (real D1)

| Route | Data |
|-------|------|
| `GET /api/analytics/overview` | KPIs, 30d activity, Thompson arms, top models |
| `GET /api/analytics/health` | ETO provider health, arm coverage, deploys |
| `GET /api/analytics/finance` | AI cost intelligence (30d) |
| `GET /api/analytics/arms?task_type=` | Thompson arms |

Aliases: `/api/v1/*` (same handlers). Worker liveness: `/api/health`.

Dashboard pages fetch `/api/analytics/*` (see `public/dashboard/dashboard.js`).

## Eval suite (two-tier)

**Tier 1** — intent classification (`evals/tier1_intent_classification.py`)
- 30 prompts: traffic-weighted (`chat` 74%, `code`, `tool_use`, `code_patch`, …)
- 8 candidates including eval-only challengers (`arm_id: null`)
- Partial credit via `evals/lib/scoring.py` (`ACCEPTABLE` alternatives)
- Metrics: accuracy, calibration_gap, cost_per_correct_at_10k_day
- Thompson: `proposed_thompson_updates` in artifact only — apply via `evals/apply_thompson_proposals.py`

**Tier 2** — subagent spawn stress (`evals/tier2_subagent_spawn.py`)
- 5 scenarios × 5 model combos (use `--smoke-only` first)
- Scores: completion, quality, routing_accuracy, cost_per_quality_point
- Feeds multitask / code / plan / tool_use arms (proposed, not auto-applied)

```bash
python3 evals/tier1_intent_classification.py          # stub providers
python3 evals/tier1_intent_classification.py --live # needs API keys
python3 evals/tier2_subagent_spawn.py --smoke-only
python3 evals/apply_thompson_proposals.py --artifact evals/results/<file>.json --dry-run
```

`POST /api/evals/trigger` — Phase 4 (KV + cron + PTY).

## Cookbook

`scripts/build/build_agentsam_cookbook.py` — syncs `agent_recipe_prompts` → `agentsam_cookbook` via CF D1 REST API.

## Deploy

```bash
npm install --include=dev
npm run typecheck
npx wrangler deploy -c wrangler.toml
npm run smoke
npm run smoke:api
```

Never commit secrets. Never create a second worker name.
