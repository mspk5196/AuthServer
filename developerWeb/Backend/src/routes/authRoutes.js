const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const authController = require('../controllers/authController');

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (authentication required)
// router.use(authenticateToken);
// Add protected routes here

module.exports = router;