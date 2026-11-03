const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { passwordEncryptAES, passwordDecryptAES } = require('../utils/decryptAES');
const { verifyTOTP, verifyBackupCode } = require('../utils/totp');
const { sendMail } = require('../utils/mailer');
const { buildEmailUpdateVerificationEmail, buildPasswordChangedEmail } = require('../templates/emailTemplates');
require('dotenv').config();

/**
 * Get developer profile
 */
const getProfile = async (req, res) => {
  try {
    const developerId = req.user?.userId || req.user?.developerId || req.user?.id || req.user?.user_id;

    const result = await pool.query(
      `SELECT id, name, username, email, email_verified, mfa_enabled, is_active, created_at, updated_at 
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
    const developerId = req.user?.userId || req.user?.developerId || req.user?.id || req.user?.user_id;
    const { name, username, email, mfa_code, mfaCode, code } = req.body;
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
      'SELECT id, name, username, email, email_verified, mfa_enabled FROM developers WHERE id = $1',
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

    // Check if new email is already taken & enforce 2FA verification
    if (emailChanged) {
      // 1. Verify 2FA if developer has MFA enabled
      let mfaSettings = null;
      try {
        const mfaRes = await client.query(
          'SELECT mfa_enabled, secret_encrypted, backup_codes FROM dev_mfa_settings WHERE developer_id = $1',
          [developerId]
        );
        mfaSettings = mfaRes.rows[0];
      } catch (mfaQueryErr) {
        // Table might not exist yet if migration pending
      }

      const isMfaActive = oldDetails.mfa_enabled || mfaSettings?.mfa_enabled;
      if (isMfaActive) {
        const providedCode = (mfa_code || mfaCode || code || '').trim();
        if (!providedCode) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            mfa_required: true,
            message: 'Two-factor authentication code is required to change your email address.'
          });
        }

        let isCodeValid = false;
        let updatedBackupCodes = null;

        // Try TOTP
        if (mfaSettings?.secret_encrypted) {
          try {
            const secretBase32 = passwordDecryptAES(mfaSettings.secret_encrypted);
            isCodeValid = verifyTOTP(secretBase32, providedCode);
          } catch (decryptErr) {
            console.error('Failed to decrypt MFA secret for email change:', decryptErr);
          }
        }

        // Try single-use recovery backup codes
        if (!isCodeValid && mfaSettings?.backup_codes) {
          const backupResult = await verifyBackupCode(providedCode, mfaSettings.backup_codes);
          if (backupResult.valid) {
            isCodeValid = true;
            updatedBackupCodes = backupResult.updatedCodes;
          }
        }

        if (!isCodeValid) {
          await client.query('ROLLBACK');
          return res.status(401).json({
            success: false,
            message: 'Invalid two-factor authentication code. Please check your authenticator app.'
          });
        }

        // If backup recovery code was used, save consumed status
        if (updatedBackupCodes) {
          await client.query(
            'UPDATE dev_mfa_settings SET backup_codes = $1, updated_at = NOW() WHERE developer_id = $2',
            [JSON.stringify(updatedBackupCodes), developerId]
          );
        }
      }

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

    const updateQuery = `UPDATE developers SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, username, email, email_verified, mfa_enabled`;
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

        // Also notify old email about the change for security
        if (oldDetails.email) {
          try {
            await sendMail({
              to: oldDetails.email,
              subject: 'Security Alert: Your Developer Account Email Was Changed',
              html: `
                <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <h2 style="color: #0f172a; margin-top: 0;">Security Alert: Email Address Changed</h2>
                  <p>Hello ${oldDetails.name || 'Developer'},</p>
                  <p>The primary email address associated with your MSPK Auth Server developer account has been updated to:</p>
                  <p style="font-weight: bold; background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-family: monospace; border: 1px solid #cbd5e1;">${email}</p>
                  <p>A verification link was dispatched to the new email address.</p>
                  <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 13px;">
                      <strong>Didn't make this change?</strong> Your account may be compromised. Please contact support immediately at <a href="mailto:${process.env.SUPPORT_EMAIL || 'authservices.mspk@mspkapps.in'}" style="color: #4f46e5; text-decoration: underline;">${process.env.SUPPORT_EMAIL || 'authservices.mspk@mspkapps.in'}</a>.
                    </p>
                  </div>
                  <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">This is an automated security alert from MSPK Developer Portal.</p>
                </div>
              `
            });
          } catch (oldMailErr) {
            console.error('Failed to send security alert to old email:', oldMailErr);
          }
        }

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


module.exports = {
  getProfile,
  updateProfile,
  verifyEmailUpdate,
};
