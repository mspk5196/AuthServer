const express = require('express');
const router = express.Router();
const {
  verifyAppCredentials,
  registerUser,
  loginUser,
  verifyEmail,
  getUserProfile
} = require('../controllers/publicApiController');

router.get('/auth/verify-email', verifyEmail);

// All routes require API key and secret
router.use(verifyAppCredentials);


router.post('/:apiKey/auth/register', registerUser);
router.post('/:apiKey/auth/login', loginUser);
// router.get('/:apiKey/user/profile', getUserProfile);
router.get('/:apiKey/user/profile', getUserProfile);

module.exports = router;