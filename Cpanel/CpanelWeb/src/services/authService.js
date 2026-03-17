import { api } from './api';

export const authService = {
  // Get current developer session; return null if no session (401/NO_TOKEN)
  getCurrentDeveloper: async () => {
    try {
      const resp = await api.get('/me');
      // normalize response
      return resp?.developer || resp?.data?.developer || null;
    } catch (err) {
      // If backend indicates no token or unauthorized, treat as unauthenticated
      const status = err?.status || err?.response?.status;
      const code = err?.data?.error || err?.response?.data?.error;
      if (status === 401 || code === 'NO_TOKEN' || code === 'INVALID_TOKEN') {
        return null;
      }
      throw err;
    }
  }
};

export default authService;
