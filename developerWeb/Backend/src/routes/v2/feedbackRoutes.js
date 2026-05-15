const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { submitFeedback } = require('../../controllers/v2/feedbackController');
const pool = require('../../config/db');

// Increase JSON body size limit for this router to accommodate base64 file attachments
// (max 3 files × 10 MB × ~1.37 base64 overhead ≈ 42 MB)
router.post('/feedback', express.json({ limit: '45mb' }), authenticateToken, submitFeedback);

// Helper: list developer's apps (for feedback form selector)
router.get('/feedback/apps', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM dev_apps WHERE developer_id = $1 ORDER BY name ASC',
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

