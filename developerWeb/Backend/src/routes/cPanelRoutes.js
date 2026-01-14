const express = require('express');
const router = express.Router();
const { createCpanelTicket, redeemCpanelTicket } = require('../controllers/otCpanel');
const { authenticateToken } = require('../middleware/auth');

// Mounted at /api/developer in app.js, so do not prefix with /developer here
router.post('/cpanel-ticket', authenticateToken, createCpanelTicket);
router.post('/redeem-cpanel-ticket', redeemCpanelTicket); // protect further via API key/allow-list if needed

module.exports = router;