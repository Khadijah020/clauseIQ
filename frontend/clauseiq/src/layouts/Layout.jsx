import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";
import { useNotifications } from "../hooks/useNotifications";

// One link list per role. Shared destinations (Key Dates, Search,
// Notifications) are repeated per-role rather than deduped into a
// separate array so each role's order/wording can diverge later
// without restructuring this file.
const NAV_LINKS = {
  business_user: [
    { to: "/business", label: "Dashboard" },
    { to: "/business/intake", label: "Contract Intake" },
    { to: "/deadlines", label: "Key Dates" },
    { to: "/search", label: "Search" },
    { to: "/notifications", label: "Notifications" },
  ],
  legal_reviewer: [
    { to: "/reviewer/queue", label: "Review Queue" },
    { to: "/reviewer/bulk-import", label: "Bulk Import" },
    { to: "/deadlines", label: "Key Dates" },
    { to: "/search", label: "Search" },
    { to: "/notifications", label: "Notifications" },
  ],
  admin: [
    { to: "/admin/playbook", label: "Clause Playbook" },
    { to: "/admin/analytics", label: "Portfolio Analytics" },
    { to: "/reviewer/bulk-import", label: "Bulk Import" },
    { to: "/notifications", label: "Notifications" },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const links = NAV_LINKS[user?.role] || [];

  const liveNotifications = useNotifications();

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">ClauseIQ</div>

        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button onClick={logout} className="layout__logout">
          Log out
        </button>
      </aside>

      <main className="layout__content">
        <Outlet />
      </main>

      {/* Live notification toasts */}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        {liveNotifications.slice(0, 3).map((n, i) => (
          <div
            key={i}
            style={{
              background: "#1c2a46",
              color: "#fff",
              padding: "12px 16px",
              borderRadius: 8,
              marginBottom: 8,
              maxWidth: 320,
            }}
          >
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}