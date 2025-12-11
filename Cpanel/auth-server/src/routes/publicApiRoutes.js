const express = require('express');
const router = express.Router();
const  publicApis  = require('../controllers/publicApiController');

// Public routes (no API key required)
router.get('/auth/verify-email', publicApis.verifyEmail);
router.get('/auth/reset-password', publicApis.resetPasswordPage);
router.post('/auth/reset-password', publicApis.completePasswordReset);
router.get('/auth/verify-delete-email', publicApis.verifyDeleteEmail);
router.get('/auth/verify-email-set-password-google-user', publicApis.verifyEmailSetPasswordGoogleUser);

// All routes below require API key and secret
router.use(publicApis.verifyAppCredentials);
// Auth endpoints
router.post('/:apiKey/auth/register', publicApis.registerUser);
router.post('/:apiKey/auth/login', publicApis.loginUser);
router.post('/:apiKey/auth/google', publicApis.googleAuth);
router.post('/:apiKey/auth/set-password-google-user', publicApis.setPasswordGoogleUser);
router.post('/:apiKey/auth/request-password-reset', publicApis.requestPasswordReset);
router.post('/:apiKey/auth/change-password', publicApis.changePassword);
router.post('/:apiKey/auth/resend-verification', publicApis.resendVerification);
router.post('/:apiKey/auth/delete-account', publicApis.deleteAccount);

// User profile (requires Bearer token)
router.get('/:apiKey/user/profile', publicApis.getUserProfile);

module.exports = router;