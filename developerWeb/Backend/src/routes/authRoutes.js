const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const { verifyDeveloper } = require('../controllers/verifyDeveloper.js');
const authController = require('../controllers/authController');
const planController = require('../controllers/planController');
const profileController = require('../controllers/profileController');

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.developerLogin);
router.post('/resend-verification', authController.resendVerificationEmail);
router.get('/verify', verifyDeveloper);
router.get('/verify-email-update', profileController.verifyEmailUpdate);

// Password reset (forgot password) - public
router.post('/forgot-password', authController.requestPasswordReset);
router.get('/reset-password', authController.resetPasswordWithToken);
router.post('/reset-password', authController.resetPasswordWithToken);

// Google OAuth routes - public
router.get('/auth/google', authController.googleLogin);
router.get('/auth/google/callback', authController.googleCallback);

// Plan routes (public - to view available plans)
router.get('/plans', planController.getPlans);

// Protected routes (authentication required)
router.use(authenticateToken);

// Get current developer info
router.get('/me', profileController.getProfile);

// Profile management
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.post('/change-password', profileController.changePassword);

// Password change request (authenticated) - sends email with link
router.post('/request-password-change', authController.requestPasswordChange);
router.get('/change-password', authController.changePasswordWithToken);
router.post('/change-password', authController.changePasswordWithToken);

// Plan management (authenticated)
router.get('/my-plan', planController.getDeveloperPlan);
router.post('/select-plan', planController.selectPlan);
router.post('/upgrade-plan', planController.upgradePlan);

module.exports = router;