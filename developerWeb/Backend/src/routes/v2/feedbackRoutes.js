const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const {
  submitFeedback,
  listDeveloperFeedbacks,
  getFeedbackThread,
  developerReplyFeedback,
  downloadFeedbackAttachment,
  downloadMessageAttachment
} = require('../../controllers/v2/feedbackController');
const pool = require('../../config/db');

// Submit feedback (increased body limit for file attachments)
router.post('/feedback', express.json({ limit: '45mb' }), authenticateToken, submitFeedback);

// Developer tickets list & thread routes
router.get('/feedback/list', authenticateToken, listDeveloperFeedbacks);
router.get('/feedback/:id/thread', authenticateToken, getFeedbackThread);
router.post('/feedback/:id/reply', express.json({ limit: '45mb' }), authenticateToken, developerReplyFeedback);
router.get('/feedback/:id/attachment/:idx?', authenticateToken, downloadFeedbackAttachment);
router.get('/feedback/message/:messageId/attachment', authenticateToken, downloadMessageAttachment);

// Helper: list developer's apps (for feedback form selector)
router.get('/feedback/apps', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, app_name AS name FROM dev_apps WHERE developer_id = $1 ORDER BY app_name ASC',
      [req.user.userId]
    );
    res.json({ success: true, data: { apps: result.rows } });
  } catch (err) {
    console.error('feedback/apps error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch apps' });
  }
});

// Helper: list developer's groups (for feedback form selector)
router.get('/feedback/groups', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM app_groups WHERE developer_id = $1 ORDER BY name ASC',
      [req.user.userId]
    );
    res.json({ success: true, data: { groups: result.rows } });
  } catch (err) {
    console.error('feedback/groups error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch groups' });
  }
});

module.exports = router;
