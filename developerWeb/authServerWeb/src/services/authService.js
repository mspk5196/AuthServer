/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { api } from '../utils/api';
import { tokenService } from './tokenService';

export const authService = {
  // Register new developer
  register: async (formData) => {
    const { confirmPassword, ...registerData } = formData;
    
    console.log('Sending registration data:', registerData);
    const response = await api.post('/developer/register', registerData);
    
    return response;
  },

  // Login developer
  login: async (credentials) => {
    const response = await api.post('/developer/login', credentials);
    
    // Normalize response shape and store tokens
    const tokens = response?.data?.tokens || {
      accessToken: response?.token || response?.accessToken,
      refreshToken: response?.refreshToken,
    };

    if (tokens?.accessToken) {
      tokenService.setToken(tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      tokenService.setRefreshToken(tokens.refreshToken);
    }

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
    const response = await api.get('/developer/me');
    const developer =
      response?.developer ||
      response?.data?.developer ||
      response?.user ||
      response?.data?.user ||
      null;
    return { developer };
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
    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/developer/refresh-token', {
      refreshToken
    });

    // Support multiple shapes for refreshed token
    const newAccessToken =
      response?.data?.token ||
      response?.data?.accessToken ||
      response?.token ||
      response?.accessToken;
    if (newAccessToken) {
      tokenService.setToken(newAccessToken);
    }

    // Optionally return normalized structure
    return { token: newAccessToken };
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = tokenService.getToken();
    if (!token) return false;
    
    // Check if token is expired
    return !tokenService.isTokenExpired(token);
  },
};
