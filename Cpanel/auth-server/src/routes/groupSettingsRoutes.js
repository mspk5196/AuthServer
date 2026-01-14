const express = require('express');
const router = express.Router();
const { authenticateDeveloper } = require('../middleware/auth');
const {
  getGroupSettings,
  updateGroupSettings,
  getGroupUsersWithStatus,
  blockUserFromGroup,
  unblockUserFromGroup,
  bulkBlockUsers,
  bulkUnblockUsers,
  addUserToGroup,
  getBulkOperations
} = require('../controllers/groupSettingsController');

// All routes require developer authentication
router.use(authenticateDeveloper);

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

module.exports = router;
