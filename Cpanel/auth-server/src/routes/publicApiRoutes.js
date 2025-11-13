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
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify-email', verifyEmail);
router.get('/user/profile', getUserProfile);

module.exports = router;