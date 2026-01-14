/**
 * JWT Token Service
 * Handles JWT token storage and management in localStorage
 * Also manages refresh token logic
 */

// The frontend must NOT store or manage signing secrets or refresh tokens.
// Token lifecycle (access/refresh token issuance, refresh, and revocation)
// should be handled entirely by the backend using secure httpOnly cookies.
// This `tokenService` is intentionally a no-op shim to avoid storing tokens
// in localStorage. Keep methods for compatibility but they do not persist
// or return sensitive values.
export const tokenService = {
  getToken: () => null,
  setToken: (_token) => {
    // no-op: tokens are managed by backend via httpOnly cookies
  },
  getRefreshToken: () => null,
  setRefreshToken: (_token) => {
    // no-op
  },
  clearTokens: () => {
    // no-op
  },
  hasToken: () => false,
  decodeToken: (_token) => null,
  isTokenExpired: (_token) => true,
  getUserFromToken: (_token) => null,
};
