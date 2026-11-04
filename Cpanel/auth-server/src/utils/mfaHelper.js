const pool = require('../config/db');
const { passwordDecryptAES } = require('./decryptAES');
const { verifyTOTP, verifyBackupCode } = require('./totp');

/**
 * Checks if MFA is enabled for an app user
 */
const isUserMFAEnabled = async (userId) => {
  try {
    const res = await pool.query(
      `SELECT u.mfa_enabled as user_mfa, m.mfa_enabled as settings_mfa 
       FROM users u 
       LEFT JOIN user_mfa_settings m ON u.id = m.user_id 
       WHERE u.id = $1`,
      [userId]
    );
    if (res.rows.length === 0) return false;
    return res.rows[0].user_mfa === true || res.rows[0].settings_mfa === true;
  } catch (err) {
    console.error('isUserMFAEnabled error:', err.message);
    return false;
  }
};

/**
 * Verifies TOTP or backup code for an app user.
 * If backup code is used, updates the consumed backup codes in user_mfa_settings.
 * Returns: { valid: boolean, message?: string, usedBackupCode?: boolean }
 */
const verifyUserMFA = async (userId, code) => {
  if (!code || !code.toString().trim()) {
    return { valid: false, message: 'Two-factor authentication code is required' };
  }

  const trimmedCode = code.toString().trim();

  const settingsRes = await pool.query(
    'SELECT mfa_enabled, secret_encrypted, backup_codes FROM user_mfa_settings WHERE user_id = $1',
    [userId]
  );

  if (settingsRes.rows.length === 0 || !settingsRes.rows[0].mfa_enabled) {
    return { valid: true }; // MFA not enabled for this user
  }

  const { secret_encrypted, backup_codes } = settingsRes.rows[0];
  let isCodeValid = false;
  let updatedBackupCodes = null;

  // Try TOTP
  if (secret_encrypted) {
    try {
      const secretBase32 = passwordDecryptAES(secret_encrypted);
      isCodeValid = verifyTOTP(secretBase32, trimmedCode);
    } catch (e) {
      console.error('Error decrypting secret in verifyUserMFA:', e.message);
    }
  }

  // If not valid, try single-use backup recovery code
  if (!isCodeValid && backup_codes) {
    const backupResult = await verifyBackupCode(trimmedCode, backup_codes);
    if (backupResult.valid) {
      isCodeValid = true;
      updatedBackupCodes = backupResult.updatedCodes;
    }
  }

  if (!isCodeValid) {
    return { valid: false, message: 'Invalid two-factor authentication code. Please check your authenticator app.' };
  }

  if (updatedBackupCodes) {
    await pool.query(
      'UPDATE user_mfa_settings SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(updatedBackupCodes), userId]
    );
  }

  return { valid: true, usedBackupCode: !!updatedBackupCodes };
};

module.exports = {
  isUserMFAEnabled,
  verifyUserMFA
};
