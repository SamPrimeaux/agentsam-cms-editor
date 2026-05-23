# Dual runtime: TypeScript stable + Python challenger

Two Cloudflare Workers share **one D1** (`inneranimalmedia-business`) and **one R2** bucket (`cms`), but different names, entrypoints, and dev prefixes — so deploys do not overwrite each other.

| Arm | Worker name | Config | URL |
|-----|-------------|--------|-----|
| **Stable** | `agentsam-cms-editor` | `wrangler.toml` → `src/index.ts` | https://agentsam-cms-editor.meauxbility.workers.dev |
| **Challenger** | `agentsam-cms-python` | `wrangler.python.toml` → `src/entry.py` | https://agentsam-cms-python.meauxbility.workers.dev |

## Collision fixes

### 1. Worker name (URL)

Never deploy Python to `agentsam-cms-editor` and TypeScript to the same name in the same hour. **Last deploy wins.**

```bash
npm run deploy          # TypeScript → agentsam-cms-editor
npm run deploy:python   # Python     → agentsam-cms-python
npm run deploy:both     # both (after build:analytics)
```

### 2. D1 schema

Both Workers read/write the same database. Run schema gap remediation (`wf_cms_editor_schema_gap_remediation` / plan `plan_54203057136a`) before trusting new columns. Keep API response shapes compatible across runtimes.

### 3. Two wrangler configs

| File | `main` | Flags |
|------|--------|-------|
| `wrangler.toml` | `src/index.ts` | (default JS/TS) |
| `wrangler.python.toml` | `src/entry.py` | `python_workers`, `disable_python_external_sdk` |

CF Git on **`main`** should use **`npm run deploy`** (TypeScript). Python deploy is manual or a separate CF project / branch build with `npm run deploy:python`.

### 4. R2 dev prefixes

| Worker | `CMS_R2_DEV_PREFIX` var |
|--------|-------------------------|
| TypeScript | `cms-editor/` |
| Python | `cms-python/` |

Static dashboard assets both use `./public` (ASSETS binding). Only **R2 dev uploads** for CMS live editor should use the prefix vars so paths do not clobber.

## Thompson sampling (future router)

`agentsam_routing_arms` rows for runtime selection (not model selection):

- `task_type = 'cms_runtime'`
- `model_key = 'typescript' | 'python'`
- `workflow_agent =` full worker URL (`agent_slug` must stay `''` — FK to `agentsam_subagent_profile`)

Seed (idempotent):

```bash
# from inneranimalmedia repo with CF token
./scripts/with-cloudflare-env.sh npx wrangler d1 execute inneranimalmedia-business --remote \
  -c wrangler.production.toml --file=scripts/d1/seed_cms_runtime_thompson_arms.sql
```

Copy SQL from `scripts/d1/seed_cms_runtime_thompson_arms.sql` in this repo.

A small **router Worker** can sample `Beta(success_alpha, success_beta)` per arm and proxy to the winning URL. Tier1/tier2 eval scores feed alpha/beta updates (latency, 500 rate, render markers, cost).

## Repo layout (both runtimes)

```
src/
  index.ts          # TS stable
  entry.py          # Python challenger
  api/*.ts          # TS handlers
  api/*.py          # Python handlers (parity)
  lib/
```

## CF Builds (main = TypeScript)

| Setting | Value |
|---------|--------|
| Build | `npm ci && npm run build` |
| Deploy | `npm run deploy` |

See [`CLOUDFLARE_BUILDS.md`](./CLOUDFLARE_BUILDS.md).
