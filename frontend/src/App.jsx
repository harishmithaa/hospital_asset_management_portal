import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import DashboardLayout from './layouts/DashboardLayout';

// Pages — shared
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import EquipmentDetails from './pages/EquipmentDetails';
import Maintenance from './pages/Maintenance';
import Complaints from './pages/Complaints';
import Calibration from './pages/Calibration';
import WarrantyAMC from './pages/WarrantyAMC';
import Vendors from './pages/Vendors';
import Departments from './pages/Departments';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';

// Pages — Department Staff
import RaiseComplaint from './pages/staff/RaiseComplaint';
import MyComplaints from './pages/staff/MyComplaints';

// Pages — Vendor
import ServiceRequests from './pages/vendor/ServiceRequests';
import ServiceReports from './pages/vendor/ServiceReports';

// ─── Route Guards ──────────────────────────────────────────────────────────

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <DashboardLayout>{children}</DashboardLayout>;
}

function RoleProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Dashboard — all roles */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Equipment — all roles (role-filtered content) */}
            <Route path="/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
            <Route path="/equipment/:id" element={<ProtectedRoute><EquipmentDetails /></ProtectedRoute>} />

            {/* Admin-only pages */}
            <Route path="/departments" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Admin']}><Departments /></RoleProtectedRoute></ProtectedRoute>
            } />
            <Route path="/vendors" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Admin']}><Vendors /></RoleProtectedRoute></ProtectedRoute>
            } />
            <Route path="/warranty-amc" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Admin']}><WarrantyAMC /></RoleProtectedRoute></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Admin']}><Reports /></RoleProtectedRoute></ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Admin']}><Users /></RoleProtectedRoute></ProtectedRoute>
            } />

            {/* Admin + Engineer pages */}
            <Route path="/maintenance" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Admin', 'Biomedical Engineer']}><Maintenance /></RoleProtectedRoute></ProtectedRoute>
            } />
            <Route path="/complaints" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Admin', 'Biomedical Engineer']}><Complaints /></RoleProtectedRoute></ProtectedRoute>
            } />
            <Route path="/calibration" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Admin', 'Biomedical Engineer']}><Calibration /></RoleProtectedRoute></ProtectedRoute>
            } />

            {/* Department Staff pages */}
            <Route path="/raise-complaint" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Department Staff']}><RaiseComplaint /></RoleProtectedRoute></ProtectedRoute>
            } />
            <Route path="/my-complaints" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Department Staff']}><MyComplaints /></RoleProtectedRoute></ProtectedRoute>
            } />

            {/* Vendor pages */}
            <Route path="/service-requests" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Vendor']}><ServiceRequests /></RoleProtectedRoute></ProtectedRoute>
            } />
            <Route path="/service-reports" element={
              <ProtectedRoute><RoleProtectedRoute allowedRoles={['Vendor']}><ServiceReports /></RoleProtectedRoute></ProtectedRoute>
            } />

            {/* Shared pages — all roles */}
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
