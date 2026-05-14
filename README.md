cd /Users/samprimeaux/agentsam-cms-editor

python3 -c 'from pathlib import Path
README = r"""# Agent Sam CMS Editor

A standalone, isolated Cloudflare Worker app for building a mini Shopify-style CMS/editor powered by the `agentsam_*` orchestration layer, `cms_*` content system, D1, R2, and OpenAI API-backed Agent Sam workflows.

This repo exists so Agent Sam can safely build, test, refine, and deploy CMS/editor experiments without risking the main Inner Animal Media production repository.

## Vision

`agentsam-cms-editor` is intended to become our own lightweight Shopify-like visual CMS and Agent Sam testing ground.

The app should allow us to:

- edit pages, sections, components, templates, assets, and themes
- run Agent Sam workflows safely against real CMS data
- test OpenAI API-powered chat, image, web lookup, and edit flows
- generate reusable components, templates, sections, and assets
- store reusable outputs in D1 and R2
- validate workflow safety before promoting patterns into production systems
- keep all experiments isolated from the main Inner Animal Media app

## Baseline Concept

```txt
Mini Shopify CMS
+ Agent Sam workflow sandbox
+ OpenAI API assistant layer
+ Cloudflare Worker app
+ D1 cms_* and agentsam_* tables
+ R2 assets/artifacts
+ reusable component/template pipeline
Current Live Worker
Worker name: agentsam-cms-editor
Live URL: https://agentsam-cms-editor.meauxbility.workers.dev/
GitHub repo: git@github.com:SamPrimeaux/agentsam-cms-editor.git
Git branch: main
Git auth method: SSH
Cloudflare Account ID: ede6590ac0d2fb7daf155b35653457b2
Runtime Bindings
D1 database binding:
  DB → inneranimalmedia-business

R2 bucket binding:
  DASHBOARD → cms

Worker secrets:
  OPENAI_API_KEY
  CLOUDFLARE_API_TOKEN

Secrets must stay in Cloudflare Worker Secrets or local uncommitted env files. They must never be committed to GitHub.

Database Baseline

Latest known read-only audit:

Total matching tables: 113
agentsam_* tables:    86
cms_* tables:         27

The app is intentionally built around two major database families.

agentsam_*

The orchestration/runtime layer for Agent Sam:

workflows
workflow nodes, edges, and runs
plans and tasks
model catalog and routing
prompt versions, routes, and cache keys
command/tool execution
approvals and guardrails
evals and health metrics
usage and cost tracking
artifacts and memory
workspace state
cms_*

The content/theme/editor layer:

pages
sections
components
templates
assets
themes
navigation menus
page drafts
live edit sessions
rollbacks
conversions
global settings
tenant/site content
Product Goals
1. Visual CMS Editor

The editor should support:

page library
section structure tree
live preview canvas
component inspector
theme controls
reusable templates
asset browser
activity/build stream
safe preview/publish flow
2. Agent Sam Chat Bar

A clean, minimal ChatGPT-inspired command bar should support:

ask a question
edit selected component
generate image
look up web/context
explain page
propose CMS patches
preview/apply/discard changes

Browser code must call this Worker only. It must never call OpenAI directly.

3. Agent Workflow Sandbox

This repo should be a safe place to test Agent Sam workflows end-to-end:

goal → plan → workflow nodes → tool calls → artifacts → validation → report

Workflows should be able to inspect, generate, patch, deploy, smoke test, and report without touching the main production repo.

4. Reusable Component/Template System

Useful outputs should be easy to repurpose later:

sections
page templates
theme tokens
components
R2 asset bundles
workflow specs
validation scripts
smoke test reports

Generated artifacts should live under artifacts/ unless intentionally promoted.

Safety Rules
Do not modify /Users/samprimeaux/inneranimalmedia from this repo.
Do not deploy the main Inner Animal Media app from this repo.
Only target the Worker named agentsam-cms-editor.
Do not create new Worker names without explicit approval.
Do not commit secrets.
Do not commit .env files.
Do not expose OPENAI_API_KEY, CLOUDFLARE_API_TOKEN, GITHUB_TOKEN, or GH_TOKEN.
Prefer SSH for GitHub pushes.
Prefer dry-runs before deploys.
Keep generated files under artifacts/.
Any real D1 mutation should have a dry-run mode first.
Any AI-generated patch should be inspectable before apply.
Any deploy should have a smoke test and rollback note.
Recommended Repo Shape
agentsam-cms-editor/
  README.md
  AGENTSAM_REPO_RULES.md
  wrangler.toml
  package.json
  src/
    worker.js
  public/
    index.html
    app.js
    styles.css
  scripts/
    audit/
    build/
    deploy/
    smoke/
  artifacts/
    d1_audits/
    builds/
    reports/
  docs/
    d1/
    workflows/
Near-Term Build Plan
Phase 0 — Repo containment
SSH GitHub remote works.
Isolated repo pushed to GitHub.
Cloudflare Worker is connected to this repo.
Add README, repo rules, .gitignore, and D1 audit docs.
Phase 1 — Import current live editor safely

Before writing new Worker code, snapshot the current deployed editor and/or copy over the known working source from the previous build scripts.

Goal:

Do not overwrite the working CMS editor with a blank placeholder.
Phase 2 — Add repo-local Wrangler config

Add wrangler.toml with:

name = "agentsam-cms-editor"
main = "src/worker.js"
account_id
D1 binding DB
R2 binding DASHBOARD
compatibility date
non-secret vars only
Phase 3 — Add OpenAI-safe API routes

Add Worker API routes:

POST /api/agent/chat
POST /api/agent/image
POST /api/agent/search
GET  /api/agent/conversations
POST /api/agent/conversations

The Worker should read:

env.OPENAI_API_KEY

The browser should only call:

fetch("/api/agent/chat", ...)
Phase 4 — Add CMS-aware chat bar

The bottom command bar should send:

user message
current page
selected section
selected component
current field/content
requested mode

Modes:

Ask
Edit selected
Create image
Look up web
Explain page
Phase 5 — Suggested patches, not direct mutation

Initial AI responses should return patch suggestions, not directly mutate D1.

Example:

{
  "type": "cms_suggestion",
  "message": "I tightened the hero headline.",
  "patches": [
    {
      "target": "cms_section_components",
      "id": "component_hero_heading",
      "field": "content",
      "before": "Old text",
      "after": "New text"
    }
  ]
}

UI should support:

Preview
Apply
Discard
Deployment Notes

This repo is connected to Cloudflare Builds on main.

Be careful: pushing deployable Worker code to main may update the live Worker.

Before pushing deployable code:

npx wrangler deploy --dry-run -c wrangler.toml

Then smoke test:

curl -i https://agentsam-cms-editor.meauxbility.workers.dev/
curl -i https://agentsam-cms-editor.meauxbility.workers.dev/health
Current Status
GitHub SSH auth works.
Repo is isolated.
main pushed successfully.
Worker secrets have been uploaded in Cloudflare:
OPENAI_API_KEY
CLOUDFLARE_API_TOKEN
D1/R2 bindings exist in Cloudflare dashboard.
R2 binding is now DASHBOARD → cms.
Next safe step: add docs/config, then import/snapshot the current live editor before pushing deployable Worker code.
"""

RULES = r"""# Agent Sam Repo Rules

This repository is an isolated sandbox for the agentsam-cms-editor Cloudflare Worker.

Hard Boundaries
Do not modify /Users/samprimeaux/inneranimalmedia from this repo.
Do not deploy the main Inner Animal Media production app.
Only target the Worker named agentsam-cms-editor.
Do not create additional Worker names without explicit approval.
Use SSH GitHub remotes, not HTTPS token auth.
Never commit secrets.
Never commit .env files.
Never expose OPENAI_API_KEY, CLOUDFLARE_API_TOKEN, GITHUB_TOKEN, or GH_TOKEN.
Browser code must never call OpenAI or Cloudflare APIs directly with secrets.
Keep generated artifacts under artifacts/.
Prefer dry-runs before real deploys.
Current Target
GitHub repo: git@github.com:SamPrimeaux/agentsam-cms-editor.git
Worker: agentsam-cms-editor
Live URL: https://agentsam-cms-editor.meauxbility.workers.dev/
D1 binding: DB
D1 database: inneranimalmedia-business
R2 binding: DASHBOARD
R2 bucket: cms
Deployment Warning

This repo is connected to Cloudflare Builds on main.

Do not push placeholder Worker code that could overwrite the currently working CMS editor.

First import/snapshot the live editor, then add deployable code.
"""

GITIGNORE = r"""# dependencies
node_modules/

env / secrets

.env
.env.*
!.env.example

local logs

.log
npm-debug.log
yarn-debug.log*
yarn-error.log*

build outputs

dist/
build/
.tmp/
.cache/
.wrangler/
.dev.vars

artifacts stay local unless intentionally committed

artifacts/

OS/editor

.DS_Store
.vscode/
.idea/
"""

Path("README.md").write_text(README, encoding="utf-8")
Path("AGENTSAM_REPO_RULES.md").write_text(RULES, encoding="utf-8")
Path(".gitignore").write_text(GITIGNORE, encoding="utf-8")

for d in ["docs/d1", "docs/workflows", "scripts/audit", "scripts/build", "scripts/deploy", "scripts/smoke", "artifacts"]:
Path(d).mkdir(parents=True, exist_ok=True)

print("WROTE README.md")
print("WROTE AGENTSAM_REPO_RULES.md")
print("WROTE .gitignore")
print("CREATED docs/scripts/artifacts folders")

readme = Path("README.md").read_text(encoding="utf-8")
bad = ["cat > README", "heredoc>", "Run this inside", "Then paste"]
hits = [b for b in bad if b in readme]
if hits:
raise SystemExit("FAILED: README still contains shell instruction junk: " + ", ".join(hits))

print("PASS: README clean")
print("PASS: R2 binding is DASHBOARD → cms" if "DASHBOARD → cms" in readme else "WARN: R2 binding text not found")
'

git status -sb
git diff -- README.md AGENTSAM_REPO_RULES.md .gitignore | sed -n "1,220p"


Then commit it:

```bash
cd /Users/samprimeaux/agentsam-cms-editor

git add README.md AGENTSAM_REPO_RULES.md .gitignore docs scripts
git commit -m "docs: define Agent Sam CMS editor baseline"
git push
