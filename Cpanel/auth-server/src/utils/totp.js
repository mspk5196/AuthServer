const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Base32 Encode (RFC 4648)
 */
function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 Decode (RFC 4648)
 */
function base32Decode(str) {
  let bits = 0;
  let value = 0;
  let index = 0;
  const clean = str.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  const output = Buffer.alloc(Math.floor((clean.length * 5) / 8));

  for (let i = 0; i < clean.length; i++) {
    const val = ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

/**
 * Generate a cryptographically secure random Base32 secret (default 20 bytes = 32 base32 chars)
 */
function generateSecret(length = 20) {
  return base32Encode(crypto.randomBytes(length));
}

/**
 * Generate 6-digit TOTP for a given timestamp (RFC 6238)
 */
function generateTOTP(secretBase32, timeSec = Math.floor(Date.now() / 1000), step = 30) {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timeSec / step);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP code within a tolerance window (default +/- 1 step of 30 seconds)
 */
function verifyTOTP(secretBase32, inputCode, window = 1, step = 30) {
  if (!secretBase32 || !inputCode) return false;
  const cleanCode = String(inputCode).trim();
  if (!/^\d{6}$/.test(cleanCode)) return false;

  const currentSec = Math.floor(Date.now() / 1000);
  for (let w = -window; w <= window; w++) {
    const expected = generateTOTP(secretBase32, currentSec + w * step, step);
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Generate standard otpauth URI for Authenticator apps (Google Authenticator, Authy, etc.)
 */
function generateOtpAuthUri(issuer, accountEmail, secretBase32) {
  const encIssuer = encodeURIComponent(issuer);
  const encEmail = encodeURIComponent(accountEmail);
  return `otpauth://totp/${encIssuer}:${encEmail}?secret=${secretBase32}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate 8 single-use backup recovery codes formatted XXXX-XXXX
 */
async function generateBackupCodes(count = 8) {
  const plainCodes = [];
  const hashedRecords = [];

  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const formatted = `${part1}-${part2}`;
    const rawNormalized = formatted.replace(/-/g, '');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawNormalized, salt);

    plainCodes.push(formatted);
    hashedRecords.push({
      code_hash: hash,
      used: false,
      used_at: null
    });
  }

  return { plainCodes, hashedRecords };
}

/**
 * Verify an entered backup code against the user's stored backup codes array
 */
async function verifyBackupCode(inputCode, backupCodesList) {
  if (!inputCode || !Array.isArray(backupCodesList)) return { valid: false };

  const rawNormalized = String(inputCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (rawNormalized.length !== 8) return { valid: false };

  for (let i = 0; i < backupCodesList.length; i++) {
    const entry = backupCodesList[i];
    if (entry.used) continue;

    const isMatch = await bcrypt.compare(rawNormalized, entry.code_hash);
    if (isMatch) {
      entry.used = true;
      entry.used_at = new Date().toISOString();
      return {
        valid: true,
        updatedCodes: backupCodesList
      };
    }
  }

  return { valid: false };
}

module.exports = {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateOtpAuthUri,
  generateBackupCodes,
  verifyBackupCode
};

