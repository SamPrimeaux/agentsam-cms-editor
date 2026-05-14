# Agent Sam Repo Rules

This repository is an isolated sandbox for the `agentsam-cms-editor` Cloudflare Worker.

## Hard Boundaries

- Do not modify `/Users/samprimeaux/inneranimalmedia` from this repo.
- Do not deploy the main Inner Animal Media production app.
- Only target the Worker named `agentsam-cms-editor`.
- Do not create additional Worker names without explicit approval.
- Use SSH GitHub remotes, not HTTPS token auth.
- Never commit secrets.
- Never commit `.env` files.
- Never expose `OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN`, `GITHUB_TOKEN`, or `GH_TOKEN`.
- Browser code must never call OpenAI or Cloudflare APIs directly with secrets.
- Keep generated artifacts under `artifacts/`.
- Prefer dry-runs before real deploys.

## Current Target

- GitHub repo: `git@github.com:SamPrimeaux/agentsam-cms-editor.git`
- Worker: `agentsam-cms-editor`
- Live URL: `https://agentsam-cms-editor.meauxbility.workers.dev/`
- D1 binding: `DB`
- D1 database: `inneranimalmedia-business`
- R2 binding: `DASHBOARD`
- R2 bucket: `cms`

## Deployment Warning

This repo is connected to Cloudflare Builds on `main`.

Do not push placeholder Worker code that could overwrite the currently working CMS editor.

First import/snapshot the live editor, then add deployable code.
