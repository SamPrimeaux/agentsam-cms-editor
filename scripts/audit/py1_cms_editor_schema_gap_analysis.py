#!/usr/bin/env python3
"""CMS editor schema gap analysis — D1 vs repo; writes plan/tasks/workflow."""
import os
import sys
import urllib.request
import json
import time
import re
import subprocess
import tempfile
from pathlib import Path
from datetime import date

TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")
if not TOKEN:
    sys.exit("ERROR: CLOUDFLARE_API_TOKEN not set")

ACCOUNT_ID = "ede6590ac0d2fb7daf155b35653457b2"
DB_ID = "cf87b717-d4e2-4cf8-bab0-a81268e32d49"
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database"
REPO_URL = "https://github.com/SamPrimeaux/agentsam-cms-editor.git"
LOCAL_REPO = Path("/Users/samprimeaux/agentsam-cms-editor")
TENANT = "tenant_sam_primeaux"
WORKSPACE = "ws_inneranimalmedia"
TODAY = date.today().isoformat()


def d1(sql, params=None):
    body = json.dumps({"sql": sql, **({"params": params} if params else {})}).encode()
    req = urllib.request.Request(
        f"{BASE}/{DB_ID}/query",
        data=body,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read())
    if not resp.get("success"):
        raise RuntimeError(resp.get("errors", resp))
    block = resp["result"][0]
    meta = block.get("meta") or {}
    if meta.get("error"):
        raise RuntimeError(meta["error"])
    return block.get("results", [])


def uid(prefix="id"):
    import hashlib
    import struct

    ts = struct.pack(">Q", int(time.time() * 1000))
    h = hashlib.sha1(ts + os.urandom(4)).hexdigest()[:12]
    return f"{prefix}_{h}"


def main():
    print("\n── STEP 1: Reading D1 schema ─────────────────────────────────────────")
    schema_rows = d1("""
    SELECT name, sql FROM sqlite_master
    WHERE type='table'
      AND (name LIKE 'cms_%' OR name LIKE 'agentsam_%')
      AND sql IS NOT NULL
    ORDER BY name
""")
    db_tables = {}
    for row in schema_rows:
        cols = re.findall(r'^\s+"?(\w+)"?\s+\w', row["sql"] or "", re.MULTILINE)
        db_tables[row["name"]] = cols

    print(
        f"  D1 has {len(db_tables)} tables  "
        f"(cms_*: {sum(1 for t in db_tables if t.startswith('cms_'))}  "
        f"agentsam_*: {sum(1 for t in db_tables if t.startswith('agentsam_'))})"
    )

    print("\n── STEP 2: Locating repo ─────────────────────────────────────────────")
    if LOCAL_REPO.exists():
        repo_path = LOCAL_REPO
        print(f"  Using local repo: {repo_path}")
    else:
        tmp = tempfile.mkdtemp(prefix="cms_editor_")
        print(f"  Cloning {REPO_URL} → {tmp} …")
        result = subprocess.run(
            ["git", "clone", "--depth=1", REPO_URL, tmp],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            sys.exit(f"ERROR: git clone failed:\n{result.stderr}")
        repo_path = Path(tmp)
        print("  Clone OK")

    print("\n── STEP 3: Scanning repo ─────────────────────────────────────────────")
    sql_extensions = {".sql"}
    code_extensions = {".ts", ".tsx", ".js", ".jsx", ".py"}
    skip_dirs = {"node_modules", ".git", "dist", "public", ".wrangler"}
    create_pat = re.compile(
        r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?', re.IGNORECASE
    )
    ref_pat = re.compile(
        r'(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+["`]?(\w+)["`]?', re.IGNORECASE
    )

    defined_in_repo = {}
    referenced_in_repo = {}
    files_scanned = 0

    for path in repo_path.rglob("*"):
        if any(skip in path.parts for skip in skip_dirs):
            continue
        if not path.is_file():
            continue
        ext = path.suffix.lower()
        if ext not in sql_extensions | code_extensions:
            continue
        try:
            text = path.read_text(errors="ignore")
        except Exception:
            continue
        rel = str(path.relative_to(repo_path))
        files_scanned += 1
        if ext in sql_extensions:
            for m in create_pat.finditer(text):
                defined_in_repo.setdefault(m.group(1), []).append(rel)
        for m in ref_pat.finditer(text):
            tbl = m.group(1)
            if tbl.startswith(("cms_", "agentsam_")):
                referenced_in_repo.setdefault(tbl, []).append(rel)

    print(f"  Scanned {files_scanned} files")
    print(f"  Tables DEFINED in repo SQL:     {len(defined_in_repo)}")
    print(f"  Tables REFERENCED in repo code: {len(referenced_in_repo)}")

    print("\n── STEP 4: Gap analysis ──────────────────────────────────────────────")
    all_repo_known = set(defined_in_repo) | set(referenced_in_repo)
    in_db_only = sorted(set(db_tables) - all_repo_known)
    in_repo_not_db = sorted(all_repo_known - set(db_tables))
    referenced_only = sorted(
        set(referenced_in_repo) - set(defined_in_repo) - set(db_tables)
    )

    print(f"  In D1 but NOT in repo  → {len(in_db_only)} tables need repo coverage")
    print(f"  In repo but NOT in D1  → {len(in_repo_not_db)} tables need DB migration")
    print(f"  Referenced but missing → {len(referenced_only)} tables undefined anywhere")

    if in_db_only:
        print("\n  Tables needing repo coverage:")
        for t in in_db_only[:20]:
            print(f"    • {t}  ({len(db_tables[t])} cols)")
        if len(in_db_only) > 20:
            print(f"    … and {len(in_db_only) - 20} more")
    if in_repo_not_db:
        print("\n  Tables needing D1 migration:")
        for t in in_repo_not_db:
            print(f"    • {t}")
    if referenced_only:
        print("\n  Tables referenced but undefined:")
        for t in referenced_only:
            print(f"    • {t}  (in: {', '.join(list(set(referenced_in_repo[t]))[:2])})")

    def group_by_prefix(tables):
        groups = {
            "cms_core": [],
            "cms_content": [],
            "cms_media": [],
            "cms_live": [],
            "cms_other": [],
            "agentsam_workflow": [],
            "agentsam_eval": [],
            "agentsam_mcp": [],
            "agentsam_model": [],
            "agentsam_tool": [],
            "agentsam_usage": [],
            "agentsam_exec": [],
            "agentsam_other": [],
        }
        for t in tables:
            if t.startswith(("cms_page", "cms_site", "cms_tenant")):
                groups["cms_core"].append(t)
            elif t.startswith(("cms_content", "cms_collection", "cms_section")):
                groups["cms_content"].append(t)
            elif t.startswith(("cms_asset", "cms_media", "cms_video", "cms_3d")):
                groups["cms_media"].append(t)
            elif t.startswith(("cms_live", "cms_override", "cms_draft")):
                groups["cms_live"].append(t)
            elif t.startswith("cms_"):
                groups["cms_other"].append(t)
            elif t.startswith("agentsam_workflow"):
                groups["agentsam_workflow"].append(t)
            elif t.startswith("agentsam_eval"):
                groups["agentsam_eval"].append(t)
            elif t.startswith("agentsam_mcp"):
                groups["agentsam_mcp"].append(t)
            elif t.startswith(("agentsam_model", "agentsam_routing")):
                groups["agentsam_model"].append(t)
            elif t.startswith("agentsam_tool"):
                groups["agentsam_tool"].append(t)
            elif t.startswith("agentsam_usage"):
                groups["agentsam_usage"].append(t)
            elif t.startswith(("agentsam_exec", "agentsam_plan", "agentsam_spawn")):
                groups["agentsam_exec"].append(t)
            elif t.startswith("agentsam_"):
                groups["agentsam_other"].append(t)
        return {k: v for k, v in groups.items() if v}

    gap_groups = group_by_prefix(in_db_only)

    print("\n── STEP 6: Writing plans, tasks, workflows ───────────────────────────")

    plan_id = uid("plan")
    wf_id = uid("wf")
    wf_key = "wf_cms_editor_schema_gap_remediation"

    d1(
        """
    INSERT OR IGNORE INTO agentsam_workflows
        (id, tenant_id, workspace_id, workflow_key, display_name,
         description, workflow_type, trigger_type, default_mode,
         risk_level, requires_approval, is_active, is_platform_global,
         created_at, updated_at, created_at_unix)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'),?)
""",
        [
            wf_id,
            TENANT,
            WORKSPACE,
            wf_key,
            "CMS Editor Schema Gap Remediation",
            (
                f"Auto-generated {TODAY}: {len(in_db_only)} tables need repo coverage, "
                f"{len(in_repo_not_db)} need DB migration."
            ),
            "agentic",
            "manual",
            "agent",
            "medium",
            1,
            1,
            0,
            int(time.time()),
        ],
    )
    wf_rows = d1(
        "SELECT id FROM agentsam_workflows WHERE workflow_key = ? LIMIT 1",
        [wf_key],
    )
    workflow_id = wf_rows[0]["id"] if wf_rows else wf_id
    print(f"  Workflow  → {wf_key} ({workflow_id})")

    d1(
        """
    INSERT OR IGNORE INTO agentsam_plans
        (id, tenant_id, workspace_id, plan_date, plan_type,
         title, status, morning_brief, tasks_total,
         workflow_id, risk_level, requires_approval, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,unixepoch(),unixepoch())
""",
        [
            plan_id,
            TENANT,
            WORKSPACE,
            TODAY,
            "sprint",
            f"CMS Editor Schema Gap Remediation — {TODAY}",
            "active",
            (
                f"Gap analysis: {len(in_db_only)} in D1 not in repo. "
                f"{len(in_repo_not_db)} in repo not in D1. "
                f"{len(referenced_only)} referenced but undefined. "
                f"Groups: {', '.join(gap_groups.keys())}"
            ),
            sum(len(v) for v in gap_groups.values()),
            workflow_id,
            "low",
            1,
        ],
    )
    print(f"  Plan      → {plan_id}")

    group_labels = {
        "cms_core": ("P0", "Schema — CMS core pages/sites/tenants"),
        "cms_content": ("P0", "Schema — CMS content/collections/sections"),
        "cms_media": ("P1", "Schema — CMS media/assets/video/3D"),
        "cms_live": ("P1", "Schema — CMS live-edit/overrides/drafts"),
        "cms_other": ("P2", "Schema — CMS misc"),
        "agentsam_workflow": ("P0", "Schema — agentsam workflow engine"),
        "agentsam_eval": ("P1", "Schema — agentsam eval suite"),
        "agentsam_mcp": ("P0", "Schema — agentsam MCP tools/servers"),
        "agentsam_model": ("P1", "Schema — agentsam model routing/AI"),
        "agentsam_tool": ("P1", "Schema — agentsam tool chain/call/stats"),
        "agentsam_usage": ("P1", "Schema — agentsam usage events/rollups"),
        "agentsam_exec": ("P0", "Schema — agentsam execution/plan/spawn"),
        "agentsam_other": ("P2", "Schema — agentsam misc"),
    }

    tasks_written = 0
    for idx, (group_key, tables) in enumerate(gap_groups.items()):
        priority, label = group_labels.get(group_key, ("P2", group_key))
        desc = (
            f"{len(tables)} tables need migration files and/or TS type definitions "
            f"added to agentsam-cms-editor.\n\nTables:\n"
            + "\n".join(
                f"  • {t}  [{', '.join(db_tables.get(t, [])[:5])}"
                f"{'...' if len(db_tables.get(t, [])) > 5 else ''}]"
                for t in tables
            )
        )
        task_id = uid("task")
        try:
            d1(
                """
            INSERT OR IGNORE INTO agentsam_plan_tasks
                (id, tenant_id, workspace_id, plan_id,
                 order_index, title, description, priority, category,
                 status, tables_involved, files_involved,
                 estimated_minutes, risk_level, requires_approval, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch())
        """,
                [
                    task_id,
                    TENANT,
                    WORKSPACE,
                    plan_id,
                    idx,
                    f"[{priority}] {label}  ({len(tables)} tables)",
                    desc,
                    priority,
                    "db",
                    "todo",
                    json.dumps(tables),
                    json.dumps(
                        ["migrations/", "src/types/schema.ts", "src/api/analytics.py"]
                    ),
                    len(tables) * 8,
                    "medium",
                    1,
                ],
            )
            print(
                f"  Task [{priority}]  {group_key:25s}  → {len(tables)} tables  ({task_id})"
            )
            tasks_written += 1
        except Exception as e:
            print(f"  WARN {group_key}: {e}")
        time.sleep(0.04)

    if in_repo_not_db:
        task_id = uid("task")
        d1(
            """
        INSERT OR IGNORE INTO agentsam_plan_tasks
            (id, tenant_id, workspace_id, plan_id, order_index, title,
             description, priority, category, status, tables_involved,
             estimated_minutes, risk_level, requires_approval, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch())
    """,
            [
                task_id,
                TENANT,
                WORKSPACE,
                plan_id,
                len(gap_groups),
                f"[P0] DB Migration needed — {len(in_repo_not_db)} tables in repo not in D1",
                "Tables in repo not in D1:\n" + "\n".join(f"  • {t}" for t in in_repo_not_db),
                "P0",
                "db",
                "todo",
                json.dumps(in_repo_not_db),
                len(in_repo_not_db) * 5,
                "high",
                1,
            ],
        )
        print(
            f"  Task [P0]  repo_not_in_db             → {len(in_repo_not_db)} tables  ({task_id})"
        )
        tasks_written += 1

    if referenced_only:
        task_id = uid("task")
        d1(
            """
        INSERT OR IGNORE INTO agentsam_plan_tasks
            (id, tenant_id, workspace_id, plan_id, order_index, title,
             description, priority, category, status, tables_involved,
             estimated_minutes, risk_level, requires_approval, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch())
    """,
            [
                task_id,
                TENANT,
                WORKSPACE,
                plan_id,
                len(gap_groups) + 1,
                f"[P0] Undefined references — {len(referenced_only)} tables used but not defined",
                "Tables referenced in code but not in D1 or any migration:\n"
                + "\n".join(f"  • {t}" for t in referenced_only),
                "P0",
                "db",
                "todo",
                json.dumps(referenced_only),
                len(referenced_only) * 10,
                "high",
                1,
            ],
        )
        print(
            f"  Task [P0]  referenced_but_missing     → {len(referenced_only)} tables  ({task_id})"
        )
        tasks_written += 1

    plan_check = d1(
        "SELECT id, title, tasks_total FROM agentsam_plans WHERE id = ?",
        [plan_id],
    )
    task_check = d1(
        "SELECT COUNT(*) AS n FROM agentsam_plan_tasks WHERE plan_id = ?",
        [plan_id],
    )
    print(f"  Verify plan row: {plan_check}")
    print(f"  Verify task count: {task_check[0]['n'] if task_check else 0}")

    try:
        d1(
            """
        INSERT OR IGNORE INTO agentsam_script_runs
            (id, script_id, rule_id, status,
             started_at_epoch, completed_at_epoch,
             output_summary, workspace_id, user_id)
        VALUES (?,?,?,?,?,?,?,?,?)
    """,
            [
                uid("srun"),
                "script_cms_gap_analysis",
                "primetech_agentic_flow_protocol",
                "completed",
                int(time.time()),
                int(time.time()),
                json.dumps(
                    {
                        "db_tables": len(db_tables),
                        "in_db_only": len(in_db_only),
                        "in_repo_not_db": len(in_repo_not_db),
                        "referenced_only": len(referenced_only),
                        "plan_id": plan_id,
                        "workflow_id": wf_id,
                        "tasks_written": tasks_written,
                    }
                ),
                WORKSPACE,
                TENANT,
            ],
        )
    except Exception:
        pass

    print()
    print("══════════════════════════════════════════════════════════════")
    print(f"  D1 tables scanned     : {len(db_tables)}")
    print(f"  Repo files scanned    : {files_scanned}")
    print(f"  Gaps → repo coverage  : {len(in_db_only)}")
    print(f"  Gaps → DB migration   : {len(in_repo_not_db)}")
    print(f"  Undefined references  : {len(referenced_only)}")
    print(f"  Plan                  : {plan_id}")
    print(f"  Workflow              : {wf_key}")
    print(f"  Tasks written         : {tasks_written}")
    print("══════════════════════════════════════════════════════════════")
    print("DONE")


if __name__ == "__main__":
    main()
