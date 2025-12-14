const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const { verifyDeveloper } = require('../controllers/verifyDeveloper.js');
const authController = require('../controllers/authController');
const planController = require('../controllers/planController');
const dashboardController = require('../controllers/dashboardController');
const profileController = require('../controllers/profileController');
const paymentController = require('../controllers/paymentController');
const policyController = require('../controllers/policyController');

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.developerLogin);
router.post('/resend-verification', authController.resendVerificationEmail);
router.get('/verify', verifyDeveloper);
router.get('/verify-email-update', profileController.verifyEmailUpdate);

// Public policies route (DB-backed policies for terms/privacy/refund)
router.get('/policies', policyController.getActivePolicies);

// Password reset (forgot password) - public
router.post('/forgot-password', authController.requestPasswordReset);
router.get('/reset-password', authController.resetPasswordWithToken);
router.post('/reset-password', authController.resetPasswordWithToken);

// Google OAuth routes - public
router.get('/auth/google', authController.googleLogin);
router.get('/auth/google/callback', authController.googleCallback);
router.post('/accept-policies-oauth', authController.acceptPoliciesForOAuth);

// Plan routes (public - to view available plans)
router.get('/plans', planController.getPlans);

// Password change via email link - public (token-based)
router.get('/change-password', authController.changePasswordWithToken);
router.post('/change-password', authController.changePasswordWithToken);

// Protected routes (authentication required)
router.use(authenticateToken);

// Get current developer info
router.get('/me', profileController.getProfile);

// Profile management
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
// router.post('/change-password', profileController.changePassword);

// Password change request (authenticated) - sends email with link
router.post('/request-password-change', authController.requestPasswordChange);

// Plan management (authenticated)
router.get('/my-plan', planController.getDeveloperPlan);
router.post('/select-plan', planController.selectPlan);
router.post('/upgrade-plan', planController.upgradePlan);
router.post('/cancel-plan', planController.cancelPlan);

// Dashboard stats (authenticated)
router.get('/dashboard/stats', dashboardController.getDashboardStats);

// Payment routes (authenticated)
router.post('/payment/create-order', paymentController.createOrder);
router.post('/payment/verify', paymentController.verifyPayment);
router.get('/payment/history', paymentController.getPaymentHistory);

module.exports = router;