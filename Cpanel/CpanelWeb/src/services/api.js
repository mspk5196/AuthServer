import { tokenService } from './tokenService';

export const API_BASE_URL = import.meta.env.VITE_CPANEL_API_BASE_URL;
const MAIN_PORTAL_URL = import.meta.env.VITE_MAIN_PORTAL_URL;

const handleAuthError = (status, data) => {
  const code = data?.error;
  if ((status === 401 || status === 403) && (code === 'NO_TOKEN' || code === 'INVALID_TOKEN')) {
    // Clear cPanel token and redirect to main developer portal login with message
    try {
      tokenService.clear();
    } catch (e) {
      // ignore storage errors
    }

    const base = MAIN_PORTAL_URL || 'https://authservices.mspkapps.in';
    const redirectUrl = `${base.replace(/\/$/, '')}/login?error=session_expired`;
    window.location.href = redirectUrl;
  }
};

export const api = {
  get: async (path, token) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handleAuthError(res.status, data);
      throw Object.assign(new Error(data.message || 'Request failed'), { data });
    }
    return data;
  },

  post: async (path, body, token) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handleAuthError(res.status, data);
      throw Object.assign(new Error(data.message || 'Request failed'), { data });
    }
    return data;
  },

  put: async (path, body, token) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handleAuthError(res.status, data);
      throw Object.assign(new Error(data.message || 'Request failed'), { data });
    }
    return data;
  },

  delete: async (path, token) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handleAuthError(res.status, data);
      throw Object.assign(new Error(data.message || 'Request failed'), { data });
    }
    return data;
  },
};
