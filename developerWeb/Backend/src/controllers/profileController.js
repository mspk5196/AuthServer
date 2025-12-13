const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { passwordEncryptAES } = require('../utils/decryptAES');
const { sendMail } = require('../utils/mailer');
const { buildEmailUpdateVerificationEmail, buildPasswordChangedEmail } = require('../templates/emailTemplates');
require('dotenv').config();

/**
 * Get developer profile
 */
const getProfile = async (req, res) => {
  try {
    const developerId = req.user.userId;

    const result = await pool.query(
      `SELECT id, name, username, email, email_verified, is_active, created_at, updated_at 
       FROM developers 
       WHERE id = $1`,
      [developerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { developer: result.rows[0] }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Update developer profile
 */
const updateProfile = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const developerId = req.user.userId;
    const { name, username, email } = req.body;
    const updateIp = req.ip || req.connection.remoteAddress;

    if (!name && !username && !email) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name, username, or email) is required'
      });
    }

    await client.query('BEGIN');

    // Get current profile details
    const currentProfile = await client.query(
      'SELECT id, name, username, email, email_verified FROM developers WHERE id = $1',
      [developerId]
    );

    if (currentProfile.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }

    const oldDetails = currentProfile.rows[0];
    const emailChanged = email && email !== oldDetails.email;

    // Check if new username is already taken
    if (username && username !== oldDetails.username) {
      const usernameCheck = await client.query(
        'SELECT id FROM developers WHERE username = $1 AND id != $2',
        [username, developerId]
      );

      if (usernameCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Check if new email is already taken
    if (emailChanged) {
      const emailCheck = await client.query(
        'SELECT id FROM developers WHERE email = $1 AND id != $2',
        [email, developerId]
      );

      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (username) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (emailChanged) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
      updates.push(`email_verified = false`); // Require re-verification for new email
    }

    updates.push(`updated_at = NOW()`);
    values.push(developerId);

    const updateQuery = `UPDATE developers SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, username, email, email_verified`;
    const updateResult = await client.query(updateQuery, values);

    const newDetails = updateResult.rows[0];

    // Record profile edit in history
    await client.query(
      `INSERT INTO dev_profile_edit_history ( dev_id, old_details, new_details, update_ip, updated_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [developerId, JSON.stringify(oldDetails), JSON.stringify(newDetails), updateIp]
    );

    await client.query('COMMIT');

    // If email changed, send verification email
    if (emailChanged) {
      try {
        const verifyToken = jwt.sign(
          { id: developerId, email: email, type: 'email_update' },
          process.env.VERIFY_EMAIL_SECRET,
          { expiresIn: '5m' }
        );

        // Store verification token
        await pool.query(
          `INSERT INTO dev_email_verifications ( dev_id, token, expires_at, used, created_at, verify_type)
           VALUES ($1, $2, NOW() + INTERVAL '5 minutes', false, NOW(), 'profile_update')`,
          [developerId, verifyToken]
        );

        const verifyLink = `${process.env.BACKEND_URL}/api/developer/verify-email-update?token=${verifyToken}`;

        await sendMail({
          to: email,
          subject: 'Verify Your New Email Address',
          html: buildEmailUpdateVerificationEmail({ name: name || oldDetails.name, verifyLink }),
        });

      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail the update, just log the error
      }
    }

    res.status(200).json({
      success: true,
      message: emailChanged 
        ? 'Profile updated successfully. Please check your new email for verification link.'
        : 'Profile updated successfully',
      data: { developer: newDetails }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Verify email update
 */
const verifyEmailUpdate = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send('<h2>Invalid verification link</h2>');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.VERIFY_EMAIL_SECRET);

    await client.query('BEGIN');

    // Check if token exists and is not used
    const tokenCheck = await client.query(
      `SELECT id, dev_id, used, expires_at 
       FROM dev_email_verifications 
       WHERE token = $1 AND verify_type = 'profile_update'`,
      [token]
    );

    if (tokenCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).send('<h2>Invalid or expired verification link</h2>');
    }

    const verification = tokenCheck.rows[0];

    if (verification.used) {
      await client.query('ROLLBACK');
      return res.status(400).send('<h2>This verification link has already been used</h2>');
    }

    if (new Date() > new Date(verification.expires_at)) {
      await client.query('ROLLBACK');
      return res.status(400).send('<h2>Verification link has expired</h2>');
    }

    // Mark email as verified
    await client.query(
      'UPDATE developers SET email_verified = true, updated_at = NOW() WHERE id = $1',
      [decoded.id]
    );

    // Mark token as used
    await client.query(
      'UPDATE dev_email_verifications SET used = true, updated_at = NOW() WHERE id = $1',
      [verification.id]
    );

    await client.query('COMMIT');

    res.send(`
      <h2>Email Verified Successfully!</h2>
      <p>Your new email address has been verified. You can now close this window.</p>
      <script>setTimeout(() => window.close(), 3000);</script>
    `);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verify email update error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).send('<h2>Verification link has expired</h2>');
    }
    
    res.status(500).send('<h2>Email verification failed</h2>');
  } finally {
    client.release();
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const developerId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    await client.query('BEGIN');

    // Get current password hash and developer details
    const developerResult = await client.query(
      'SELECT id, name, email, password_hash FROM developers WHERE id = $1',
      [developerId]
    );

    if (developerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }

    const developer = developerResult.rows[0];

    // Verify current password
    const encryptedCurrentPassword = passwordEncryptAES(currentPassword);
    const isValidPassword = await bcrypt.compare(encryptedCurrentPassword, developer.password_hash);

    if (!isValidPassword) {
      await client.query('ROLLBACK');
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const encryptedNewPassword = passwordEncryptAES(newPassword);
    const newPasswordHash = await bcrypt.hash(encryptedNewPassword, 12);

    // Update password
    await client.query(
      'UPDATE developers SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, developerId]
    );

    // Record password change in history
    await client.query(
      `INSERT INTO dev_password_change_history (change_type, old_hash, changed_at)
       VALUES ('Request', $1, NOW())`,
      [developer.password_hash]
    );

    // Invalidate all refresh tokens for security
    await client.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [developerId]
    );

    await client.query('COMMIT');

    // Send password change notification email
    try {
      await sendMail({
        to: developer.email,
        subject: 'Password Changed - Auth Platform',
        html: buildPasswordChangedEmail({ name: developer.name, changedAt: new Date().toLocaleString() }),
      });

      console.log('Password change notification sent to:', developer.email);
    } catch (emailError) {
      console.error('Failed to send password change notification:', emailError);
      // Don't fail the password change, just log the error
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again with your new password.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getProfile,
  updateProfile,
  verifyEmailUpdate,
  changePassword
};
