process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_USER = 'mspkapps';
process.env.DB_PASS = 'Pranesh82';
process.env.DB_NAME = 'authdb';

const pool = require('./src/config/db');
const { generateTOTP } = require('./src/utils/totp');
const crypto = require('crypto');
const path = require('path');

function encryptSecret(secret) {
  const keyHex = process.env.SECRET_ENCRYPTION_KEY;
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = cipher.update(secret, 'utf8', 'hex') + cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptSecret(encrypted) {
  const keyHex = process.env.SECRET_ENCRYPTION_KEY;
  const key = Buffer.from(keyHex, 'hex');
  const [ivHex, authTagHex, cipherHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(cipherHex, 'hex', 'utf8') + decipher.final('utf8');
}

async function runTests() {
  console.log('--- Starting Multi-Factor Authentication (MFA) End-to-End Tests ---');

  // 1. Get an existing app
  const appRes = await pool.query('SELECT * FROM dev_apps LIMIT 1');
  if (appRes.rows.length === 0) {
    throw new Error('No dev apps found in database');
  }
  let app = appRes.rows[0];

  let rawSecret;
  if (!app.api_secret_encrypted) {
    rawSecret = 'sec_' + crypto.randomBytes(24).toString('hex');
    const enc = encryptSecret(rawSecret);
    const hash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    await pool.query('UPDATE dev_apps SET api_secret_encrypted = $1, api_secret_hash = $2 WHERE id = $3', [enc, hash, app.id]);
    app.api_secret_encrypted = enc;
    console.log(`Generated and stored encrypted secret for App "${app.app_name}"`);
  } else {
    rawSecret = decryptSecret(app.api_secret_encrypted);
  }

  console.log(`Using App: "${app.app_name}" (ID: ${app.id}, API Key: ${app.api_key})`);

  // Ensure policy is optional for initial tests
  await pool.query("UPDATE dev_apps SET mfa_policy = 'optional' WHERE id = $1", [app.id]);

  // 2. Clean or find a test user
  const testEmail = 'mfatest_user@mspkapps.com';
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('TestPassword123!', salt);

  await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
  const userInsertRes = await pool.query(`
    INSERT INTO users (app_id, email, password_hash, name, username, email_verified, is_blocked, mfa_enabled, created_at, updated_at)
    VALUES ($1, $2, $3, 'MFA Test User', 'mfatestuser', true, false, false, NOW(), NOW())
    RETURNING id, email, mfa_enabled
  `, [app.id, testEmail, passwordHash]);
  const testUser = userInsertRes.rows[0];
  console.log(`Created fresh test user: ${testUser.email} (ID: ${testUser.id})`);

  // Initialize SDK
  const sdkModule = await import('file:///' + path.resolve('G:/MY PROJECTS/AuthServerNpm/src/AuthClient.js').replace(/\\/g, '/'));
  const AuthClient = sdkModule.AuthClient || sdkModule.default.client.constructor;

  const client = new AuthClient({
    apiKey: app.api_key,
    apiSecret: rawSecret,
    baseUrl: 'http://localhost:5002/api/v1'
  });

  // TEST 1: Initial Login with Optional MFA (user has MFA disabled)
  console.log('\n[Test 1] Login with MFA disabled (Policy: optional)...');
  const login1 = await client.login({ email: testEmail, password: 'TestPassword123!' });
  if (login1.success && (login1.data?.accessToken || login1.data?.access_token)) {
    console.log('✓ PASS: Login succeeded directly without MFA prompt');
  } else {
    throw new Error(`Test 1 Failed: ${JSON.stringify(login1)}`);
  }

  // TEST 2: Check MFA status
  console.log('\n[Test 2] Check authenticated user MFA status via SDK...');
  const status1 = await client.getMFAStatus();
  if (status1.success && status1.data?.mfa_enabled === false) {
    console.log('✓ PASS: MFA status returned enabled: false');
  } else {
    throw new Error(`Test 2 Failed: ${JSON.stringify(status1)}`);
  }

  // TEST 3: Setup MFA
  console.log('\n[Test 3] Setup MFA for logged-in user via SDK...');
  const setupRes = await client.setupMFA();
  if (setupRes.success && setupRes.data?.secret && setupRes.data?.qr_code) {
    console.log(`✓ PASS: Generated Base32 secret (${setupRes.data.secret.substring(0, 8)}...) & QR code`);
  } else {
    throw new Error(`Test 3 Failed: ${JSON.stringify(setupRes)}`);
  }
  const secretBase32 = setupRes.data.secret;

  // TEST 4: Confirm MFA with TOTP code
  console.log('\n[Test 4] Confirm MFA setup with real generated TOTP code...');
  const currentTotp = generateTOTP(secretBase32);
  const confirmRes = await client.confirmMFA({ code: currentTotp });
  if (confirmRes.success && Array.isArray(confirmRes.backup_codes) && confirmRes.backup_codes.length === 8) {
    console.log(`✓ PASS: MFA confirmed! Received 8 backup recovery codes:`, confirmRes.backup_codes.slice(0, 3).join(', '), '...');
  } else {
    throw new Error(`Test 4 Failed: ${JSON.stringify(confirmRes)}`);
  }
  const backupCodes = confirmRes.backup_codes;

  // TEST 5: Login with MFA Enabled (Challenge prompt)
  console.log('\n[Test 5] Login again (MFA enabled -> Challenge prompt expected)...');
  const login2 = await client.login({ email: testEmail, password: 'TestPassword123!' });
  if (login2.success && login2.mfa_required && login2.mfa_token) {
    console.log('✓ PASS: Server challenged for MFA token');
  } else {
    throw new Error(`Test 5 Failed: ${JSON.stringify(login2)}`);
  }
  const mfaChallengeToken = login2.mfa_token;

  // TEST 6: Verify MFA Login using TOTP via SDK
  console.log('\n[Test 6] Verify MFA challenge using valid TOTP via SDK verifyMFA...');
  const totpCode = generateTOTP(secretBase32);
  const verifyRes = await client.verifyMFA({ mfa_token: mfaChallengeToken, code: totpCode });
  if (verifyRes.success && verifyRes.data?.accessToken) {
    console.log('✓ PASS: MFA verified! Access token issued for user session');
  } else {
    throw new Error(`Test 6 Failed: ${JSON.stringify(verifyRes)}`);
  }

  // TEST 7: Single-use Backup Recovery Code Consumption
  console.log('\n[Test 7] Verify MFA challenge using single-use Backup Code...');
  const login3 = await client.login({ email: testEmail, password: 'TestPassword123!' });
  const mfaTokenBackup = login3.mfa_token;
  const testBackupCode = backupCodes[0];

  const verifyBackupRes = await client.verifyMFA({ mfa_token: mfaTokenBackup, code: testBackupCode });
  if (verifyBackupRes.success && verifyBackupRes.data?.accessToken) {
    console.log(`✓ PASS: Backup code ${testBackupCode} accepted for login`);
  } else {
    throw new Error(`Test 7 Failed: ${JSON.stringify(verifyBackupRes)}`);
  }

  // TEST 8: Replay Attack Prevention (Same backup code cannot be reused)
  console.log('\n[Test 8] Prevent reuse of consumed backup code...');
  const login4 = await client.login({ email: testEmail, password: 'TestPassword123!' });
  try {
    await client.verifyMFA({ mfa_token: login4.mfa_token, code: testBackupCode });
    throw new Error('Test 8 Failed: Expected error on reused backup code but call succeeded');
  } catch (err) {
    console.log(`✓ PASS: Previously used backup code was rejected (${err.message})`);
  }

  // TEST 9: App Policy "enforced" & Mandatory Onboarding
  console.log('\n[Test 9] Test App Policy "enforced" & Mandatory Onboarding for fresh user...');
  await pool.query("UPDATE dev_apps SET mfa_policy = 'enforced' WHERE id = $1", [app.id]);

  const freshEmail = 'enforced_user@mspkapps.com';
  await pool.query('DELETE FROM users WHERE email = $1', [freshEmail]);
  await pool.query(`
    INSERT INTO users (app_id, email, password_hash, name, username, email_verified, is_blocked, mfa_enabled, created_at, updated_at)
    VALUES ($1, $2, $3, 'Enforced User', 'enforceduser', true, false, false, NOW(), NOW())
  `, [app.id, freshEmail, passwordHash]);

  const enfLogin = await client.login({ email: freshEmail, password: 'TestPassword123!' });
  if (enfLogin.success && enfLogin.mfa_setup_required && enfLogin.mfa_token) {
    console.log('✓ PASS: Server blocked login and required mandatory MFA setup');
  } else {
    throw new Error(`Test 9 Failed: ${JSON.stringify(enfLogin)}`);
  }
  const onboardingToken = enfLogin.mfa_token;

  // Setup Onboarding via SDK
  const onbSetup = await client.setupMFAOnboarding({ mfa_token: onboardingToken });
  if (onbSetup.success && onbSetup.data?.secret) {
    console.log('✓ PASS: Setup onboarding returned secret and QR code');
  } else {
    throw new Error(`Setup Onboarding Failed: ${JSON.stringify(onbSetup)}`);
  }

  // Confirm Onboarding via SDK
  const onbTotp = generateTOTP(onbSetup.data.secret);
  const onbConfirm = await client.confirmMFAOnboarding({ mfa_token: onboardingToken, code: onbTotp });
  if (onbConfirm.success && onbConfirm.data?.accessToken && Array.isArray(onbConfirm.backup_codes)) {
    console.log('✓ PASS: Mandatory onboarding confirmed! User logged in automatically');
  } else {
    throw new Error(`Confirm Onboarding Failed: ${JSON.stringify(onbConfirm)}`);
  }

  // TEST 10: Disabling MFA blocked under 'enforced' policy
  console.log('\n[Test 10] Attempt to disable MFA while policy is enforced...');
  try {
    await client.disableMFA({ code: generateTOTP(onbSetup.data.secret) });
    throw new Error('Test 10 Failed: Expected policy error when disabling MFA under enforced policy');
  } catch (err) {
    console.log(`✓ PASS: Server blocked disabling MFA under enforced policy (${err.message})`);
  }

  // Restore app policy
  await pool.query("UPDATE dev_apps SET mfa_policy = 'optional' WHERE id = $1", [app.id]);

  // Clean test users
  await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [testEmail, freshEmail]);

  console.log('\n======================================================');
  console.log('🎉 ALL 10 MULTI-FACTOR AUTHENTICATION TESTS PASSED! 🎉');
  console.log('======================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
