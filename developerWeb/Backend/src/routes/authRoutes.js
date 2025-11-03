const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const { verifyDeveloper } = require('../controllers/verifyDeveloper.js');
const authController = require('../controllers/authController');

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.developerLogin);
router.post('/resend-verification', authController.resendVerificationEmail);
router.get('/verify', verifyDeveloper);

// Protected routes (authentication required)
// router.use(authenticateToken);
// Add protected routes here

module.exports = router;