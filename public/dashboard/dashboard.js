(function () {
  const VIEW = window.__AGENTSAM_ANALYTICS_VIEW__ || "overview";
  const API = "/api/analytics/" + (VIEW === "overview" ? "overview" : VIEW);

  const $ = (sel) => document.querySelector(sel);
  const fmt = (n, d) =>
    n == null || Number.isNaN(Number(n))
      ? "—"
      : Number(n).toLocaleString(undefined, { maximumFractionDigits: d ?? 2 });

  function setStatus(msg, isErr) {
    const el = $("#load-status");
    if (el) {
      el.textContent = msg;
      el.className = "status" + (isErr ? " err" : "");
    }
  }

  function lineChart(points, keys) {
    if (!points.length) return '<p class="muted">No activity in window.</p>';
    const w = 560;
    const h = 160;
    const pad = 24;
    const xs = points.map((_, i) => i);
    const maxY = Math.max(1, ...points.map((p) => Number(p[keys.y]) || 0));
    const step = (w - pad * 2) / Math.max(1, points.length - 1);
    const coords = points.map((p, i) => {
      const x = pad + i * step;
      const y = h - pad - ((Number(p[keys.y]) || 0) / maxY) * (h - pad * 2);
      return x + "," + y;
    });
    return (
      '<div class="chart-wrap"><svg viewBox="0 0 ' +
      w +
      " " +
      h +
      '" preserveAspectRatio="none">' +
      '<polyline fill="none" stroke="#0e7b86" stroke-width="2.5" points="' +
      coords.join(" ") +
      '"/></svg></div>'
    );
  }

  function renderOverview(data) {
    const p = data.platform || {};
    const arms = data.arms || {};
    $("#kpis").innerHTML = [
      ["Active users (28d)", p.active_users_28d],
      ["Workflow runs today", p.runs_today],
      ["AI cost (30d)", "$" + fmt(p.cost_30d, 4)],
      ["ETO error rate (24h)", fmt(p.error_rate_24h, 3) + "%"]
    ]
      .map(
        ([label, val]) =>
          '<div class="kpi"><label>' +
          label +
          '</label><strong>' +
          fmt(val, 4) +
          "</strong></div>"
      )
      .join("");

    $("#panel-main").innerHTML =
      '<div class="panel"><h2>Workflow runs (30d)</h2>' +
      lineChart(data.activity || [], { y: "runs" }) +
      "</div>";

  $("#panel-side").innerHTML =
      '<div class="panel"><h2>Thompson arms</h2><p class="muted">' +
      fmt(arms.active_arms) +
      " active / " +
      fmt(arms.total_arms) +
      " total · " +
      fmt(arms.total_executions) +
      " executions</p></div>" +
      '<div class="panel"><h2>Top models (win rate)</h2><table><thead><tr><th>Model</th><th>Provider</th><th>Win</th><th>Exec</th></tr></thead><tbody>' +
      (data.topModels || [])
        .map(
          (m) =>
            "<tr><td>" +
            (m.model_key || "—") +
            "</td><td>" +
            (m.provider || "—") +
            "</td><td>" +
            fmt(m.win_rate, 3) +
            "</td><td>" +
            fmt(m.total_executions) +
            "</td></tr>"
        )
        .join("") +
      "</tbody></table></div>";
  }

  function renderHealth(data) {
    const c = data.core || {};
    const dep = data.deployTotal || {};
    $("#kpis").innerHTML = [
      ["Avg latency (24h)", fmt(c.avg_latency_ms, 0) + " ms"],
      ["P99 latency", fmt(c.p99_latency_ms, 0) + " ms"],
      ["Error rate", fmt(c.error_rate_pct, 2) + "%"],
      ["Deploys (all time)", fmt(dep.total_deploys)]
    ]
      .map(
        ([label, val]) =>
          '<div class="kpi"><label>' +
          label +
          '</label><strong>' +
          val +
          "</strong></div>"
      )
      .join("");

    const provRows = (data.providers || [])
      .map((r) => {
        const pct = Number(r.error_pct) || 0;
        const pill =
          pct > 10 ? "bad" : pct > 2 ? "warn" : "good";
        return (
          "<tr><td>" +
          (r.provider || "—") +
          "</td><td>" +
          fmt(r.total) +
          "</td><td>" +
          fmt(r.failures) +
          '</td><td><span class="pill ' +
          pill +
          '">' +
          fmt(r.error_pct, 1) +
          "%</span></td><td>" +
          fmt(r.avg_ms, 0) +
          " ms</td></tr>"
        );
      })
      .join("");

    $("#panel-main").innerHTML =
      '<div class="panel"><h2>Provider status (24h ETO)</h2><table><thead><tr><th>Provider</th><th>Events</th><th>Failures</th><th>Error</th><th>Avg ms</th></tr></thead><tbody>' +
      (provRows || '<tr><td colspan="5" class="muted">No ETO events in last 24h</td></tr>') +
      "</tbody></table></div>";

    $("#panel-side").innerHTML =
      '<div class="panel"><h2>Thompson by task type</h2><table><thead><tr><th>Task</th><th>Arms</th><th>Signal</th><th>Exec</th></tr></thead><tbody>' +
      (data.thompsonByTask || [])
        .map(
          (t) =>
            "<tr><td>" +
            (t.task_type || "—") +
            "</td><td>" +
            fmt(t.arms) +
            "</td><td>" +
            fmt(t.arms_with_signal) +
            "</td><td>" +
            fmt(t.total_execs) +
            "</td></tr>"
        )
        .join("") +
      '</tbody></table></div><div class="panel"><h2>Last deploy</h2><p class="muted">' +
      (dep.last_deploy_at || "—") +
      "</p></div>";
  }

  function renderFinance(data) {
    const s = data.summary || {};
    const wai = data.workersAi || {};
    $("#kpis").innerHTML = [
      ["Total AI spend (30d)", "$" + fmt(s.total_spend_30d, 4)],
      ["Projected annual", "$" + fmt(s.projected_annual, 2)],
      ["WAI calls (30d)", fmt(wai.wai_calls)],
      ["WAI est. neurons", "~$" + fmt(wai.estimated_neuron_cost_usd, 4)]
    ]
      .map(
        ([label, val]) =>
          '<div class="kpi"><label>' +
          label +
          '</label><strong>' +
          val +
          "</strong></div>"
      )
      .join("");

    $("#panel-main").innerHTML =
      '<div class="panel"><h2>Daily cost trend</h2>' +
      lineChart(data.dailyTrend || [], { y: "daily_cost" }) +
      "</div>";

    $("#panel-side").innerHTML =
      '<div class="panel"><h2>Spend by model</h2><table><thead><tr><th>Provider</th><th>Model</th><th>Cost</th><th>Calls</th></tr></thead><tbody>' +
      (data.spendByModel || [])
        .slice(0, 12)
        .map(
          (r) =>
            "<tr><td>" +
            (r.provider || "—") +
            "</td><td>" +
            (r.model_key || "—") +
            "</td><td>$" +
            fmt(r.total_cost, 4) +
            "</td><td>" +
            fmt(r.calls) +
            "</td></tr>"
        )
        .join("") +
      "</tbody></table></div>";
  }

  async function load() {
    setStatus("Loading " + API + " …");
    try {
      const res = await fetch(API, { headers: { accept: "application/json" } });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || res.statusText);
      if (VIEW === "overview") renderOverview(data);
      else if (VIEW === "health") renderHealth(data);
      else if (VIEW === "finance") renderFinance(data);
      setStatus("Live D1 · " + (data.generated_at || ""));
    } catch (err) {
      setStatus("Failed: " + err.message, true);
    }
  }

  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.dataset.view === VIEW) a.classList.add("active");
  });

  load();
})();
