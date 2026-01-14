const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');


// Settings endpoints (all require authentication)
router.get('/settings/plan', authenticateToken, settingsController.getPlanInfo);
router.get('/settings/account', authenticateToken, settingsController.getAccountInfo);
router.get('/settings/usage', authenticateToken, settingsController.getUsageStats);

module.exports = router;