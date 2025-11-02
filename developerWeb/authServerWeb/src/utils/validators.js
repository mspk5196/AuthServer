/**
 * Form validation utilities
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  return password.length >= 8;
};

export const validateUsername = (username) => {
  // 3-20 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const validateAppName = (appName) => {
  // 3-30 characters, alphanumeric, underscore, and hyphen
  const appNameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return appNameRegex.test(appName);
};

export const validateRequired = (value) => {
  return value && value.trim().length > 0;
};
