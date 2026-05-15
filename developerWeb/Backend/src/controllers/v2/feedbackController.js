const pool = require('../../config/db');
const { sendMail } = require('../../utils/mailer');
const { buildFeedbackAckEmail } = require('../../templates/emailTemplates');

// Per-file size limit: 10 MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// Max files per submission
const MAX_FILES = 3;

/**
 * POST /feedback
 * Body (JSON):
 * {
 *   type:        'feedback' | 'issue',
 *   title:       string (optional),
 *   description: string,
 *   app_id:      uuid | null,
 *   group_id:    uuid | null,
 *   files: [                         // max 3
 *     { name: string, mimeType: string, size: number, data: '<base64>' }
 *   ]
 * }
 */
const submitFeedback = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { type, title, description, app_id, group_id, files = [] } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!type || !['feedback', 'issue'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be "feedback" or "issue"' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'description is required' });
    }
    if (!Array.isArray(files)) {
      return res.status(400).json({ success: false, message: 'files must be an array' });
    }
    if (files.length > MAX_FILES) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_FILES} files allowed` });
    }

    // Validate each file
    const sanitisedFiles = [];
    for (const f of files) {
      if (!f.name || !f.data) {
        return res.status(400).json({ success: false, message: 'Each file must have name and data (base64)' });
      }
      // Estimate decoded size: base64 chars * 0.75
      const estimatedBytes = Math.ceil((f.data.length * 3) / 4);
      if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: `File "${f.name}" exceeds the 10 MB limit`,
        });
      }
      sanitisedFiles.push({
        name: f.name,
        mimeType: f.mimeType || 'application/octet-stream',
        size: estimatedBytes,
        data: f.data,
      });
    }

    // ── Developer info ───────────────────────────────────────────────────────
    const devRes = await pool.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [developerId]
    );

    if (devRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }

    const developer = devRes.rows[0];

    // ── Validate app_id ownership (if provided) ──────────────────────────────
    if (app_id) {
      const appRes = await pool.query(
        'SELECT id FROM dev_apps WHERE id = $1 AND developer_id = $2',
        [app_id, developerId]
      );
      if (appRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid app_id' });
      }
    }

    // ── Validate group_id ownership (if provided) ────────────────────────────
    if (group_id) {
      const grpRes = await pool.query(
        'SELECT id FROM app_groups WHERE id = $1 AND developer_id = $2',
        [group_id, developerId]
      );
      if (grpRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid group_id' });
      }
    }

    // ── Insert ───────────────────────────────────────────────────────────────
    const insertRes = await pool.query(
      `INSERT INTO dev_feedback
        (developer_id, type, title, description, app_id, group_id, name, email, attachments, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', NOW())
       RETURNING id`,
      [
        developerId,
        type,
        title || null,
        description.trim(),
        app_id || null,
        group_id || null,
        developer.name,
        developer.email,
        JSON.stringify(sanitisedFiles),
      ]
    );

    // ── Ack email ────────────────────────────────────────────────────────────
    try {
      await sendMail({
        to: developer.email,
        subject: `${type === 'issue' ? 'Issue' : 'Feedback'} Received - Auth Platform`,
        html: buildFeedbackAckEmail({ name: developer.name, type, title }),
      });
    } catch (emailErr) {
      console.error('Failed to send feedback ack email:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Your submission was received. Thank you!',
      data: { id: insertRes.rows[0].id },
    });
  } catch (error) {
    console.error('submitFeedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback', error: error.message });
  }
};

module.exports = { submitFeedback };
