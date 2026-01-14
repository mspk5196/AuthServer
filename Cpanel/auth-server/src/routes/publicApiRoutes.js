const express = require('express');
const router = express.Router();
const  publicApis  = require('../controllers/publicApiController');

// Public routes (no API key required)
router.get('/auth/verify-email', publicApis.verifyEmail);
router.get('/auth/reset-password', publicApis.resetPasswordPage);
router.post('/auth/reset-password', publicApis.completePasswordReset);
router.get('/auth/verify-delete-email', publicApis.verifyDeleteEmail);
// Confirm pending profile updates (token in query)
router.get('/user/confirm-update', publicApis.confirmUserUpdate);
// Public GET + POST: user enters password directly on backend-served page
router.get('/auth/verify-email-set-password-google-user', publicApis.verifyEmailSetPasswordGoogleUser);
router.post('/auth/verify-email-set-password-google-user', publicApis.verifyEmailSetPasswordGoogleUser);
// Public change-password verification page (email -> token -> form)
router.get('/auth/verify-change-password', publicApis.verifyChangePassword);
router.post('/auth/verify-change-password', publicApis.verifyChangePassword);

// All routes below require API key and secret
router.use(publicApis.verifyAppCredentials);
// Auth endpoints
router.post('/:apiKey/auth/register', publicApis.registerUser);
router.post('/:apiKey/auth/login', publicApis.loginUser);
router.post('/:apiKey/auth/google', publicApis.googleAuth);
router.post('/:apiKey/auth/set-password-google-user', publicApis.setPasswordGoogleUser);
router.post('/:apiKey/auth/request-password-reset', publicApis.requestPasswordReset);
router.post('/:apiKey/auth/request-change-password-link', publicApis.requestChangePasswordLink);
router.post('/:apiKey/auth/verify-token', publicApis.verifyAccessToken);
// router.post('/:apiKey/auth/change-password', publicApis.changePassword);
router.post('/:apiKey/auth/resend-verification', publicApis.resendVerification);
router.post('/:apiKey/auth/delete-account', publicApis.deleteAccount);

// User profile (requires Bearer token)
router.get('/:apiKey/user/profile', publicApis.getUserProfile);
router.patch('/:apiKey/user/profile', publicApis.patchUserProfile);

module.exports = router;