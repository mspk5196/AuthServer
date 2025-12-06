const express = require('express');
const router = express.Router();
const {
  verifyAppCredentials,
  registerUser,
  loginUser,
  verifyEmail,
  getUserProfile,
  requestPasswordReset,
  resetPasswordPage,
  completePasswordReset,
  changePassword,
  resendVerification,
  deleteAccount
} = require('../controllers/publicApiController');

// Public routes (no API key required)
router.get('/auth/verify-email', verifyEmail);
router.get('/auth/reset-password', resetPasswordPage);
router.post('/auth/reset-password', completePasswordReset);

// All routes below require API key and secret
router.use(verifyAppCredentials);

// Auth endpoints
router.post('/:apiKey/auth/register', registerUser);
router.post('/:apiKey/auth/login', loginUser);
router.post('/:apiKey/auth/request-password-reset', requestPasswordReset);
router.post('/:apiKey/auth/change-password', changePassword);
router.post('/:apiKey/auth/resend-verification', resendVerification);
router.post('/:apiKey/auth/delete-account', deleteAccount);

// User profile (requires Bearer token)
router.get('/:apiKey/user/profile', getUserProfile);

module.exports = router;