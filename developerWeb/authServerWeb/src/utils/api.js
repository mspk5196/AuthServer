/**
 * Enhanced API utility with JWT token support
 */

import { tokenService } from '../services/tokenService';

// Base URL that already includes the /api prefix
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// Host-level URL (no /api) for building full absolute links (e.g. OAuth redirects)
export const API_URL = import.meta.env.VITE_API_URL || API_BASE_URL;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.error = data?.error; // Extract error code for easier access
    this.name = 'ApiError';
  }
}

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    // Handle unauthorized - clear tokens
    // But don't clear tokens for email not verified or account blocked errors
    if (response.status === 401 && data.error !== 'EMAIL_NOT_VERIFIED') {
      tokenService.clearTokens();
      // Optionally redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    throw new ApiError(
      data.message || data.error || 'Request failed',
      response.status,
      data
    );
  }

  return data;
};

const getHeaders = (customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Add JWT token if available
  const token = tokenService.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const api = {
  get: async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      credentials: 'include',
      headers: getHeaders(options.headers),
      ...options,
    });
    return handleResponse(response);
  },

  post: async (endpoint, body, options = {}) => {
    console.log('API POST Request:', {
      url: `${API_BASE_URL}${endpoint}`,
      body: body,
      headers: getHeaders(options.headers)
    });
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(options.headers),
      body: JSON.stringify(body),
      ...options,
    });
    return handleResponse(response);
  },

  put: async (endpoint, body, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(options.headers),
      body: JSON.stringify(body),
      ...options,
    });
    return handleResponse(response);
  },

  patch: async (endpoint, body, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getHeaders(options.headers),
      body: JSON.stringify(body),
      ...options,
    });
    return handleResponse(response);
  },

  delete: async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(options.headers),
      ...options,
    });
    return handleResponse(response);
  },
};

export { ApiError };

// Default export for backward compatibility with older imports
export default api;
