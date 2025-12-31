const express = require('express');
const router = express.Router();
const { 
  createApp, 
  getMyApps, 
  getAppDetails, 
  updateApp, 
  regenerateApiKey,
  getAppSummary,
  listAppUsers,
  getUserLoginHistory,
  createAppUser,
  setUserBlocked,
  getAppUsage,
  getDashboard,
  verifyAppEmail,
  updateAppSupportEmail,
  exportUsersCSV,
  requestAppDeletion,
  confirmAppDeletion,
  listAllUsersAcrossApps,
  mergeUsersAcrossApps,
  setCombineUsersFlag,
} = require('../controllers/appsController'); // Fixed: was appController
const { authenticateToken } = require('../middleware/auth');

// Dashboard route
router.get('/dashboard', authenticateToken, getDashboard);

// App management routes
router.post('/createApp', authenticateToken, createApp);
router.get('/getApps', authenticateToken, getMyApps);
router.get('/appDetails/:appId', authenticateToken, getAppDetails);
router.put('/updateApp/:appId', authenticateToken, updateApp);
// App deletion now uses an email confirmation flow
router.post('/deleteApp/:appId/request', authenticateToken, requestAppDeletion);
router.post('/regenerateApiKey/:appId', authenticateToken, regenerateApiKey);

// New routes for app details, users and usage
router.get('/summary/:appId', authenticateToken, getAppSummary);
router.get('/users/:appId/export-csv', authenticateToken, exportUsersCSV);
router.get('/users/:appId', authenticateToken, listAppUsers);
router.get('/users/:appId/:userId/logins', authenticateToken, getUserLoginHistory);
router.post('/users/:appId', authenticateToken, createAppUser);
router.put('/users/:appId/:userId/block', authenticateToken, setUserBlocked);
router.get('/usage/:appId', authenticateToken, getAppUsage);

// Developer-level: list all users across developer's apps
router.get('/all-users', authenticateToken, listAllUsersAcrossApps);
// Toggle combine-users flag for developer
router.put('/combine-users', authenticateToken, setCombineUsersFlag);
// Apply merge decisions
router.post('/all-users/merge', authenticateToken, mergeUsersAcrossApps);

// Email verification and support email routes
router.get('/verify-app-email/:token', verifyAppEmail);
router.put('/support-email/:appId', authenticateToken, updateAppSupportEmail);

// Public confirmation endpoint for app deletion (from email link)
router.get('/confirm-delete/:token', confirmAppDeletion);

module.exports = router;