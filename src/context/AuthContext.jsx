import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeRole } from '../utils/roleUtils';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => sessionStorage.getItem('eventhub_token') || localStorage.getItem('eventhub_token')
  );
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const storedUserRaw =
          sessionStorage.getItem('eventhub_user') || localStorage.getItem('eventhub_user');
        const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : {};

        const rawId =
          storedUser.idPerson ||
          storedUser.id ||
          decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
          decoded.nameid ||
          decoded.sub ||
          0;

        const rawRole =
          storedUser.role ||
          decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
          decoded.role;

        const rawCompanyId =
          storedUser.idCompany ??
          storedUser.IdCompany ??
          storedUser.companyId ??
          decoded.CompanyId ??
          decoded.companyId ??
          decoded['CompanyId'] ??
          null;

        const parsedCompanyId =
          rawCompanyId !== null && rawCompanyId !== undefined && rawCompanyId !== ''
            ? parseInt(rawCompanyId, 10)
            : null;

        const userData = {
          id: parseInt(rawId, 10) || rawId,
          idPerson: parseInt(rawId, 10) || rawId,
          idCompany: parsedCompanyId,
          companyId: parsedCompanyId,
          companyName: storedUser.companyName || storedUser.CompanyName || null,
          linkedInUrl: storedUser.linkedInUrl || storedUser.LinkedInUrl || null,
          email:
            storedUser.email ||
            decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
            decoded.email ||
            decoded.sub,
          role: normalizeRole(rawRole),
          firstName: storedUser.firstName || '',
          lastName: storedUser.lastName || '',
        };
        setUser(userData);
      } catch (error) {
        console.error('Invalid token payload:', error);
        logout();
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = (jwtToken, userDto = null) => {
    sessionStorage.setItem('eventhub_token', jwtToken);
    localStorage.setItem('eventhub_token', jwtToken);
    if (userDto) {
      sessionStorage.setItem('eventhub_user', JSON.stringify(userDto));
      localStorage.setItem('eventhub_user', JSON.stringify(userDto));
    }
    try {
      queryClient.clear();
    } catch (e) {
      console.warn('Failed to clear query client on login:', e);
    }
    setToken(jwtToken);
  };

  const logout = () => {
    sessionStorage.removeItem('eventhub_token');
    sessionStorage.removeItem('eventhub_user');
    localStorage.removeItem('eventhub_token');
    localStorage.removeItem('eventhub_user');
    try {
      queryClient.clear();
    } catch (e) {
      console.warn('Failed to clear query client on logout:', e);
    }
    setToken(null);
    setUser(null);
  };

  const normalizedRole = user?.role ? normalizeRole(user.role) : null;
  const isSuperAdmin = normalizedRole === 'SuperAdmin';
  const isOrganiser = normalizedRole === 'EventOrganiser' || isSuperAdmin;
  const isStaff = normalizedRole === 'Staff' || isOrganiser;
  const isSponsor = normalizedRole === 'Sponsor' || isOrganiser;
  const isSpeaker = normalizedRole === 'Speaker';
  const isSpokesperson = normalizedRole === 'Spokesperson';
  const isVIP = normalizedRole === 'VIP';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        normalizedRole,
        isSuperAdmin,
        isOrganiser,
        isStaff,
        isSponsor,
        isSpeaker,
        isSpokesperson,
        isVIP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};