// tokenService is intentionally a no-op in the frontend.
// JWT handling must be done by the backend using httpOnly cookies.
export const tokenService = {
  get: () => null,
  set: () => {},
  clear: () => {},
};
