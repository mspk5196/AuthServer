import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const tokenKey = 'cpanel_jwt';
const tokenService = {
  get: () => localStorage.getItem(tokenKey),
  set: (t) => (t ? localStorage.setItem(tokenKey, t) : localStorage.removeItem(tokenKey)),
  clear: () => localStorage.removeItem(tokenKey),
};

export const AuthProvider = ({ children }) => {
  const [developer, setDeveloper] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    // Clear the cPanel token
    tokenService.clear();
    setDeveloper(null);
    
    // Redirect to main developer portal
    const mainPortalUrl = import.meta.env.VITE_MAIN_PORTAL_URL;
    window.location.href = mainPortalUrl;
  };

  const value = {
    developer,
    setDeveloper,
    loading,
    setLoading,
    logout,
    tokenService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
