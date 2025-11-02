/**
 * JWT Token Service
 * Handles JWT token storage and management in localStorage
 * Also manages refresh token logic
 */

const TOKEN_KEY = import.meta.env.VITE_JWT_SECRET;
const REFRESH_TOKEN_KEY = import.meta.env.VITE_JWT_REFRESH_SECRET;

export const tokenService = {
  // Get access token
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Set access token
  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  // Get refresh token
  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // Set refresh token
  setRefreshToken: (token) => {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  // Remove all tokens
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // Check if token exists
  hasToken: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // Decode JWT token (without verification)
  decodeToken: (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  // Check if token is expired
  isTokenExpired: (token) => {
    if (!token) return true;
    
    const decoded = tokenService.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  },

  // Get user data from token
  getUserFromToken: (token) => {
    if (!token) return null;
    
    const decoded = tokenService.decodeToken(token);
    return decoded ? {
      id: decoded.id || decoded.developerId,
      email: decoded.email,
      username: decoded.username,
      name: decoded.name,
      exp: decoded.exp,
      iat: decoded.iat
    } : null;
  },
};
