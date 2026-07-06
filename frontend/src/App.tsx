import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Inventory from "./pages/Inventory";
import InventoryHistory from "./pages/InventoryHistory";
import Sales from "./pages/Sales";
import Borrowers from "./pages/Borrowers";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import EmployeeAttendance from "./pages/EmployeeAttendance";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import OnboardOrganization from "./pages/OnboardOrganization";
import EmployeeSetDuty from "./pages/EmployeeSetDuty";
import Products from "./pages/Products";
import GunInfo from "./pages/GunInfo";
import SalesHistory from "./pages/SalesHistory";
import Documents from "./pages/Documents";
import BankDeposits from "./pages/BankDeposits";
import { ResetPasswordPage } from "./contexts/ResetPasswordPage";
import EmployeeDutyInfo from "./pages/EmployeeDutyInfo";
import EmployeeTaskHistory from "./pages/EmployeeTaskHistory";
import AllEmployeeTasks from "./pages/AllEmployeeTasks";
import SpecialDuties from "./pages/SpecialDuties";
import DailyDuties from "./pages/DailyDuties";
import SpecialDutiesHistory from "./pages/SpecialDutiesHistory";
import DailyDutiesHistory from "./pages/DailyDutiesHistory";
import { useProfileImageSync } from "@/hooks/useProfileImageSync";
import StockRegisterPage from "./pages/StockRegisterPage";

const queryClient = new QueryClient();

// Scroll to top on route changes, skip hash anchors
const ScrollToTop: React.FC = () => {
  const { pathname, search, hash } = useLocation();
  React.useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search, hash]);
  return null;
};

const App: React.FC = () => {
  useProfileImageSync(); // <-- crucial place

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ScrollToTop />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboard-organization" element={<OnboardOrganization />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guninfo"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <GunInfo />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Employees />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
            
              <Route
                path="/stock-register"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <StockRegisterPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
                
              <Route
                path="/documents"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Documents />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bank-deposits"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <BankDeposits />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/all-employee-tasks"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <AllEmployeeTasks />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee-duty-info"
                element={
                  <ProtectedRoute requiredRoles={["employee"]}>
                    <DashboardLayout>
                      <EmployeeDutyInfo />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee-task-history"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager", "employee"]}>
                    <DashboardLayout>
                      <EmployeeTaskHistory />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/special-duties"
                element={
                  <ProtectedRoute requiredRoles={["employee"]}>
                    <DashboardLayout>
                      <SpecialDuties />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/special-duties-history"
                element={
                  <ProtectedRoute requiredRoles={["employee"]}>
                    <DashboardLayout>
                      <SpecialDutiesHistory />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/daily-duties"
                element={
                  <ProtectedRoute requiredRoles={["employee"]}>
                    <DashboardLayout>
                      <DailyDuties />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/daily-duties-history"
                element={
                  <ProtectedRoute requiredRoles={["employee"]}>
                    <DashboardLayout>
                      <DailyDutiesHistory />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/employee-set-duty"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <EmployeeSetDuty />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Inventory />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/history"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <InventoryHistory />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager", "employee"]}>
                    <DashboardLayout>
                      <Sales />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Products />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/borrowers"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Borrowers />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Reports />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Expenses />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/attendance"
              element={
                <ProtectedRoute requiredRoles={["employee"]}>
                  <DashboardLayout>
                    <EmployeeAttendance />
                  </DashboardLayout>
                </ProtectedRoute>
              }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute requiredRoles={["employee", "manager", "owner"]}>
                    <DashboardLayout>
                      <Profile />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Settings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager"]}>
                    <DashboardLayout>
                      <Analytics />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales-history"
                element={
                  <ProtectedRoute requiredRoles={["owner", "manager", "employee"]}>
                    <DashboardLayout>
                      <SalesHistory />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
