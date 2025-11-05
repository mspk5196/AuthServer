const tokenKey = 'cpanel_jwt';

export const tokenService = {
  get: () => localStorage.getItem(tokenKey),
  set: (token) => {
    if (token) {
      localStorage.setItem(tokenKey, token);
    } else {
      localStorage.removeItem(tokenKey);
    }
  },
  clear: () => localStorage.removeItem(tokenKey),
};
