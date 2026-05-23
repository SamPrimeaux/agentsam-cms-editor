/** CMS editor /api/analytics/* shapes (portable subset of IAM PulseResponse). */

export type OverviewResponse = {
  ok: boolean;
  generated_at: string;
  platform: {
    active_users_28d: number;
    runs_today: number;
    cost_30d: number;
    error_rate_24h: number | null;
  } | null;
  activity: Array<{
    day: string;
    runs: number;
    cost: number;
    completed: number;
    failed: number;
  }>;
  arms: {
    total_arms: number;
    active_arms: number;
    paused_arms: number;
    avg_quality: number | null;
    total_executions: number;
  } | null;
  topModels: Array<{
    model_key: string;
    provider: string;
    task_type: string;
    total_executions: number;
    win_rate: number;
    avg_quality_score: number | null;
  }>;
};

export type HealthResponse = {
  ok: boolean;
  generated_at: string;
  core: {
    avg_latency_ms: number | null;
    p99_latency_ms: number | null;
    error_rate_pct: number | null;
    total_events: number;
    last_event_at: string | null;
  } | null;
  providers: Array<{
    provider: string;
    total: number;
    failures: number;
    avg_ms: number | null;
    error_pct: number | null;
    last_seen: string | null;
  }>;
  thompsonByTask: Array<{
    task_type: string;
    arms: number;
    arms_with_signal: number;
    avg_win_rate: number | null;
    total_execs: number;
  }>;
  deployHistory: Array<{ day: string; cnt: number; status: string }>;
  deployTotal: { total_deploys: number; last_deploy_at: string | null } | null;
};

export type FinanceResponse = {
  ok: boolean;
  generated_at: string;
  summary: { total_spend_30d: number; projected_annual: number };
  spendByModel: Array<{
    provider: string;
    model_key: string;
    calls: number;
    total_cost: number;
    avg_cost_per_call: number;
    avg_quality: number | null;
  }>;
  costEfficiency: Array<{
    provider: string;
    total_cost: number;
    successes: number;
    cost_per_success: number | null;
  }>;
  dailyTrend: Array<{
    day: string;
    daily_cost: number;
    events: number;
    successes: number;
  }>;
  workersAi: {
    wai_calls: number;
    total_tokens: number;
    estimated_neuron_cost_usd: number;
  } | null;
};
