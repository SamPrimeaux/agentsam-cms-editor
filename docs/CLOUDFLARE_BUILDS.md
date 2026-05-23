# Cloudflare Workers Builds (Git → `main`)

Worker: **`agentsam-cms-editor`**  
Config: **`wrangler.toml`** / **`wrangler.jsonc`** (`main = "src/entry.py"`, `python_workers`)

## Dashboard settings (Workers & Pages → agentsam-cms-editor → Settings → Builds)

| Setting | Value |
|---------|--------|
| **Production branch** | `main` |
| **Root directory** | `/` (repo root) |
| **Build command** | `npm ci && npm run build` |
| **Deploy command** | `npm run deploy` |

`npm run build` runs `build:analytics` (Vite → `public/analytics/`).  
`npm run deploy` runs build + `wrangler deploy` with `disable_python_external_sdk` (no `uv` required on CI).

## Local deploy (same as CI)

```bash
npm ci
npm run deploy
```

Optional: `uv sync` + `uv run pywrangler deploy` if you vendor extra Python packages via `pyproject.toml`.

## Verify after deploy

```bash
curl -sS https://agentsam-cms-editor.meauxbility.workers.dev/api/v1/worker | jq .runtime
# expect: "python"
npm run smoke:api
```

## Do not use wrangler `[build]` for Python

`[build]` in `wrangler.toml` is for **custom JS bundling** (expects a generated `main` JS file). For Python Workers, use **Workers Builds build command** (above) or `npm run deploy` locally — not `[build] command = ...` at the top of `wrangler.toml`.
