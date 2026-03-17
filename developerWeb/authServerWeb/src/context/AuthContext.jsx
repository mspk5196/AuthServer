import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tokenService } from '../services/tokenService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [developer, setDeveloper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Try to get current developer from backend. Backend should return
      // developer data when an httpOnly access cookie is valid.
      const data = await authService.getCurrentDeveloper();
      setDeveloper(data.developer);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      tokenService.clearTokens();
      setDeveloper(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    // Login response may not include full developer profile; refresh from backend
    // (session cookie based) so UI has complete data without requiring a reload.
    try {
      await checkAuth();
    } catch (e) {
      setDeveloper(data.developer);
    }
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setDeveloper(null);
      tokenService.clearTokens();
    }
  };

  const updateDeveloper = (updatedData) => {
    setDeveloper(prev => ({ ...prev, ...updatedData }));
  };

  const value = {
    developer,
    loading,
    initialized,
    login,
    register,
    logout,
    checkAuth,
    updateDeveloper,
    isAuthenticated: !!developer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
