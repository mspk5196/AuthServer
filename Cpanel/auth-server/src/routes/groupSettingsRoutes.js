const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getGroupSettings,
  updateGroupSettings,
  getGroupUsersWithStatus,
  blockUserFromGroup,
  unblockUserFromGroup,
  bulkBlockUsers,
  bulkUnblockUsers,
  addUserToGroup,
  getBulkOperations,
  deleteExtraFieldData,
  detectCommonModeConflicts,
  enableCommonMode,
  disableCommonMode
} = require('../controllers/groupSettingsController');

// All routes require developer authentication
router.use(authenticateToken);

// Group settings management
router.get('/:groupId', getGroupSettings);
router.put('/:groupId', updateGroupSettings);

// User management in group
router.get('/:groupId/users', getGroupUsersWithStatus);
router.post('/:groupId/users', addUserToGroup);

// User blocking/unblocking
router.post('/:groupId/users/:userId/block', blockUserFromGroup);
router.post('/:groupId/users/:userId/unblock', unblockUserFromGroup);

// Bulk operations
router.post('/:groupId/users/bulk-block', bulkBlockUsers);
router.post('/:groupId/users/bulk-unblock', bulkUnblockUsers);
router.get('/:groupId/bulk-operations', getBulkOperations);

// Extra field data management
router.delete('/:groupId/extra-field-data', deleteExtraFieldData);

// Flexible data management (common vs per-app)
router.get('/:groupId/common-mode-conflicts', detectCommonModeConflicts);
router.post('/:groupId/enable-common-mode', enableCommonMode);
router.post('/:groupId/disable-common-mode', disableCommonMode);

module.exports = router;
