import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import Dashboard from '../pages/Dashboard';
import ProfilePage from '../pages/ProfilePage';
import EventsPage from '../pages/events/EventsPage';
import EventDetailsPage from '../pages/events/EventDetailsPage';
import MyPassesPage from '../pages/events/MyPassesPage';
import MyRegistrationsPage from '../pages/events/MyRegistrationsPage';
import DigitalPassPage from '../pages/events/DigitalPassPage';
import CheckInPage from '../pages/events/CheckInPage';
import CreateEventPage from '../pages/events/CreateEventPage';
import AttendeeRosterPage from '../pages/events/AttendeeRosterPage';
import CompanyManagementPage from '../pages/admin/CompanyManagementPage';
import AnalyticsPage from '../pages/admin/AnalyticsPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import LiveEventArenaPage from '../pages/events/LiveEventArenaPage';
import DashboardLayout from '../layouts/DashboardLayout';
import RoleGuard from '../components/protection/RoleGuard';
import { NotificationProvider } from '../context/NotificationContext';
import { ALL_ROLES, ROLES } from '../utils/roleUtils';

const AppRoutes = () => {
  return (
    <NotificationProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/unauthorized"
          element={
            <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-8 rounded-3xl text-center max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold text-[var(--cst-red-400)] mb-2">403 — Access Restricted</h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  Your account role does not have privilege to access this module.
                </p>
              </div>
            </div>
          }
        />

        {/* Protected Dashboard Shell — all 8 canonical authenticated roles */}
        <Route element={<RoleGuard allowedRoles={ALL_ROLES} />}>
          <Route element={<DashboardLayout />}>
            {/* Routes available to all authenticated roles */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailsPage />} />
            <Route path="/events/:id/live-arena" element={<LiveEventArenaPage />} />
            <Route path="/passes" element={<MyPassesPage />} />
            <Route path="/my-registrations" element={<MyRegistrationsPage />} />
            <Route path="/tickets/:id" element={<DigitalPassPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* SuperAdmin exclusive event creation route */}
            <Route element={<RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />}>
              <Route path="/events/new" element={<CreateEventPage />} />
            </Route>

            {/* Organiser & SuperAdmin analytics routes */}
            <Route element={<RoleGuard allowedRoles={[ROLES.SUPER_ADMIN, ROLES.EVENT_ORGANISER]} />}>
              <Route path="/admin/analytics" element={<AnalyticsPage />} />
            </Route>

            {/* Door Check-In, User Roster & Attendee Roster routes (SuperAdmin, Organiser, Staff) */}
            <Route element={<RoleGuard allowedRoles={[ROLES.SUPER_ADMIN, ROLES.EVENT_ORGANISER, ROLES.STAFF]} />}>
              <Route path="/admin/check-in" element={<CheckInPage />} />
              <Route path="/check-in" element={<CheckInPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/user-management" element={<UserManagementPage />} />
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/admin/events/:eventId/attendees" element={<AttendeeRosterPage />} />
              <Route path="/events/:id/attendees" element={<AttendeeRosterPage />} />
            </Route>

            {/* Company Hosts directory routes (SuperAdmin, Organiser, Sponsor) */}
            <Route element={<RoleGuard allowedRoles={[ROLES.SUPER_ADMIN, ROLES.EVENT_ORGANISER, ROLES.SPONSOR]} />}>
              <Route path="/admin/companies" element={<CompanyManagementPage />} />
            </Route>
          </Route>
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </NotificationProvider>
  );
};

export default AppRoutes;