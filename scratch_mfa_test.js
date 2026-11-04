require('dotenv').config({ path: 'Cpanel/auth-server/.env' });
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_USER = 'mspkapps';
process.env.DB_PASS = 'Mskp@3922';
process.env.DB_NAME = 'authdb';

const pool = require('./Cpanel/auth-server/src/config/db');
const { generateTOTP } = require('./Cpanel/auth-server/src/utils/totp');

async function runTests() {
  console.log('--- Starting Multi-Factor Authentication (MFA) End-to-End Tests ---');

  // 1. Get an existing app
  const appRes = await pool.query('SELECT * FROM dev_apps LIMIT 1');
  if (appRes.rows.length === 0) {
    throw new Error('No dev apps found in database');
  }
  const app = appRes.rows[0];
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

  const baseUrl = 'http://localhost:5002/api/v1';

  // Helper for requests
  const apiCall = async (method, path, body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}/${app.api_key}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json };
  };

  // TEST 1: Initial Login with Optional MFA (user has MFA disabled)
  console.log('\n[Test 1] Login with MFA disabled (Policy: optional)...');
  const login1 = await apiCall('POST', '/auth/login', { email: testEmail, password: 'TestPassword123!' });
  if (login1.status === 200 && login1.data.success && login1.data.data?.accessToken) {
    console.log('✓ PASS: Login succeeded directly without MFA prompt');
  } else {
    throw new Error(`Test 1 Failed: ${JSON.stringify(login1)}`);
  }
  const userToken = login1.data.data.accessToken;

  // TEST 2: Check MFA status
  console.log('\n[Test 2] Check authenticated user MFA status...');
  const status1 = await apiCall('GET', '/user/mfa/status', null, userToken);
  if (status1.data.success && status1.data.data?.mfa_enabled === false) {
    console.log('✓ PASS: MFA status returned enabled: false');
  } else {
    throw new Error(`Test 2 Failed: ${JSON.stringify(status1)}`);
  }

  // TEST 3: Setup MFA
  console.log('\n[Test 3] Setup MFA for logged-in user...');
  const setupRes = await apiCall('POST', '/user/mfa/setup', {}, userToken);
  if (setupRes.data.success && setupRes.data.data?.secret && setupRes.data.data?.qr_code) {
    console.log(`✓ PASS: Generated Base32 secret (${setupRes.data.data.secret.substring(0, 8)}...) & QR code`);
  } else {
    throw new Error(`Test 3 Failed: ${JSON.stringify(setupRes)}`);
  }
  const secretBase32 = setupRes.data.data.secret;

  // TEST 4: Confirm MFA with TOTP code
  console.log('\n[Test 4] Confirm MFA setup with real generated TOTP code...');
  const currentTotp = generateTOTP(secretBase32);
  const confirmRes = await apiCall('POST', '/user/mfa/confirm', { code: currentTotp }, userToken);
  if (confirmRes.data.success && Array.isArray(confirmRes.data.backup_codes) && confirmRes.data.backup_codes.length === 8) {
    console.log(`✓ PASS: MFA confirmed! Received 8 backup recovery codes:`, confirmRes.data.backup_codes.slice(0, 3).join(', '), '...');
  } else {
    throw new Error(`Test 4 Failed: ${JSON.stringify(confirmRes)}`);
  }
  const backupCodes = confirmRes.data.backup_codes;

  // TEST 5: Login with MFA Enabled (Challenge prompt)
  console.log('\n[Test 5] Login again (MFA enabled -> Challenge prompt expected)...');
  const login2 = await apiCall('POST', '/auth/login', { email: testEmail, password: 'TestPassword123!' });
  if (login2.data.success && login2.data.mfa_required && login2.data.mfa_token) {
    console.log('✓ PASS: Server challenged for MFA token');
  } else {
    throw new Error(`Test 5 Failed: ${JSON.stringify(login2)}`);
  }
  const mfaChallengeToken = login2.data.mfa_token;

  // TEST 6: Verify MFA Login using TOTP
  console.log('\n[Test 6] Verify MFA challenge using valid TOTP...');
  const totpCode = generateTOTP(secretBase32);
  const verifyRes = await apiCall('POST', '/auth/mfa/verify', { mfa_token: mfaChallengeToken, code: totpCode });
  if (verifyRes.data.success && verifyRes.data.data?.accessToken) {
    console.log('✓ PASS: MFA verified! Access token issued for user session');
  } else {
    throw new Error(`Test 6 Failed: ${JSON.stringify(verifyRes)}`);
  }

  // TEST 7: Single-use Backup Recovery Code Consumption
  console.log('\n[Test 7] Verify MFA challenge using single-use Backup Code...');
  const login3 = await apiCall('POST', '/auth/login', { email: testEmail, password: 'TestPassword123!' });
  const mfaTokenBackup = login3.data.mfa_token;
  const testBackupCode = backupCodes[0];

  const verifyBackupRes = await apiCall('POST', '/auth/mfa/verify', { mfa_token: mfaTokenBackup, code: testBackupCode });
  if (verifyBackupRes.data.success && verifyBackupRes.data.data?.accessToken) {
    console.log(`✓ PASS: Backup code ${testBackupCode} accepted for login`);
  } else {
    throw new Error(`Test 7 Failed: ${JSON.stringify(verifyBackupRes)}`);
  }

  // TEST 8: Replay Attack Prevention (Same backup code cannot be reused)
  console.log('\n[Test 8] Prevent reuse of consumed backup code...');
  const login4 = await apiCall('POST', '/auth/login', { email: testEmail, password: 'TestPassword123!' });
  const replayRes = await apiCall('POST', '/auth/mfa/verify', { mfa_token: login4.data.mfa_token, code: testBackupCode });
  if (replayRes.status === 401 && !replayRes.data.success) {
    console.log('✓ PASS: Previously used backup code was rejected');
  } else {
    throw new Error(`Test 8 Failed: Expected 401 rejection on reused backup code but got ${JSON.stringify(replayRes)}`);
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

  const enfLogin = await apiCall('POST', '/auth/login', { email: freshEmail, password: 'TestPassword123!' });
  if (enfLogin.data.success && enfLogin.data.mfa_setup_required && enfLogin.data.mfa_token) {
    console.log('✓ PASS: Server blocked login and required mandatory MFA setup');
  } else {
    throw new Error(`Test 9 Failed: ${JSON.stringify(enfLogin)}`);
  }
  const onboardingToken = enfLogin.data.mfa_token;

  // Setup Onboarding
  const onbSetup = await apiCall('POST', '/auth/mfa/setup-onboarding', { mfa_token: onboardingToken });
  if (onbSetup.data.success && onbSetup.data.data?.secret) {
    console.log('✓ PASS: Setup onboarding returned secret and QR code');
  } else {
    throw new Error(`Setup Onboarding Failed: ${JSON.stringify(onbSetup)}`);
  }

  // Confirm Onboarding
  const onbTotp = generateTOTP(onbSetup.data.data.secret);
  const onbConfirm = await apiCall('POST', '/auth/mfa/confirm-onboarding', { mfa_token: onboardingToken, code: onbTotp });
  if (onbConfirm.data.success && onbConfirm.data.data?.accessToken && Array.isArray(onbConfirm.data.backup_codes)) {
    console.log('✓ PASS: Mandatory onboarding confirmed! User logged in automatically');
  } else {
    throw new Error(`Confirm Onboarding Failed: ${JSON.stringify(onbConfirm)}`);
  }

  // TEST 10: Disabling MFA blocked under 'enforced' policy
  console.log('\n[Test 10] Attempt to disable MFA while policy is enforced...');
  const enfUserToken = onbConfirm.data.data.accessToken;
  const disableTry = await apiCall('POST', '/user/mfa/disable', { code: generateTOTP(onbSetup.data.data.secret) }, enfUserToken);
  if (disableTry.status === 400 && !disableTry.data.success) {
    console.log('✓ PASS: Server blocked disabling MFA under enforced policy');
  } else {
    throw new Error(`Test 10 Failed: ${JSON.stringify(disableTry)}`);
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
