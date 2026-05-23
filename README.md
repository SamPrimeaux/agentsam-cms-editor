# Agent Sam CMS Editor

Standalone Cloudflare Worker for IAM platform command center: Design Studio CMS, real D1 dashboards, Thompson eval proof, and deploy history.

**Live:** https://agentsam-cms-editor.meauxbility.workers.dev/  
**Worker:** `agentsam-cms-editor`  
**D1:** `inneranimalmedia-business` · **R2:** `cms`

## Repo layout

```
src/
  index.ts              # Worker router
  api/                  # GET /api/v1/*
  lib/                  # d1 helpers, 60s TTL cache
public/                 # MPA assets
evals/                  # Tier 1/2 eval suite (Phase 4 runners)
wrangler.jsonc          # Wrangler config (canonical)
```

## API (Phase 1)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/overview` | Platform KPIs, 30d activity, Thompson summary, top models |
| `GET /api/v1/health` | ETO metrics, provider health, arm coverage, deploy history |
| `GET /api/v1/finance` | AI cost intelligence (30d spend, efficiency, WAI estimate) |
| `GET /api/v1/arms?task_type=` | Thompson arms + leader for task type |
| `GET /api/v1/evals` | Eval suite status (artifacts in `evals/results/`) |
| `GET /api/v1/worker` | Binding liveness (legacy: `/api/health`) |

Responses are cached in-isolate for 60 seconds.

## Commands

```bash
npm install --include=dev
npm run dev
npm run typecheck
npm run deploy:dry
npm run deploy
npm run smoke
npm run smoke:api    # after deploy — hits /api/v1/*
```

Secrets (`OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN`) via `wrangler secret put` — never commit.

## Build phases

1. **API layer** — shipped (`src/api/*`)
2. **Dashboard rewire** — replace mock JS with `fetch('/api/v1/...')`
3. **Landing** — IAM command center (`public/index.html`)
4. **Eval integration** — `POST /api/evals/trigger`, cron, artifact writer
5. **Design Studio** — Thompson selector, publish pipeline, live session

See `AGENTSAM_REPO_RULES.md` for isolation rules vs `inneranimalmedia`.
