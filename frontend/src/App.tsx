import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import MainLayout from './components/Layout/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import ActiveSession from './pages/ActiveSession';
import PatientProfile from './pages/PatientProfile';
import Profile from './pages/Profile';
import Transactions from './pages/Transactions';
import DripOrders from './pages/DripOrders';

// Non-Clinic Pages
import Inquiries from './pages/Inquiries';
import NonClinicPipeline from './pages/NonClinicPipeline';
import PreCheckFormPage from './pages/PreCheckForm';
import DoctorReviewPanel from './pages/DoctorReviewPanel';
import VitalsFormPage from './pages/VitalsForm';

// Admin Pages
import Clinics from './pages/admin/Clinics';
import Users from './pages/admin/Users';
import Therapies from './pages/admin/Therapies';
import Drips from './pages/admin/Drips';
import Partners from './pages/admin/Partners';
import Referrals from './pages/admin/Referrals';
import Settings from './pages/admin/Settings';
import HostReports from './pages/admin/HostReports';
import Offers from './pages/admin/Offers';

import ProtectedRoute from './components/ProtectedRoute';


const AdminRoute: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected routes with MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientProfile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/session/:id" element={<ActiveSession />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/drip-orders" element={<DripOrders />} />
          <Route path="/inquiries" element={<Inquiries />} />
          <Route path="/non-clinic" element={<NonClinicPipeline />} />
          <Route path="/non-clinic/:id/precheck" element={<PreCheckFormPage />} />
          <Route path="/non-clinic/:id/vitals" element={<VitalsFormPage />} />
          <Route path="/doctor-reviews" element={<DoctorReviewPanel />} />
        </Route>
      </Route>

      {/* Admin only routes with MainLayout */}
      <Route element={<AdminRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/clinics" element={<Clinics />} />
          <Route path="/users" element={<Users />} />
          <Route path="/therapies" element={<Therapies />} />
          <Route path="/drips" element={<Drips />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/host-reports" element={<HostReports />} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
