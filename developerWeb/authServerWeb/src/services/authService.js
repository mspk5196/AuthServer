/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { api } from '../utils/api';
import { tokenService } from './tokenService';

export const authService = {
  // Register new developer
  register: async (formData) => {
    const { confirmPassword, acceptPolicies, ...rest } = formData;
    
    const registerData = {
      ...rest,
      acceptPolicies: !!acceptPolicies,
    };

    console.log('Sending registration data:', registerData);
    const response = await api.post('/developer/register', registerData);
    
    return response;
  },

  // Login developer
  login: async (credentials) => {
    const response = await api.post('/developer/login', credentials);
    
    // Expect backend to set httpOnly cookies for access/refresh tokens.
    // Do not store tokens in frontend. Normalize developer/user payload below.

    // Normalize developer/user payload
    const developer =
      response?.data?.user ||
      response?.data?.developer ||
      response?.developer ||
      response?.user ||
      null;

    return { developer };
  },

  // Logout developer
  logout: async () => {
    try {
      await api.post('/developer/logout');
    } finally {
      // Always clear tokens even if API call fails
      tokenService.clearTokens();
    }
  },

  // Get current developer
  getCurrentDeveloper: async () => {
    try {
      const response = await api.get('/developer/me', { redirectOn401: false });
      const developer =
        response?.developer ||
        response?.data?.developer ||
        response?.user ||
        response?.data?.user ||
        null;
      return { developer };
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const code = err?.data?.error || err?.response?.data?.error;
      if (status === 401 || code === 'NO_TOKEN' || code === 'INVALID_TOKEN') {
        return { developer: null };
      }
      throw err;
    }
  },

  // Verify email
  verifyEmail: async (token) => {
    const response = await api.get(`/developer/verify?token=${token}`);
    return response;
  },

  // Resend verification email
  resendVerification: async (email) => {
    const response = await api.post('/developer/resend-verification', { email });
    return response;
  },

  // Refresh access token
  refreshToken: async () => {
    // Ask backend to refresh tokens using httpOnly refresh cookie. Backend
    // should set the new access cookie in the response. Frontend should not
    // persist tokens in localStorage.
    const response = await api.post('/developer/refresh-token');
    return response;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    // Frontend shouldn't rely on local token presence. Use `getCurrentDeveloper`
    // from the backend to determine authentication state. This method remains
    // for compatibility and returns false.
    return false;
  },

  // Request password reset (forgot password)
  forgotPassword: async (email) => {
    const response = await api.post('/developer/forgot-password', { email });
    return response;
  },

  // Request password change (authenticated user)
  requestPasswordChange: async () => {
    const response = await api.post('/developer/request-password-change');
    return response;
  },
};
