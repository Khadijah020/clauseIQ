import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

export default function ReviewerLayout() {
  const { logout } = useAuth();
  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">ClauseIQ</div>
        <nav>
          <NavLink to="/reviewer/queue">Review Queue</NavLink>
          <NavLink to="/reviewer/bulk-import">Bulk Import</NavLink>
          <NavLink to="/deadlines">Key Dates</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/admin/analytics">Portfolio Analytics</NavLink>
          <NavLink to="/notifications">Notifications</NavLink>
        </nav>
        <button onClick={logout} className="layout__logout">Log out</button>
      </aside>
      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
}