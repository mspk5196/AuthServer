/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { api } from '../utils/api';
import { tokenService } from './tokenService';

export const authService = {
  // Register new developer
  register: async (userData) => {
    const response = await api.post('/developer/register', userData);
    return response;
  },

  // Login developer
  login: async (credentials) => {
    const response = await api.post('/developer/login', credentials);
    
    // Store tokens if provided
    if (response.token) {
      tokenService.setToken(response.token);
    }
    if (response.refreshToken) {
      tokenService.setRefreshToken(response.refreshToken);
    }
    
    return response;
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
    return response;
  },

  // Verify email
  verifyEmail: async (token) => {
    const response = await api.get(`/developer/verify?token=${token}`);
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

    if (response.token) {
      tokenService.setToken(response.token);
    }

    return response;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = tokenService.getToken();
    if (!token) return false;
    
    // Check if token is expired
    return !tokenService.isTokenExpired(token);
  },
};
