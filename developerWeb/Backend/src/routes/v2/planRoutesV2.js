const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { getPlans, getDeveloperPlan } = require('../../controllers/v2/planControllerV2');

// Public route — no auth required
router.get('/plans', getPlans);

// Protected routes
router.get('/my-plan', authenticateToken, getDeveloperPlan);

module.exports = router;
