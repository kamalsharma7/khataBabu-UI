import { Navigate, Route, Routes } from "react-router-dom";
import { PlatformLayout } from "./components/PlatformLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OwnerLayout } from "./components/owner/OwnerLayout";
import { OwnerProtectedRoute } from "./components/owner/OwnerProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { OwnerAuthProvider } from "./context/OwnerAuthContext";
import { OwnerOutletProvider } from "./context/OwnerOutletContext";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { TenantsPage } from "./pages/TenantsPage";
import { OwnerChangePasswordPage } from "./pages/owner/OwnerChangePasswordPage";
import { OwnerDashboardPage } from "./pages/owner/OwnerDashboardPage";
import { OwnerOverviewPage } from "./pages/owner/OwnerOverviewPage";
import { OwnerFloorPage } from "./pages/owner/OwnerFloorPage";
import { OwnerLoginPage } from "./pages/owner/OwnerLoginPage";
import { OwnerMenuPage } from "./pages/owner/OwnerMenuPage";
import { OwnerPosPage } from "./pages/owner/OwnerPosPage";

export default function App() {
  return (
    <AuthProvider>
      <OwnerAuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/app/login" replace />} />
          <Route path="/app/login" element={<OwnerLoginPage />} />
          <Route path="/app/change-password" element={<OwnerChangePasswordPage />} />
          <Route element={<OwnerProtectedRoute />}>
            <Route
              element={
                <OwnerOutletProvider>
                  <OwnerLayout />
                </OwnerOutletProvider>
              }
            >
              <Route path="/app" element={<OwnerDashboardPage />} />
              <Route path="/app/overview" element={<OwnerOverviewPage />} />
              <Route path="/app/pos" element={<OwnerPosPage />} />
              <Route path="/app/floor" element={<OwnerFloorPage />} />
              <Route path="/app/menu" element={<OwnerMenuPage />} />
            </Route>
          </Route>
          <Route path="/platform/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/platform" element={<PlatformLayout />}>
              <Route index element={<Navigate to="tenants" replace />} />
              <Route path="tenants" element={<TenantsPage />} />
              <Route path="onboard" element={<OnboardingPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/app/login" replace />} />
        </Routes>
      </OwnerAuthProvider>
    </AuthProvider>
  );
}
