const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { getUsageHistory, getDeveloperApps, getDeveloperGroups } = require('../../controllers/v2/usageController');

router.get('/usage/history', authenticateToken, getUsageHistory);
router.get('/usage/apps', authenticateToken, getDeveloperApps);
router.get('/usage/groups', authenticateToken, getDeveloperGroups);

module.exports = router;
