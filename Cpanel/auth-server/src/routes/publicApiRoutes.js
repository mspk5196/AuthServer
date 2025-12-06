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
// router.post('/auth/register', registerUser);
// router.post('/auth/login', loginUser);
// router.get('/auth/user/profile', getUserProfile);
router.get('/auth/verify-email', verifyEmail);

router.post('/:apiKey/auth/register', registerUser);
router.post('/:apiKey/auth/login', loginUser);
router.get('/:apiKey/user/profile', getUserProfile);

module.exports = router;