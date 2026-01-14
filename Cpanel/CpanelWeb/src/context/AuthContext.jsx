import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider here');
  }
  return context;
};

// Do not persist JWTs in the frontend. Backend must set httpOnly cookies.
const tokenService = {
  get: () => null,
  set: () => {},
  clear: () => {},
};

export const AuthProvider = ({ children }) => {
  const [developer, setDeveloper] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    // Clear the cPanel token and session expiry
    tokenService.clear();
    localStorage.removeItem('cpanel_session_expiry');
    setDeveloper(null);
    
    // Redirect to main developer portal
    const mainPortalUrl = import.meta.env.VITE_MAIN_PORTAL_URL;
    window.location.href = mainPortalUrl;
  };

  // Set session expiry when developer is set
  useEffect(() => {
    if (developer && !localStorage.getItem('cpanel_session_expiry')) {
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
      localStorage.setItem('cpanel_session_expiry', expiryTime.toISOString());
    }
  }, [developer]);

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
