import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

export default function AdminLayout() {
  const { logout } = useAuth();
  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">ClauseIQ</div>
        <nav>
          <NavLink to="/admin/playbook">Clause Playbook</NavLink>
          <NavLink to="/admin/analytics">Portfolio Analytics</NavLink>
          <NavLink to="/reviewer/bulk-import">Bulk Import</NavLink>
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