import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Loading session…</p>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/platform/login" replace />;
  }

  return <Outlet />;
}
