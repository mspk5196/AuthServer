const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ssoController = require('../controllers/ssoController');


// SSO: consume one-time ticket issued by main auth server
router.post('/sso', ssoController.consumeTicket);

// Authenticated route to get current developer info from cpanel token
router.get('/me', authenticateToken, ssoController.me);

module.exports = router;