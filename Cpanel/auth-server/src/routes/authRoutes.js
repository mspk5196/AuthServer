const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ssoController = require('../controllers/ssoController');
const settingsController = require('../controllers/settingsController');


// SSO: consume one-time ticket issued by main auth server (support both /sso and /sso/consume)
router.post('/sso', ssoController.consumeTicket);
router.post('/sso/consume', ssoController.consumeTicket);

// Authenticated route to get current developer info from cpanel token
router.get('/me', authenticateToken, ssoController.me);


module.exports = router;