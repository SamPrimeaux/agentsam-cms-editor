import { NavLink, Outlet } from "react-router-dom";

const LINKS = [
  { to: "/dashboard/overview", label: "Overview" },
  { to: "/dashboard/finance", label: "Finance" },
  { to: "/dashboard/health", label: "Health" },
];

export function DashboardShell() {
  return (
    <div className="analytics-shell">
      <header className="analytics-header">
        <div>
          <div className="analytics-eyebrow">Inner Animal Media</div>
          <h1>Agent Sam Analytics</h1>
        </div>
        <nav className="analytics-nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
          <a href="/design-studio">Design Studio</a>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
