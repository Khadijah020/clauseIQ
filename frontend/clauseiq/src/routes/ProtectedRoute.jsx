import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HOME_BY_ROLE = {
  business_user: "/business",
  legal_reviewer: "/reviewer/queue",
  admin: "/admin/analytics",
};

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // or a spinner, once you have one

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE[user.role] || "/login"} replace />;
  }

  return children;
}