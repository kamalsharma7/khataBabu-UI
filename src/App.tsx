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
import { PlatformExpenditurePage } from "./pages/PlatformExpenditurePage";
import { PlatformTerritoryPage } from "./pages/PlatformTerritoryPage";
import { PlatformCollectionsPage } from "./pages/PlatformCollectionsPage";
import { PlatformSalesEmployeesPage } from "./pages/PlatformSalesEmployeesPage";
import { TenantsPage } from "./pages/TenantsPage";
import { OwnerChangePasswordPage } from "./pages/owner/OwnerChangePasswordPage";
import { OwnerDashboardPage } from "./pages/owner/OwnerDashboardPage";
import { OwnerOverviewPage } from "./pages/owner/OwnerOverviewPage";
import { OwnerFloorPage } from "./pages/owner/OwnerFloorPage";
import { OwnerForgotPasswordPage } from "./pages/owner/OwnerForgotPasswordPage";
import { OwnerLoginPage } from "./pages/owner/OwnerLoginPage";
import { OwnerResetPasswordPage } from "./pages/owner/OwnerResetPasswordPage";
import { OwnerMenuPage } from "./pages/owner/OwnerMenuPage";
import { OwnerItemRecipesPage } from "./pages/owner/OwnerItemRecipesPage";
import { OwnerRawMaterialsPage } from "./pages/owner/OwnerRawMaterialsPage";
import { OwnerPurchasesPage } from "./pages/owner/OwnerPurchasesPage";
import { OwnerCustomersPage } from "./pages/owner/OwnerCustomersPage";
import { OwnerPosPage } from "./pages/owner/OwnerPosPage";
import { OwnerSettingsPage } from "./pages/owner/OwnerSettingsPage";
import { OwnerAuditLogPage } from "./pages/owner/OwnerAuditLogPage";

export default function App() {
  return (
    <AuthProvider>
      <OwnerAuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/app/login" replace />} />
          <Route path="/app/login" element={<OwnerLoginPage />} />
          <Route path="/app/forgot-password" element={<OwnerForgotPasswordPage />} />
          <Route path="/app/reset-password" element={<OwnerResetPasswordPage />} />
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
              <Route path="/app/recipes" element={<OwnerItemRecipesPage />} />
              <Route path="/app/raw-materials" element={<OwnerRawMaterialsPage />} />
              <Route path="/app/purchases" element={<OwnerPurchasesPage />} />
              <Route path="/app/customers" element={<OwnerCustomersPage />} />
              <Route path="/app/settings" element={<OwnerSettingsPage />} />
              <Route path="/app/audit" element={<OwnerAuditLogPage />} />
            </Route>
          </Route>
          <Route path="/platform/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/platform" element={<PlatformLayout />}>
              <Route index element={<Navigate to="tenants" replace />} />
              <Route path="tenants" element={<TenantsPage />} />
              <Route path="onboard" element={<OnboardingPage />} />
              <Route path="employees" element={<PlatformSalesEmployeesPage />} />
              <Route path="expenditure" element={<PlatformExpenditurePage />} />
              <Route path="territory" element={<PlatformTerritoryPage />} />
              <Route path="collections" element={<PlatformCollectionsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/app/login" replace />} />
        </Routes>
      </OwnerAuthProvider>
    </AuthProvider>
  );
}
