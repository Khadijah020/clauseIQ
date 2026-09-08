import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

export default function BusinessLayout() {
  const { logout } = useAuth();
  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">ClauseIQ</div>
        <nav>
          <NavLink to="/business/intake">Contract Intake</NavLink>
          <NavLink to="/deadlines">Key Dates</NavLink>
          <NavLink to="/search">Search</NavLink>
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