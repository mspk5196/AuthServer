const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ssoController = require('../controllers/ssoController');
const settingsController = require('../controllers/settingsController');


// SSO: consume one-time ticket issued by main auth server (support both /sso and /sso/consume)
router.post('/sso', ssoController.consumeTicket);
router.post('/sso/consume', ssoController.consumeTicket);

// Browser redirect fallback if a browser directly hits backend /sso/:ticket
router.get('/sso/:ticket', (req, res) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:4002';
  return res.redirect(`${frontend.replace(/\/$/, '')}/sso/${req.params.ticket}`);
});
router.get('/sso', (req, res) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:4002';
  const ticket = req.query.ticket;
  return res.redirect(ticket ? `${frontend.replace(/\/$/, '')}/sso/${ticket}` : frontend);
});

// Authenticated route to get current developer info from cpanel token
router.get('/me', authenticateToken, ssoController.me);


module.exports = router;