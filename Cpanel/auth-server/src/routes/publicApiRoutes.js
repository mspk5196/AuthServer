const express = require('express');
const router = express.Router();
const {
  verifyAppCredentials,
  registerUser,
  loginUser,
  verifyEmail,
  getUserProfile
} = require('../controllers/publicApiController');

// All routes require API key and secret
router.use(verifyAppCredentials);

// Authentication endpoints
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.get('/auth/verify-email', verifyEmail);
router.get('/auth/user/profile', getUserProfile);

module.exports = router;