const express = require('express');
const router = express.Router();
const { 
  createApp, 
  getMyApps, 
  getAppDetails, 
  updateApp, 
  deleteApp, 
  regenerateApiKey 
} = require('../controllers/appsController'); // Fixed: was appController
const { authenticateToken } = require('../middleware/auth');

// App management routes
router.post('/createApp', authenticateToken, createApp);
router.get('/getApps', authenticateToken, getMyApps);
router.get('/appDetails/:appId', authenticateToken, getAppDetails);
router.put('/updateApp/:appId', authenticateToken, updateApp);
router.delete('/deleteApp/:appId', authenticateToken, deleteApp);
router.post('/regenerateApiKey/:appId', authenticateToken, regenerateApiKey);

module.exports = router;