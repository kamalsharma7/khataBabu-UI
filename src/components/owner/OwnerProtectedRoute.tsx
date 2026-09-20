import { Navigate, Outlet } from "react-router-dom";
import { useOwnerAuth } from "../../context/OwnerAuthContext";

export function OwnerProtectedRoute() {
  const { profile, loading } = useOwnerAuth();

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Loading session…</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/app/login" replace />;
  }

  if (profile.must_change_password) {
    return <Navigate to="/app/change-password" replace />;
  }

  return <Outlet />;
}
