-- Idempotent Thompson arms for CMS runtime A/B (TypeScript vs Python Worker).
-- task_type cms_runtime is reserved for worker URL routing experiments.

INSERT OR IGNORE INTO agentsam_routing_arms (
  id,
  workspace_id,
  task_type,
  mode,
  model_key,
  provider,
    agent_slug,
    workflow_agent,
    success_alpha,
    success_beta,
    is_active,
    is_eligible,
    is_paused,
    total_executions,
    updated_at
) VALUES
  (
    'ra_cms_runtime_typescript',
    'ws_inneranimalmedia',
    'cms_runtime',
    'stable',
    'typescript',
    'cloudflare_worker',
    '',
    'https://agentsam-cms-editor.meauxbility.workers.dev',
    1.0,
    1.0,
    1,
    1,
    0,
    0,
    datetime('now')
  ),
  (
    'ra_cms_runtime_python',
    'ws_inneranimalmedia',
    'cms_runtime',
    'challenger',
    'python',
    'cloudflare_worker',
    '',
    'https://agentsam-cms-python.meauxbility.workers.dev',
    1.0,
    1.0,
    1,
    1,
    0,
    0,
    datetime('now')
  );
