const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const pool = require('../config/db');
const { generateTokens } = require('../middleware/auth');
const { passwordEncryptAES, passwordDecryptAES } = require('../utils/decryptAES');
const {
  generateSecret,
  verifyTOTP,
  generateOtpAuthUri,
  generateBackupCodes,
  verifyBackupCode
} = require('../utils/totp');


const ensureMfaTable = async () => {
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      ALTER TABLE "public"."developers" ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT FALSE;
      CREATE TABLE IF NOT EXISTS "public"."dev_mfa_settings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "developer_id" UUID NOT NULL REFERENCES "public"."developers"("id") ON DELETE CASCADE,
        "mfa_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
        "secret_encrypted" TEXT,
        "backup_codes" JSONB DEFAULT '[]'::jsonb,
        "pending_secret" TEXT,
        "confirmed_at" TIMESTAMP(6),
        "created_at" TIMESTAMP(6) DEFAULT NOW(),
        "updated_at" TIMESTAMP(6) DEFAULT NOW(),
        CONSTRAINT "uq_dev_mfa_developer" UNIQUE ("developer_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_dev_mfa_developer_id" ON "public"."dev_mfa_settings"("developer_id");
    `);
  } catch (err) {
    console.error('ensureMfaTable check:', err.message);
  }
};
ensureMfaTable();

const parseExpiryToMs = (str) => {
  if (!str) return undefined;
  if (/^\d+$/.test(str)) return parseInt(str, 10) * 1000;
  const m = str.match(/^(\d+)([smhd])$/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return undefined;
  }
};

/**
 * 1. Setup MFA: Generate pending secret, QR code, and backup codes
 * Requires authenticated developer
 */
exports.setupMFA = async (req, res) => {
  try {
    const developerId = req.user?.userId || req.user?.developerId || req.user?.id || req.user?.user_id;
    if (!developerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const devRes = await pool.query('SELECT id, email, name FROM developers WHERE id = $1', [developerId]);
    if (devRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }
    const dev = devRes.rows[0];

    // Generate new TOTP base32 secret
    const secretBase32 = generateSecret();
    const encryptedSecret = passwordEncryptAES(secretBase32);

    // Generate 8 backup recovery codes
    const { plainCodes, hashedRecords } = await generateBackupCodes(8);

    // Store in dev_mfa_settings as pending_secret until confirmed
    await pool.query(
      `INSERT INTO dev_mfa_settings (developer_id, pending_secret, backup_codes, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (developer_id) DO UPDATE SET
         pending_secret = $2,
         backup_codes = $3,
         updated_at = NOW()`,
      [developerId, encryptedSecret, JSON.stringify(hashedRecords)]
    );

    // Generate otpauth URI and QR Code Data URL
    const issuer = 'MSPK Developer Portal';
    const otpAuthUri = generateOtpAuthUri(issuer, dev.email, secretBase32);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        secret: secretBase32,
        otpAuthUri,
        qrCodeUrl: qrCodeDataUrl,
        backupCodes: plainCodes
      }
    });
  } catch (error) {
    console.error('Setup MFA error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate MFA setup' });
  }
};

/**
 * 2. Confirm MFA: Verify first code and activate MFA
 * Requires authenticated developer
 */
exports.confirmMFA = async (req, res) => {
  try {
    const developerId = req.user?.userId || req.user?.developerId || req.user?.id || req.user?.user_id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const settingsRes = await pool.query(
      'SELECT pending_secret, backup_codes FROM dev_mfa_settings WHERE developer_id = $1',
      [developerId]
    );

    if (settingsRes.rows.length === 0 || !settingsRes.rows[0].pending_secret) {
      return res.status(400).json({
        success: false,
        message: 'No pending MFA setup found. Please initiate setup first.'
      });
    }

    const encryptedSecret = settingsRes.rows[0].pending_secret;
    const secretBase32 = passwordDecryptAES(encryptedSecret);

    const isValid = verifyTOTP(secretBase32, code);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your authenticator app.'
      });
    }

    // Activate MFA
    await pool.query(
      `UPDATE dev_mfa_settings SET
         mfa_enabled = true,
         secret_encrypted = pending_secret,
         pending_secret = NULL,
         confirmed_at = NOW(),
         updated_at = NOW()
       WHERE developer_id = $1`,
      [developerId]
    );

    await pool.query(
      'UPDATE developers SET mfa_enabled = true, updated_at = NOW() WHERE id = $1',
      [developerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Two-factor authentication successfully enabled.'
    });
  } catch (error) {
    console.error('Confirm MFA error:', error);
    return res.status(500).json({ success: false, message: 'Failed to confirm MFA setup' });
  }
};

/**
 * 3. Verify MFA Login: Verify MFA challenge token + code during login
 * Public endpoint (validates mfa_token)
 */
exports.verifyMFALogin = async (req, res) => {
  try {
    const { mfa_token, code, type } = req.body;

    if (!mfa_token || !code) {
      return res.status(400).json({
        success: false,
        message: 'MFA token and verification code are required'
      });
    }

    // Verify challenge token
    let payload;
    try {
      payload = jwt.verify(mfa_token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'MFA_TOKEN_EXPIRED',
        message: 'MFA session has expired. Please log in again.'
      });
    }

    if (payload.purpose !== 'dev_mfa_challenge' || !payload.developerId) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_MFA_TOKEN',
        message: 'Invalid MFA session token.'
      });
    }

    const developerId = payload.developerId;

    // Fetch developer & MFA settings
    const devRes = await pool.query(
      `SELECT d.id, d.email, d.name, d.username, d.email_verified, d.is_blocked,
              m.mfa_enabled, m.secret_encrypted, m.backup_codes
       FROM developers d
       JOIN dev_mfa_settings m ON d.id = m.developer_id
       WHERE d.id = $1`,
      [developerId]
    );

    if (devRes.rows.length === 0 || !devRes.rows[0].mfa_enabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled for this account.'
      });
    }

    const dev = devRes.rows[0];
    if (dev.is_blocked) {
      return res.status(403).json({
        success: false,
        message: 'This account has been blocked. Please contact support.'
      });
    }

    let isCodeValid = false;
    let updatedBackupCodes = null;

    if (type === 'backup_code') {
      const backupResult = await verifyBackupCode(code, dev.backup_codes);
      if (backupResult.valid) {
        isCodeValid = true;
        updatedBackupCodes = backupResult.updatedCodes;
      }
    } else {
      // Default TOTP
      const secretBase32 = passwordDecryptAES(dev.secret_encrypted);
      isCodeValid = verifyTOTP(secretBase32, code);
    }

    if (!isCodeValid) {
      return res.status(401).json({
        success: false,
        message: type === 'backup_code'
          ? 'Invalid or already used backup recovery code.'
          : 'Invalid authentication code. Please try again.'
      });
    }

    // If backup code used, persist used status
    if (updatedBackupCodes) {
      await pool.query(
        'UPDATE dev_mfa_settings SET backup_codes = $1, updated_at = NOW() WHERE developer_id = $2',
        [JSON.stringify(updatedBackupCodes), developerId]
      );
    }

    // Reset failed login attempts
    await pool.query(
      'UPDATE developers SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1',
      [developerId]
    );

    // Track login history
    await pool.query(
      'INSERT INTO dev_login_history (developer_id, login_at, login_ip) VALUES ($1, NOW(), $2)',
      [developerId, req.ip]
    );

    // Generate full access and refresh tokens
    const tokenPayload = {
      userId: dev.id,
      email: dev.email,
      name: dev.name,
      username: dev.username,
      role: 'developer',
      iat: Math.floor(Date.now() / 1000)
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // Store refresh token
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL '7 days', NOW())",
      [dev.id, refreshToken]
    );

    // Set httpOnly cookies
    const accessMaxAge = parseExpiryToMs(process.env.JWT_EXPIRE || '15m');
    const refreshMaxAge = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRE || '7d');

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    };

    if (accessMaxAge) cookieOpts.maxAge = accessMaxAge;
    res.cookie('access_token', accessToken, cookieOpts);

    const refreshOpts = { ...cookieOpts };
    if (refreshMaxAge) refreshOpts.maxAge = refreshMaxAge;
    res.cookie('refresh_token', refreshToken, refreshOpts);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: dev.id,
          email: dev.email,
          name: dev.name,
          username: dev.username,
          email_verified: dev.email_verified,
          role: 'developer'
        }
      }
    });
  } catch (error) {
    console.error('Verify MFA Login error:', error);
    return res.status(500).json({ success: false, message: 'Authentication verification failed' });
  }
};

/**
 * 4. Get MFA Status: Returns whether 2FA is active and remaining backup code count
 * Requires authenticated developer
 */
exports.getMFAStatus = async (req, res) => {
  try {
    const developerId = req.user?.userId || req.user?.developerId || req.user?.id || req.user?.user_id;
    const result = await pool.query(
      'SELECT mfa_enabled, confirmed_at, backup_codes FROM dev_mfa_settings WHERE developer_id = $1',
      [developerId]
    );

    if (result.rows.length === 0 || !result.rows[0].mfa_enabled) {
      return res.status(200).json({
        success: true,
        data: {
          mfa_enabled: false,
          confirmed_at: null,
          remainingBackupCodes: 0
        }
      });
    }

    const row = result.rows[0];
    const backupCodes = Array.isArray(row.backup_codes) ? row.backup_codes : [];
    const remaining = backupCodes.filter((c) => !c.used).length;

    return res.status(200).json({
      success: true,
      data: {
        mfa_enabled: true,
        confirmed_at: row.confirmed_at,
        remainingBackupCodes: remaining
      }
    });
  } catch (error) {
    console.error('Get MFA Status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch MFA status' });
  }
};

/**
 * 5. Disable MFA: Disables 2FA (requires password confirmation)
 * Requires authenticated developer
 */
exports.disableMFA = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Two-factor authentication is mandatory for all developer accounts and cannot be disabled. You may re-configure your authenticator app instead.'
  });
  try {
    const developerId = req.user?.userId || req.user?.developerId || req.user?.id || req.user?.user_id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Account password is required to disable two-factor authentication'
      });
    }

    const devRes = await pool.query('SELECT password_hash FROM developers WHERE id = $1', [developerId]);
    if (devRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }

    const isMatch = await bcrypt.compare(password, devRes.rows[0].password_hash || '');
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect account password' });
    }

    await pool.query(
      `UPDATE dev_mfa_settings SET
         mfa_enabled = false,
         secret_encrypted = NULL,
         pending_secret = NULL,
         backup_codes = '[]'::jsonb,
         confirmed_at = NULL,
         updated_at = NOW()
       WHERE developer_id = $1`,
      [developerId]
    );

    await pool.query(
      'UPDATE developers SET mfa_enabled = false, updated_at = NOW() WHERE id = $1',
      [developerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Two-factor authentication has been disabled.'
    });
  } catch (error) {
    console.error('Disable MFA error:', error);
    return res.status(500).json({ success: false, message: 'Failed to disable MFA' });
  }
};

/**
 * 6. Regenerate Backup Codes: Generates 8 fresh recovery codes
 * Requires authenticated developer with password confirmation
 */
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const developerId = req.user?.userId || req.user?.developerId || req.user?.id || req.user?.user_id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Account password is required to regenerate backup recovery codes'
      });
    }

    const devRes = await pool.query('SELECT password_hash FROM developers WHERE id = $1', [developerId]);
    if (devRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }

    const isMatch = await bcrypt.compare(password, devRes.rows[0].password_hash || '');
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect account password' });
    }

    const { plainCodes, hashedRecords } = await generateBackupCodes(8);

    await pool.query(
      'UPDATE dev_mfa_settings SET backup_codes = $1, updated_at = NOW() WHERE developer_id = $2',
      [JSON.stringify(hashedRecords), developerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Backup codes regenerated successfully',
      data: {
        backupCodes: plainCodes
      }
    });
  } catch (error) {
    console.error('Regenerate Backup Codes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to regenerate backup codes' });
  }
};


/**
 * Setup MFA Onboarding (Public - validates mfa_token with purpose 'dev_mfa_setup')
 * Used during mandatory MFA setup upon registration or initial login
 */
exports.setupMFAOnboarding = async (req, res) => {
  try {
    const { mfa_token } = req.body;
    if (!mfa_token) {
      return res.status(401).json({ success: false, message: 'Setup token is required' });
    }

    let payload;
    try {
      payload = jwt.verify(mfa_token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Setup session expired. Please sign in again.' });
    }

    if (payload.purpose !== 'dev_mfa_setup') {
      return res.status(401).json({ success: false, message: 'Invalid token purpose' });
    }

    const developerId = payload.developerId;
    const devRes = await pool.query('SELECT id, email, name FROM developers WHERE id = $1', [developerId]);
    if (devRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }
    const dev = devRes.rows[0];

    const secretBase32 = generateSecret();
    const encryptedSecret = passwordEncryptAES(secretBase32);
    const { plainCodes, hashedRecords } = await generateBackupCodes(8);

    try {
      await pool.query(
        `INSERT INTO dev_mfa_settings (developer_id, pending_secret, backup_codes, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (developer_id) DO UPDATE SET
           pending_secret = $2,
           backup_codes = $3,
           updated_at = NOW()`,
        [developerId, encryptedSecret, JSON.stringify(hashedRecords)]
      );
    } catch (insertErr) {
      if (insertErr.code === '42P01') {
        await ensureMfaTable();
        await pool.query(
          `INSERT INTO dev_mfa_settings (developer_id, pending_secret, backup_codes, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (developer_id) DO UPDATE SET
             pending_secret = $2,
             backup_codes = $3,
             updated_at = NOW()`,
          [developerId, encryptedSecret, JSON.stringify(hashedRecords)]
        );
      } else {
        throw insertErr;
      }
    }

    const issuer = 'MSPK Developer Portal';
    const otpAuthUri = generateOtpAuthUri(issuer, dev.email, secretBase32);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        secret: secretBase32,
        otpAuthUri,
        qrCodeUrl: qrCodeDataUrl,
        backupCodes: plainCodes
      }
    });
  } catch (error) {
    console.error('Setup MFA Onboarding error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate MFA setup' });
  }
};

/**
 * Confirm MFA Onboarding (Public - validates mfa_token and TOTP code)
 * Activates MFA and issues full access & refresh cookies
 */
exports.confirmMFAOnboarding = async (req, res) => {
  try {
    const { mfa_token, code } = req.body;
    if (!mfa_token || !code) {
      return res.status(400).json({ success: false, message: 'Setup token and verification code are required' });
    }

    let payload;
    try {
      payload = jwt.verify(mfa_token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Setup session expired. Please sign in again.' });
    }

    if (payload.purpose !== 'dev_mfa_setup') {
      return res.status(401).json({ success: false, message: 'Invalid token purpose' });
    }

    const developerId = payload.developerId;
    const settingsRes = await pool.query(
      'SELECT pending_secret, backup_codes FROM dev_mfa_settings WHERE developer_id = $1',
      [developerId]
    );

    if (settingsRes.rows.length === 0 || !settingsRes.rows[0].pending_secret) {
      return res.status(400).json({
        success: false,
        message: 'No pending setup found. Please scan the QR code first.'
      });
    }

    const { pending_secret } = settingsRes.rows[0];
    const secretBase32 = passwordDecryptAES(pending_secret);
    const isValid = verifyTOTP(secretBase32, code.trim());

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 6-digit code. Please enter the current code from your authenticator app.'
      });
    }

    // Activate MFA
    await pool.query(
      `UPDATE dev_mfa_settings
       SET mfa_enabled = true,
           secret_encrypted = pending_secret,
           pending_secret = NULL,
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE developer_id = $1`,
      [developerId]
    );

    await pool.query(
      'UPDATE developers SET mfa_enabled = true, updated_at = NOW() WHERE id = $1',
      [developerId]
    );

    const devRes = await pool.query(
      'SELECT id, email, name, username, email_verified, is_blocked FROM developers WHERE id = $1',
      [developerId]
    );
    const developer = devRes.rows[0];

    // Reset failed login attempts & track history
    await pool.query(
      'UPDATE developers SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1',
      [developer.id]
    );
    await pool.query(
      'INSERT INTO dev_login_history (developer_id, login_at, login_ip) VALUES ($1, NOW(), $2)',
      [developer.id, req.ip]
    );

    const tokenPayload = {
      userId: developer.id,
      email: developer.email,
      name: developer.name,
      username: developer.username,
      role: 'developer',
      iat: Math.floor(Date.now() / 1000)
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
      [developer.id, refreshToken]
    );

    const accessMaxAge = parseExpiryToMs(process.env.JWT_EXPIRE || '15m');
    const refreshMaxAge = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRE || '7d');
    const cookieSecure = process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : (process.env.NODE_ENV === 'production');

    const cookieOpts = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSecure ? 'none' : 'lax',
      path: '/',
    };
    if (process.env.COOKIE_DOMAIN) {
      cookieOpts.domain = process.env.COOKIE_DOMAIN;
    }

    res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: accessMaxAge });
    res.cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: refreshMaxAge });

    return res.status(200).json({
      success: true,
      message: 'Two-factor authentication successfully enabled. Welcome!',
      data: {
        developer: {
          id: developer.id,
          name: developer.name,
          username: developer.username,
          email: developer.email,
          email_verified: developer.email_verified,
          mfa_enabled: true
        }
      }
    });
  } catch (err) {
    console.error('Confirm MFA Onboarding error:', err);
    return res.status(500).json({ success: false, message: 'Failed to confirm MFA setup' });
  }
};
