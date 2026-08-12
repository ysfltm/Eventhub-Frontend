import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/roleUtils';

const RoleGuard = ({ allowedRoles }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = normalizeRole(user?.role);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

    if (!normalizedAllowed.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default RoleGuard;