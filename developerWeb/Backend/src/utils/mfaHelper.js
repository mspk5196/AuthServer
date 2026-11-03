const pool = require('../config/db');
const { passwordDecryptAES } = require('./decryptAES');
const { verifyTOTP, verifyBackupCode } = require('./totp');

/**
 * Checks if MFA is enabled for a developer
 */
const isDeveloperMFAEnabled = async (developerId) => {
  try {
    const res = await pool.query(
      `SELECT d.mfa_enabled as dev_mfa, m.mfa_enabled as settings_mfa 
       FROM developers d 
       LEFT JOIN dev_mfa_settings m ON d.id = m.developer_id 
       WHERE d.id = $1`,
      [developerId]
    );
    if (res.rows.length === 0) return false;
    return res.rows[0].dev_mfa === true || res.rows[0].settings_mfa === true;
  } catch (err) {
    console.error('isDeveloperMFAEnabled error:', err.message);
    return false;
  }
};

/**
 * Verifies TOTP or backup code for a developer.
 * If backup code is used, updates the consumed backup codes in dev_mfa_settings.
 * Returns: { valid: boolean, message?: string, usedBackupCode?: boolean }
 */
const verifyDeveloperMFA = async (developerId, code) => {
  if (!code || !code.toString().trim()) {
    return { valid: false, message: 'Two-factor authentication code is required' };
  }

  const trimmedCode = code.toString().trim();

  const settingsRes = await pool.query(
    'SELECT mfa_enabled, secret_encrypted, backup_codes FROM dev_mfa_settings WHERE developer_id = $1',
    [developerId]
  );

  if (settingsRes.rows.length === 0 || !settingsRes.rows[0].mfa_enabled) {
    return { valid: true }; // MFA not enabled for this developer
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
      console.error('Error decrypting secret in verifyDeveloperMFA:', e.message);
    }
  }

  // If not valid, try backup code
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
      'UPDATE dev_mfa_settings SET backup_codes = $1, updated_at = NOW() WHERE developer_id = $2',
      [JSON.stringify(updatedBackupCodes), developerId]
    );
  }

  return { valid: true, usedBackupCode: !!updatedBackupCodes };
};

module.exports = {
  isDeveloperMFAEnabled,
  verifyDeveloperMFA
};

