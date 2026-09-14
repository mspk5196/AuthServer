const pool = require('../../config/db');
const { sendMail } = require('../../utils/mailer');
const { buildFeedbackAckEmail } = require('../../templates/emailTemplates');

// Per-file size limit: 10 MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// Max files per submission
const MAX_FILES = 3;

/**
 * Ensure dev_feedback_messages table exists in authserver_db
 */
const ensureMessagesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dev_feedback_messages (
        id SERIAL PRIMARY KEY,
        feedback_id UUID NOT NULL REFERENCES dev_feedback(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL,
        sender_id VARCHAR(255),
        sender_name VARCHAR(255),
        sender_email VARCHAR(255),
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        email_ref_id VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn('[feedbackController] ensureMessagesTable notice:', err.message);
  }
};

/**
 * POST /feedback
 * Developer submits feedback or issue
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

    await ensureMessagesTable();

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

    const feedbackId = insertRes.rows[0].id;

    // ── 1. Ack email to Developer via Email Service / Mailer ──────────────────
    try {
      await sendMail({
        to: developer.email,
        subject: `${type === 'issue' ? 'Issue' : 'Feedback'} Received [Ticket #${feedbackId}] - Auth Platform`,
        html: buildFeedbackAckEmail({ name: developer.name, type, title }),
        smtpProfileName: 'support',
        metadata: { feedbackId, developerId, event: 'developer_ack' }
      });
    } catch (emailErr) {
      console.error('Failed to send feedback ack email:', emailErr);
    }

    // ── 2. Admin Alert Email to Auth Server Support ──────────────────────────
    try {
      const supportEmail = process.env.PRODUCT_SUPPORT_EMAIL || 'support.authserver@mspkapps.in';
      const adminAlertSubject = `[New Developer ${type === 'issue' ? 'Issue' : 'Feedback'} #${feedbackId}] ${title || 'Submission'}`;
      const adminAlertHtml = `
        <div style="font-family: sans-serif; max-width: 600px; color: #1e293b;">
          <h2 style="color: #6366f1;">New Developer Submission (#${feedbackId})</h2>
          <p><strong>Developer:</strong> ${developer.name} (${developer.email})</p>
          <p><strong>Type:</strong> ${type.toUpperCase()}</p>
          <p><strong>Title:</strong> ${title || 'None'}</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 14px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${description.trim()}</p>
          </div>
        </div>
      `;

      await sendMail({
        to: supportEmail,
        subject: adminAlertSubject,
        html: adminAlertHtml,
        smtpProfileName: 'support',
        metadata: { feedbackId, developerId, event: 'admin_feedback_alert' }
      });
    } catch (adminMailErr) {
      console.warn('Failed to send admin feedback alert email:', adminMailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Your submission was received. Thank you!',
      data: { id: feedbackId },
    });
  } catch (error) {
    console.error('submitFeedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback', error: error.message });
  }
};

/**
 * GET /feedback/list
 * Developer lists their submitted feedbacks & tickets
 */
const listDeveloperFeedbacks = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const result = await pool.query(
      `SELECT df.*, 
              (SELECT COUNT(*) FROM dev_feedback_messages dfm WHERE dfm.feedback_id = df.id) AS reply_count
       FROM dev_feedback df
       WHERE df.developer_id = $1
       ORDER BY df.created_at DESC`,
      [developerId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('listDeveloperFeedbacks error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch feedbacks' });
  }
};

/**
 * GET /feedback/:id/thread
 * Developer fetches single feedback + conversation messages
 */
const getFeedbackThread = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { id } = req.params;

    const fbRes = await pool.query(
      `SELECT * FROM dev_feedback WHERE id = $1 AND developer_id = $2`,
      [id, developerId]
    );

    if (fbRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    await ensureMessagesTable();

    const msgRes = await pool.query(
      `SELECT * FROM dev_feedback_messages WHERE feedback_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        feedback: fbRes.rows[0],
        messages: msgRes.rows
      }
    });
  } catch (err) {
    console.error('getFeedbackThread error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch thread' });
  }
};

/**
 * POST /feedback/:id/reply
 * Developer replies to an ongoing feedback thread (supports file attachments)
 */
const developerReplyFeedback = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { id } = req.params;
    const { message, files = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const fbRes = await pool.query(
      `SELECT df.*, d.name, d.email FROM dev_feedback df 
       JOIN developers d ON d.id = df.developer_id 
       WHERE df.id = $1 AND df.developer_id = $2`,
      [id, developerId]
    );

    if (fbRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    const feedback = fbRes.rows[0];

    // Process attachments if any
    const sanitisedFiles = [];
    if (Array.isArray(files)) {
      for (const f of files) {
        if (f && f.name && f.data) {
          const estimatedBytes = Math.ceil((f.data.length * 3) / 4);
          sanitisedFiles.push({
            name: f.name,
            mimeType: f.mimeType || 'application/octet-stream',
            size: estimatedBytes,
            data: f.data,
          });
        }
      }
    }

    await ensureMessagesTable();

    // Insert message
    const msgInsert = await pool.query(
      `INSERT INTO dev_feedback_messages (feedback_id, sender_type, sender_id, sender_name, sender_email, message, attachments)
       VALUES ($1, 'DEVELOPER', $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, String(developerId), feedback.name, feedback.email, message.trim(), JSON.stringify(sanitisedFiles)]
    );

    // Notify Support
    try {
      const supportEmail = process.env.PRODUCT_SUPPORT_EMAIL || 'support.authserver@mspkapps.in';
      await sendMail({
        to: supportEmail,
        subject: `Re: [Ticket #${id}] Developer Reply from ${feedback.name}`,
        html: `
          <div style="font-family: sans-serif; color: #1e293b;">
            <p><strong>Developer ${feedback.name} (${feedback.email}) replied to Ticket #${id}:</strong></p>
            <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 12px; margin: 12px 0;">
              <p style="white-space: pre-wrap; margin: 0;">${message.trim()}</p>
            </div>
            ${sanitisedFiles.length > 0 ? `<p style="font-size: 13px; color: #6366f1;">📎 Attached: <strong>${sanitisedFiles[0].name}</strong></p>` : ''}
          </div>
        `,
        smtpProfileName: 'support',
        parentRefId: feedback.ref_id,
        threadId: feedback.thread_id,
        metadata: { feedbackId: id, developerId }
      });
    } catch (notifyErr) {
      console.warn('Failed to notify support of dev reply:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Reply submitted',
      data: msgInsert.rows[0]
    });
  } catch (err) {
    console.error('developerReplyFeedback error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit reply' });
  }
};

/**
 * GET /feedback/:id/attachment/:idx
 * Download attachment from initial developer feedback
 */
const downloadFeedbackAttachment = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { id, idx = 0 } = req.params;

    const fbRes = await pool.query(
      `SELECT attachments FROM dev_feedback WHERE id = $1 AND developer_id = $2`,
      [id, developerId]
    );

    if (fbRes.rows.length === 0 || !fbRes.rows[0].attachments) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const attachments = typeof fbRes.rows[0].attachments === 'string'
      ? JSON.parse(fbRes.rows[0].attachments)
      : (fbRes.rows[0].attachments || []);

    const attIndex = parseInt(idx, 10) || 0;
    const att = attachments[attIndex];

    if (!att) {
      return res.status(404).json({ success: false, message: 'Attachment file not found' });
    }

    if (att.data) {
      const buffer = Buffer.from(att.data, 'base64');
      res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.name || 'attachment')}"`);
      return res.send(buffer);
    }

    if (att.path) {
      const fs = require('fs');
      if (fs.existsSync(att.path)) {
        res.setHeader('Content-Type', att.mime || att.mimeType || 'application/octet-stream');
        return res.download(att.path, att.name || 'attachment');
      }
    }

    return res.status(404).json({ success: false, message: 'Attachment content unavailable' });
  } catch (err) {
    console.error('downloadFeedbackAttachment error:', err);
    res.status(500).json({ success: false, message: 'Failed to download attachment' });
  }
};

/**
 * GET /feedback/message/:messageId/attachment
 * Download attachment from a specific message in feedback thread
 */
const downloadMessageAttachment = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { messageId } = req.params;

    const msgRes = await pool.query(
      `SELECT m.*, df.developer_id 
       FROM dev_feedback_messages m
       JOIN dev_feedback df ON df.id = m.feedback_id
       WHERE m.id = $1 AND df.developer_id = $2`,
      [messageId, developerId]
    );

    if (msgRes.rows.length === 0 || !msgRes.rows[0].attachments) {
      return res.status(404).json({ success: false, message: 'Message attachment not found' });
    }

    const attachments = typeof msgRes.rows[0].attachments === 'string'
      ? JSON.parse(msgRes.rows[0].attachments)
      : (msgRes.rows[0].attachments || []);

    if (!attachments || attachments.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found in message' });
    }

    const att = attachments[0];

    if (att.data) {
      const buffer = Buffer.from(att.data, 'base64');
      res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.name || 'attachment')}"`);
      return res.send(buffer);
    }

    if (att.path) {
      const fs = require('fs');
      const path = require('path');
      const possiblePaths = [
        att.path,
        path.resolve('uploads/support_attachments', path.basename(att.path)),
        path.resolve('G:/WEBSITE/AdminMspkApps/Backend', att.path),
        path.resolve('G:/WEBSITE/AdminMspkApps/Backend/uploads/support_attachments', path.basename(att.path))
      ];
      const foundPath = possiblePaths.find(p => p && fs.existsSync(p));
      if (foundPath) {
        res.setHeader('Content-Type', att.mime || att.mimeType || 'application/octet-stream');
        return res.download(foundPath, att.name || 'attachment');
      }
    }

    return res.status(404).json({ success: false, message: 'Attachment file not found' });
  } catch (err) {
    console.error('downloadMessageAttachment error:', err);
    res.status(500).json({ success: false, message: 'Failed to download message attachment' });
  }
};

module.exports = {
  submitFeedback,
  listDeveloperFeedbacks,
  getFeedbackThread,
  developerReplyFeedback,
  downloadFeedbackAttachment,
  downloadMessageAttachment
};
