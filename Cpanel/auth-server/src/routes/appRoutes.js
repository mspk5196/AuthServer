const express = require('express');
const router = express.Router();
const { 
  createApp, 
  getMyApps, 
  getAppDetails, 
  updateApp, 
  deleteApp, 
  regenerateApiKey,
  getAppSummary,
  listAppUsers,
  getUserLoginHistory,
  createAppUser,
  setUserBlocked,
  getAppUsage
} = require('../controllers/appsController'); // Fixed: was appController
const { authenticateToken } = require('../middleware/auth');

// App management routes
router.post('/createApp', authenticateToken, createApp);
router.get('/getApps', authenticateToken, getMyApps);
router.get('/appDetails/:appId', authenticateToken, getAppDetails);
router.put('/updateApp/:appId', authenticateToken, updateApp);
router.delete('/deleteApp/:appId', authenticateToken, deleteApp);
router.post('/regenerateApiKey/:appId', authenticateToken, regenerateApiKey);

// New routes for app details, users and usage
router.get('/summary/:appId', authenticateToken, getAppSummary);
router.get('/users/:appId', authenticateToken, listAppUsers);
router.get('/users/:appId/:userId/logins', authenticateToken, getUserLoginHistory);
router.post('/users/:appId', authenticateToken, createAppUser);
router.put('/users/:appId/:userId/block', authenticateToken, setUserBlocked);
router.get('/usage/:appId', authenticateToken, getAppUsage);

module.exports = router;