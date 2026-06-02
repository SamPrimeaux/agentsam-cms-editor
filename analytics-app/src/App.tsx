import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardShell } from "@/components/shell/DashboardShell";
import { FinancePage } from "@/pages/FinancePage";
import { HealthPage } from "@/pages/HealthPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { PresenceDevPage } from "@/pages/PresenceDevPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardShell />}>
          <Route path="/dashboard/overview" element={<OverviewPage />} />
          <Route path="/dashboard/finance" element={<FinancePage />} />
          <Route path="/dashboard/health" element={<HealthPage />} />
          <Route path="/dev/presence" element={<PresenceDevPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
