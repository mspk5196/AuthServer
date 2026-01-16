const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { passwordEncryptAES, passwordDecryptAES } = require('../utils/decryptAES');
const { sendMail } = require('../utils/mailer');
const {
  buildWelcomeVerificationEmail,
  buildPasswordResetEmail,
  buildChangePasswordLinkEmail,
  buildPasswordChangedEmail,
  buildEmailVerificationEmail,
  buildDeleteAccountEmail,
  buildAccountDeletedEmail,
  buildGoogleUserWelcomeEmail,
  buildSetPasswordGoogleUserEmail,
  buildPasswordSetConfirmationEmail,
  buildProfileUpdateVerificationEmail,
} = require('../templates/emailTemplates');
const { log, error } = require('console');

/**
 * Middleware to verify app credentials (API Key + Secret)
 */
const verifyAppCredentials = async (req, res, next) => {
  try {
    const apiKey = req.params.apiKey || req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        success: false,
        error: 'Missing API credentials',
        message: 'Both X-API-Key and X-API-Secret headers are required'
      });
    }

    // Hash the provided secret
    const hashedSecret = crypto.createHash('sha256').update(apiSecret).digest('hex');

    // Verify credentials and get app details
    const result = await pool.query(`
      SELECT 
        a.*,
        d.id as developer_id,
        d.name as developer_name,
        d.email as developer_email
      FROM dev_apps a
      JOIN developers d ON a.developer_id = d.id
      WHERE a.api_key = $1 AND a.api_secret_hash = $2
    `, [apiKey, hashedSecret]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API credentials',
        message: 'API key or secret is incorrect'
      });
    }

    const app = result.rows[0];

    // Check if developer's plan is active
    const planCheck = await pool.query(`
      SELECT 
        p.features,
        dpr.is_active,
        dpr.end_date
      FROM developer_plan_registrations dpr
      JOIN dev_plans p ON dpr.plan_id = p.id
      WHERE dpr.developer_id = $1 AND dpr.is_active = true
      LIMIT 1
    `, [app.developer_id]);

    if (planCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Plan inactive',
        message: 'Developer plan is not active. Please contact the app owner.'
      });
    }

    // Attach app and plan info to request (avoid shadowing Express req.app)
    req.devApp = app;
    req.plan = planCheck.rows[0];

    // Track API call (non-blocking)
    trackApiCall(app.id, app.developer_id, req).catch(err =>
      console.error('API tracking error:', err)
    );

    next();
  } catch (error) {
    console.error('Verify app credentials error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify API credentials'
    });
  }
};

/**
 * Track API call for analytics and billing
 */
async function trackApiCall(appId, developerId, req) {
  try {
    await pool.query(`
      INSERT INTO dev_api_calls (
        app_id, developer_id, endpoint, method, 
        ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      appId,
      developerId,
      req.path,
      req.method,
      req.ip,
      req.headers['user-agent']
    ]);
  } catch (error) {
    // Silently fail - don't block the request
    console.error('Track API call error:', error);
  }
}

/**
 * Verify access token validity
 *
 * POST /api/v1/:apiKey/auth/verify-token
 * Headers:
 *   X-API-Key, X-API-Secret (handled by verifyAppCredentials)
 *   Authorization: Bearer <access_token> (preferred)
 * Body (optional): { "access_token": "..." }
 *
 * Response (200):
 *   { success: true, valid: true,  user: { ... }, token: { exp, iat } }
 *   { success: true, valid: false, reason: 'expired'|'invalid'|'user_not_found'|'account_blocked'|'app_mismatch' }
 */
const verifyAccessToken = async (req, res) => {
  try {
    const app = req.devApp;
    // Prefer Authorization header
    const authHeader = req.headers['authorization'];
    // console.log    console.log("app in verifyAccessToken:", app, "\n", "authHeader:", authHeader);
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.body && req.body.access_token) {
      token = req.body.access_token;
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Token required',
        message: 'Access token is required (Authorization header or access_token in body)'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(err.name)) {
        return res.status(200).json({
          success: true,
          valid: false,
          reason: err.name === 'TokenExpiredError' ? 'expired' : 'invalid',
          message: 'Access token is invalid or expired'
        });
      }

      console.error('Access token verification error:', err);
      return res.status(500).json({
        success: false,
        valid: false,
        error: 'Verification failed',
        message: 'Failed to verify access token'
      });
    }

    // Ensure token belongs to this app
    if (!decoded.appId || decoded.appId !== app.id) {
      return res.status(200).json({
        success: true,
        valid: false,
        reason: 'app_mismatch',
        message: 'Token does not belong to this app'
      });
    }

    // Ensure user exists and is not blocked
    const userRes = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND app_id = $2',
      [decoded.userId, app.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        valid: false,
        reason: 'user_not_found',
        message: 'User not found for this token'
      });
    }

    const user = userRes.rows[0];

    if (user.is_blocked) {
      return res.status(200).json({
        success: true,
        valid: false,
        reason: 'account_blocked',
        message: 'User account is blocked'
      });
    }
    // console.log    console.log('Token true');

    return res.status(200).json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username
      },
      token: {
        app_id: decoded.appId,
        user_id: decoded.userId,
        email: decoded.email,
        iat: decoded.iat,
        exp: decoded.exp
      }
    });
  } catch (error) {
    console.error('Verify access token error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Verification failed',
      message: 'Failed to verify access token'
    });
  }
};


/**
 * Register a new user
 */
const registerUser = async (req, res) => {
  try {
    const { email, password, name, username, extra } = req.body;
    const app = req.devApp;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Check if email login is enabled
    if (!app.allow_email_signin) {
      return res.status(403).json({
        success: false,
        error: 'Feature disabled',
        message: 'Email/password registration is not enabled for this app'
      });
    }

    // Check if email already exists for this app
    const existingUser = await pool.query(
      'SELECT id, password_hash, google_linked FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );
    const existingUserData = existingUser.rows[0];

    if (existingUser.rows.length > 0) {
      if (existingUserData.password_hash === null && existingUserData.google_linked === true) {
        return res.status(403).json({
          success: false,
          error: 'You have signed up through Google OAuth. Please use Google Sign-In to log in.',
          message: 'You have signed up through Google OAuth. Please use Google Sign-In to log in.'
        });
      }
      return res.status(409).json({
        success: false,
        error: 'Email exists',
        message: 'A user with this email already exists'
      });
    }

    // Check if email exists in any other app within the same group
    const groupCheck = await pool.query(`
      SELECT ag.name as group_name, da.app_name
      FROM users u
      JOIN dev_apps da ON u.app_id = da.id
      JOIN app_groups ag ON da.group_id = ag.id
      WHERE da.group_id = (SELECT group_id FROM dev_apps WHERE id = $1)
        AND u.email = $2
        AND da.id != $1
      LIMIT 1
    `, [app.id, email.toLowerCase()]);

    if (groupCheck.rows.length > 0) {
      const groupInfo = groupCheck.rows[0];
      return res.status(409).json({
        success: false,
        error: 'Email exists in group',
        message: `You already have an account with "${groupInfo.group_name}". Please use the same credentials to log in.`,
        group_name: groupInfo.group_name
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Prepare allowed extra fields (filter against app.extra_fields metadata)
    const extraMeta = app.extra_fields || [];
    let allowedExtra = {};
    const coreKeys = new Set(['email', 'password', 'name', 'username', 'extra']);
    // Accept both `extra: { ... }` and top-level keys matching defined extra fields
    if (extra && typeof extra === 'object') {
      for (const k of Object.keys(extra)) {
        if (coreKeys.has(k)) continue; // never store core fields in extra
        if (extraMeta.find(f => f.name === k)) {
          allowedExtra[k] = extra[k];
        }
      }
    }
    for (const k of Object.keys(req.body || {})) {
      if (coreKeys.has(k)) continue;
      // skip if already captured from `extra` object
      if (Object.prototype.hasOwnProperty.call(allowedExtra, k)) continue;
      if (extraMeta.find(f => f.name === k)) {
        allowedExtra[k] = req.body[k];
      }
    }

    // Create user (store extra JSONB)
    const result = await pool.query(`
      INSERT INTO users (
        app_id, email, password_hash, name, username, extra,
        email_verified, google_linked, is_blocked,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, false, false, false, NOW(), NOW()
      )
      RETURNING id, email, name, username, email_verified, created_at, extra
    `, [app.id, email.toLowerCase(), hashedPassword, name, username.toLowerCase(), JSON.stringify(allowedExtra)]);

    const user = result.rows[0];

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await pool.query(`
      INSERT INTO user_email_verifications (
        user_id, app_id, token, expires_at, created_at, verify_type
      ) VALUES (
       $1, $2, $3, NOW() + INTERVAL '24 hours', NOW(), 'New Account'
      )
    `, [user.id, app.id, verificationToken]);

    // Send verification email (non-blocking)
    const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-email?token=${verificationToken}`;

    sendMail({
      to: email,
      subject: 'Verify Your Email',
      html: buildWelcomeVerificationEmail({ appName: app.app_name, verificationUrl, supportEmail: app.support_email }),
    }).catch(err => console.error('Send verification email error:', err));

    // Determine access token TTL (per-app override, then env fallback, then default 7 days)
    const ttl = app.access_token_expires_seconds ? parseInt(app.access_token_expires_seconds, 10) : (process.env.ACCESS_TOKEN_EXPIRES_SECONDS ? parseInt(process.env.ACCESS_TOKEN_EXPIRES_SECONDS, 10) : 604800);

    // Generate access token (token may be returned as null until email verification completes)
    const accessToken = jwt.sign(
      { userId: user.id, appId: app.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: ttl }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          email_verified: user.email_verified,
          created_at: user.created_at,
          extra: user.extra || {}
        },
        access_token: null,
        token_type: 'Bearer',
        expires_in: ttl
      }
    });

  } catch (error) {
    console.error('Register user error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'Failed to register user. Please try again.'
    });
  }
};

/**
 * Login user with email/password
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const app = req.devApp;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Check if email login is enabled
    if (!app.allow_email_signin) {
      return res.status(403).json({
        success: false,
        error: 'Feature disabled',
        message: 'Email/password login is not enabled for this app'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE app_id = $1 AND (email = $2 OR username = $2)',
      [app.id, email.toLowerCase()]
    );

    let user;
    if (result.rows.length === 0) {
      // If app is part of a group, attempt group-wide fallback: find a user
      // in any app within the same group and verify the password there.
      if (app.group_id) {
        const identifier = email.toLowerCase();
        const groupUserRes = await pool.query(`
          SELECT u.*, a.id as app_id, a.app_name
          FROM users u
          JOIN dev_apps a ON u.app_id = a.id
          WHERE a.group_id = $1 AND (u.email = $2 OR u.username = $2)
          LIMIT 1
        `, [app.group_id, identifier]);

        if (groupUserRes.rows.length > 0) {
          const groupUser = groupUserRes.rows[0];

          // If the found user uses Google-only auth, we cannot verify password
          if (groupUser.password_hash === null && groupUser.google_linked === true) {
            return res.status(401).json({ success: false, error: 'Invalid credentials', message: 'Email or password is incorrect' });
          }

          const isPasswordValidGroup = await bcrypt.compare(password, groupUser.password_hash || '');
          if (!isPasswordValidGroup) {
            return res.status(401).json({ success: false, error: 'Invalid credentials', message: 'Email or password is incorrect' });
          }

          // Create a local user record in the current app (per-app credentials allowed)
          const bcryptSalt = await bcrypt.genSalt(10);
          const localHash = await bcrypt.hash(password, bcryptSalt);

          const insertRes = await pool.query(`
            INSERT INTO users (app_id, email, password_hash, name, username, email_verified, google_linked, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NULL, $5, $6, NOW(), NOW())
            RETURNING id, email, name, username, email_verified, google_linked, last_login, app_id
          `, [app.id, groupUser.email, localHash, groupUser.name, groupUser.email_verified, groupUser.google_linked]);

          user = insertRes.rows[0];

          // Record group_user_logins entry
          try {
            await pool.query(`
              INSERT INTO group_user_logins (group_id, user_id, app_id, last_login, created_at, updated_at)
              VALUES ($1, $2, $3, NOW(), NOW(), NOW())
              ON CONFLICT (group_id, user_id, app_id) DO UPDATE SET last_login = NOW(), updated_at = NOW()
            `, [app.group_id, user.id, app.id]);
          } catch (err) {
            console.error('Failed to record group_user_logins:', err.message || err);
          }

        } else {
          return res.status(401).json({ success: false, error: 'Invalid credentials', message: 'Email or password is incorrect' });
        }
      } else {
        return res.status(401).json({ success: false, error: 'Invalid credentials', message: 'Email or password is incorrect' });
      }
    } else {
      user = result.rows[0];
    }

    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({
        success: false,
        error: 'Account blocked',
        message: 'Your account has been blocked. Please contact support.'
      });
    }

    if (user.email_verified === false) {
      return res.status(403).json({
        success: false,
        error: 'Account not verified',
        message: 'Your account has not been verified. Please check your email for the verification link.'
      });
    }

    if (user.password_hash === null && user.google_linked === true) {
      return res.status(403).json({
        success: false,
        error: 'You have signed up through Google OAuth. Please use Google Sign-In to log in.',
        message: 'You have signed up through Google OAuth. Please use Google Sign-In to log in.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Log login history
    await pool.query(`
      INSERT INTO user_login_history (
        user_id, app_id, login_method, ip_address, user_agent, login_time, created_at
      ) VALUES (
        $1, $2, 'email', $3, $4, NOW(), NOW()
      )
    `, [user.id, app.id, req.ip, req.headers['user-agent']]);

    // Determine access token TTL (per-app override, then env fallback, then default 7 days)
    const ttl = app.access_token_expires_seconds ? parseInt(app.access_token_expires_seconds, 10) : (process.env.ACCESS_TOKEN_EXPIRES_SECONDS ? parseInt(process.env.ACCESS_TOKEN_EXPIRES_SECONDS, 10) : 604800);

    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, appId: app.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: ttl }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          email_verified: user.email_verified,
          google_linked: user.google_linked,
          last_login: user.last_login,
          login_method: 'email',
          extra: user.extra || {}
        },
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: ttl
      }
    });

  } catch (error) {
    console.error('Login user error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'Failed to login. Please try again.'
    });
  }
};

/**
 * Verify email with token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    // const app = req.devApp;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Verification token is required'
      });
    }

    // Find verification record
    const result = await pool.query(`
      SELECT * FROM user_email_verifications 
      WHERE token = $1 AND expires_at > NOW() AND used = false
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'Verification token is invalid or expired'
      });
    }

    const verification = result.rows[0];

    // Update user email_verified status
    await pool.query(
      'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
      [verification.user_id]
    );

    // Delete verification token (one-time use)
    await pool.query('UPDATE user_email_verifications SET used = true WHERE id = $1', [verification.id]);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: 'Failed to verify email. Please try again.'
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    // console.log    console.log("authHeader(getProfile)", authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7);
    // console.log    console.log("token(getProfile):", token);
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user info
    const result = await pool.query(
      'SELECT id, email, name, username, email_verified, google_linked, is_blocked, last_login, created_at, extra FROM users WHERE id = $1 AND app_id = $2',
      [decoded.userId, req.devApp.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    // Build editable permissions map
    const app = req.devApp || {};
    const extraFields = app.extra_fields || [];
    const editable = {
      name: (app.user_edit_permissions && app.user_edit_permissions.name) === true,
      username: (app.user_edit_permissions && app.user_edit_permissions.username) === true,
      email: (app.user_edit_permissions && app.user_edit_permissions.email) === true,
      extra: {}
    };
    for (const f of extraFields) {
      editable.extra[f.name] = !!f.editable_by_user;
    }

    res.json({
      success: true,
      data: result.rows[0],
      editable
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Access token is invalid or expired'
      });
    }

    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      message: 'Failed to retrieve user profile'
    });
  }
};

/**
 * Request password reset - sends reset email with token
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const app = req.devApp;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Save to password_resets table
    await pool.query(`
      INSERT INTO password_resets (
        user_id, token, expires_at, used, created_at
      ) VALUES (
        $1, $2, NOW() + INTERVAL '1 hour', false, NOW()
      )
    `, [user.id, resetToken]);

    // Send reset email
    const resetUrl = `${process.env.BACKEND_URL}/api/v1/auth/reset-password?token=${resetToken}`;
    sendMail({
      to: email,
      subject: 'Reset Your Password',
      html: buildPasswordResetEmail({ name: user.name, resetUrl, supportEmail: app.support_email }),
    }).catch(err => console.error('Send reset email error:', err));

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Reset request failed',
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Request change password link (frontend sends only email)
 */
const requestChangePasswordLink = async (req, res) => {
  try {
    const { email } = req.body;
    const app = req.devApp;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    // Check if email login is enabled
    if (!app.allow_email_signin) {
      return res.status(403).json({
        success: false,
        error: 'Feature disabled',
        message: 'Email/password change is not enabled for this app'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );

    // Always return success to avoid email enumeration
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If the email exists, a change password link has been sent'
      });
    }

    const user = result.rows[0];

    // Decide email type based on whether user has a password set
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Send Change Password link for accounts with existing password
    await pool.query(`
        INSERT INTO user_email_verifications (
          user_id, app_id, token, expires_at, created_at, verify_type
        ) VALUES (
         $1, $2, $3, NOW() + INTERVAL '24 hours', NOW(), 'Password change'
        )
      `, [user.id, app.id, verificationToken]);

    const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-change-password?token=${verificationToken}`;

    sendMail({
      to: user.email,
      subject: 'Change your password',
      html: buildChangePasswordLinkEmail({ appName: app.app_name, name: user.name, verificationUrl, supportEmail: app.support_email }),
    }).catch(err => console.error('Send change password link email error:', err));


    res.json({
      success: true,
      message: 'If the email exists, a change password link has been sent'
    });

  } catch (error) {
    console.error('Request change password link error:', error);
    res.status(500).json({
      success: false,
      error: 'Request failed',
      message: 'Failed to send change password link'
    });
  }
};

/**
 * Change password (requires current password)
 */
const changePassword = async (req, res) => {
  try {
    const { email } = req.body;
    const app = req.devApp;
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email is required'
      });
    }



    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE id = $1 AND app_id = $2',
      [decoded.userId, app.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    const user = result.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Log old password before updating
    await pool.query(`
      INSERT INTO user_password_history (
        user_id, old_password_hash, changed_at
      ) VALUES (
        $1, $2, NOW()
      )
    `, [user.id, user.password_hash]);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    sendMail({
      to: user.email,
      subject: 'Account password changed successfully',
      html: buildPasswordChangedEmail({ appName: app.app_name, changedAt: new Date().toLocaleString(), supportEmail: app.support_email }),
    }).catch(err => console.error('Send verification email error:', err));

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Access token is invalid or expired'
      });
    }

    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: 'Failed to change password'
    });
  }
};

/**
 * Resend verification email
 */
const resendVerification = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const app = req.devApp;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    const validPurposes = [
      'New Account',
      'Password change',
      'Profile Edit',
      'Forget Password',
      'Delete Account',
      'Set Password - Google User',
    ];

    const verifyPurpose =
      purpose && validPurposes.includes(purpose) ? purpose : 'New Account';

    // Find user
    const result = await pool.query(
      'SELECT id, email, name, email_verified FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with this email'
      });
    }

    const user = result.rows[0];

    if (user.email_verified && verifyPurpose === 'New Account') {
      return res.status(400).json({
        success: false,
        error: 'Already verified',
        message: 'Email is already verified'
      });
    }

    // Invalidate old tokens
    await pool.query(
      'UPDATE user_email_verifications SET used = true WHERE user_id = $1 AND used = false',
      [user.id]
    );

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await pool.query(`
      INSERT INTO user_email_verifications (
        user_id, app_id, token, expires_at, verify_type, created_at
      ) VALUES (
        $1, $2, $3, NOW() + INTERVAL '24 hours', $4, NOW()
      )
    `, [user.id, app.id, verificationToken, verifyPurpose]);

    // Send verification email
    const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-email?token=${verificationToken}`;
    sendMail({
      to: email,
      subject: 'Verify Your Email',
      html: buildEmailVerificationEmail({ name: user.name, verificationUrl, verifyPurpose, supportEmail: app.support_email }),
    }).catch(err => console.error('Send verification email error:', err));

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Resend failed',
      message: 'Failed to resend verification email'
    });
  }
};

/**
 * Show password reset form (GET)
 */
const resetPasswordPage = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Reset Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid Reset Link</h2>
          <p>The password reset link is invalid or missing the token.</p>
        </body>
        </html>
      `);
    }

    // Verify token exists and is not expired
    const result = await pool.query(`
      SELECT u.email, u.name, a.app_name
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      JOIN dev_apps a ON u.app_id = a.id
      WHERE pr.token = $1 AND pr.expires_at > NOW() AND pr.used = false
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expired Reset Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">Reset Link Expired</h2>
          <p>This password reset link has expired or has already been used.</p>
          <p>Please request a new password reset link.</p>
        </body>
        </html>
      `);
    }

    const { email, name, app_name } = result.rows[0];

    // Display password reset form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reset Password - ${app_name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 450px;
            width: 100%;
            padding: 40px;
          }
          h2 { color: #333; margin-bottom: 10px; text-align: center; }
          .subtitle { color: #666; text-align: center; margin-bottom: 30px; font-size: 14px; }
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px; }
          input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
          .btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
          }
          .btn:active { transform: translateY(0); }
          .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
          }
          .message {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
          }
          .message.error {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
          }
          .message.success {
            background: #efe;
            color: #3c3;
            border: 1px solid #cfc;
          }
          .password-strength {
            height: 4px;
            background: #e1e8ed;
            border-radius: 2px;
            margin-top: 8px;
            overflow: hidden;
          }
          .password-strength-bar {
            height: 100%;
            width: 0;
            transition: all 0.3s;
          }
          .strength-weak { background: #dc3545; width: 33%; }
          .strength-medium { background: #ffc107; width: 66%; }
          .strength-strong { background: #28a745; width: 100%; }
          .info-text { color: #666; font-size: 12px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reset Your Password</h2>
          <p class="subtitle">Hi ${name || email}, enter your new password below</p>
          
          <div id="message" class="message"></div>
          
          <!-- Progressive enhancement: works with or without JS -->
          <form id="resetForm" method="POST" action="/api/v1/auth/reset-password?token=${token}">
            <div class="form-group">
              <label for="password">New Password</label>
              <input type="password" id="password" name="password" required minlength="6" placeholder="Enter new password">
              <div class="password-strength">
                <div id="strengthBar" class="password-strength-bar"></div>
              </div>
              <p class="info-text">Minimum 6 characters</p>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm new password">
            </div>
            
            <button type="submit" class="btn" id="submitBtn">Reset Password</button>
          </form>
        </div>

        <script>
          const form = document.getElementById('resetForm');
          const passwordInput = document.getElementById('password');
          const confirmInput = document.getElementById('confirmPassword');
          const strengthBar = document.getElementById('strengthBar');
          const message = document.getElementById('message');
          const submitBtn = document.getElementById('submitBtn');
          const token = new URLSearchParams(window.location.search).get('token');

          // Password strength indicator
          passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            strengthBar.className = 'password-strength-bar';
            
            if (password.length < 6) {
              strengthBar.classList.add('strength-weak');
            } else if (password.length < 10) {
              strengthBar.classList.add('strength-medium');
            } else {
              strengthBar.classList.add('strength-strong');
            }
          });

          function showMessage(text, type) {
            message.textContent = text;
            message.className = 'message ' + type;
            message.style.display = 'block';
          }

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = passwordInput.value;
            const confirmPassword = confirmInput.value;

            if (password !== confirmPassword) {
              showMessage('Passwords do not match', 'error');
              return;
            }

            if (password.length < 6) {
              showMessage('Password must be at least 6 characters', 'error');
              return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Resetting...';

            try {
              // JS-enabled path: post without query and include token in body
              const response = await fetch(window.location.pathname, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password })
              });

              const data = await response.json();

              if (data.success) {
                showMessage(data.message, 'success');
                form.reset();
                setTimeout(() => {
                  window.location.href = 'about:blank';
                }, 2000);
              } else {
                showMessage(data.message || 'Failed to reset password', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
              }
            } catch (error) {
              showMessage('Network error. Please try again.', 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = 'Reset Password';
            }
          });
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Reset password page error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <h2 class="error">Something Went Wrong</h2>
        <p>An error occurred while processing your request. Please try again later.</p>
      </body>
      </html>
    `);
  }
};

/**
 * Complete password reset (POST)
 */
const completePasswordReset = async (req, res) => {
  try {

    const token = req.query.token || (req.body && req.body.token);
    // Accept both 'password' (form submission) and 'new_password' (JSON API)
    // console.log(req.body);

    let new_password = (req.body && req.body.new_password) || (req.body && req.body.password);

    // Sanitize and trim password
    if (typeof new_password === 'string') {
      new_password = new_password.trim().replace(/[\n\r\t]/g, '');
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Reset token is required'
      });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Password must be at least 6 characters'
      });
    }

    // Trim whitespace that may come from form submission
    const trimmedPassword = typeof new_password === 'string' ? new_password.trim() : '';
    if (trimmedPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Password must be at least 6 characters'
      });
    }

    // Find valid reset token and get current password
    const result = await pool.query(`
      SELECT pr.id, pr.user_id, u.password_hash, u.email
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.token = $1 AND pr.expires_at > NOW() AND pr.used = false
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'Reset token is invalid or expired'
      });
    }

    const resetRecord = result.rows[0];

    // Log old password to history
    await pool.query(`
      INSERT INTO user_password_history (
        user_id, old_password_hash, changed_at
      ) VALUES (
        $1, $2, NOW()
      )
    `, [resetRecord.user_id, resetRecord.password_hash]);

    // Hash new password (use trimmed version)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    // Update user password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, resetRecord.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_resets SET used = true WHERE id = $1',
      [resetRecord.id]
    );

    // Invalidate all other pending tokens for this user
    await pool.query(
      'UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false',
      [resetRecord.user_id]
    );

    sendMail({
      to: resetRecord.email,
      subject: 'Account password changed successfully',
      html: buildPasswordChangedEmail({ appName: app.app_name, changedAt: new Date().toLocaleString(), supportEmail: app.support_email }),
    }).catch(err => console.error('Send verification email error:', err));

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Complete password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Reset failed',
      message: 'Failed to reset password. Please try again.'
    });
  }
};

/**
 * Delete user account (requires password confirmation)
 */
const deleteAccount = async (req, res) => {
  try {
    const { email } = req.body;
    const app = req.devApp;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Invalid email'
      });
    }

    const user = result.rows[0];


    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await pool.query(`
      INSERT INTO user_email_verifications (
        user_id, app_id, token, expires_at, created_at, verify_type
      ) VALUES (
       $1, $2, $3, NOW() + INTERVAL '24 hours', NOW(), 'Delete Account'
      )
    `, [user.id, app.id, verificationToken]);

    // Send verification email (non-blocking)
    const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-delete-email?token=${verificationToken}`;

    sendMail({
      to: email,
      subject: 'Delete Your Account',
      html: buildDeleteAccountEmail({ appName: app.app_name, verificationUrl, supportEmail: app.support_email }),
    }).catch(err => console.error('Send verification email error:', err));

    // Soft delete: mark as deleted (recommended for data retention/compliance)


    // Optional: Hard delete (uncomment if you prefer complete removal)
    // await pool.query('DELETE FROM users WHERE id = $1', [user.id]);

    res.json({
      success: true,
      message: 'Account deletion email sent successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: 'Failed to send delete account email. Please try again.'
    });
  }
};

const verifyDeleteEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const { password } = req.body;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid Deletion Link</h2>
          <p>The account deletion link is invalid or missing the token.</p>
        </body>
        </html>
      `);
    }

    // Find verification record
    const result = await pool.query(`
      SELECT * FROM user_email_verifications
      WHERE token = $1 AND expires_at > NOW() AND used = false AND verify_type = 'Delete Account'
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expired Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">Deletion Link Expired</h2>
          <p>This account deletion link has expired or has already been used.</p>
          <p>Please request a new deletion link if you still wish to delete your account.</p>
        </body>
        </html>
      `);
    }

    const verification = result.rows[0];

    const appData = await pool.query(
      'SELECT app_name FROM dev_apps WHERE id = $1',
      [verification.app_id]
    );
    const app = appData.rows[0];

    const user_result = await pool.query(
      'SELECT id, name, username, email, created_at, password_hash, google_linked FROM users WHERE app_id = $1 AND id = $2',
      [verification.app_id, verification.user_id]
    );

    if (user_result.rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">User Not Found</h2>
          <p>The user associated with this deletion request does not exist.</p>
        </body>
        </html>
      `);
    }

    const user = user_result.rows[0];

    // If no password in request body, show the confirmation form (GET request)
    if (!password) {
      // Google-only users don't need password
      if (user.google_linked && !user.password_hash) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Confirm Account Deletion - ${app.app_name}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 500px;
                width: 100%;
                padding: 40px;
              }
              h2 { color: #dc3545; margin-bottom: 10px; text-align: center; }
              .subtitle { color: #666; text-align: center; margin-bottom: 30px; font-size: 14px; }
              .warning-box {
                background: #fff3cd;
                border: 2px solid #ffc107;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
              }
              .warning-box h3 {
                color: #856404;
                margin-bottom: 10px;
                font-size: 16px;
              }
              .warning-box ul {
                margin-left: 20px;
                color: #856404;
                font-size: 14px;
              }
              .warning-box li { margin-bottom: 8px; }
              .btn-group {
                display: flex;
                gap: 10px;
                margin-top: 20px;
              }
              .btn {
                flex: 1;
                padding: 14px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              }
              .btn-danger {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
              }
              .btn-danger:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(220, 53, 69, 0.3); }
              .btn-secondary {
                background: #f8f9fa;
                color: #495057;
                border: 2px solid #dee2e6;
              }
              .btn-secondary:hover { background: #e2e6ea; }
              .message {
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 20px;
                font-size: 14px;
                display: none;
              }
              .message.error { background: #fee; color: #c33; border: 1px solid #fcc; }
              .message.success { background: #efe; color: #3c3; border: 1px solid #cfc; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>⚠️ Confirm Account Deletion</h2>
              <p class="subtitle">Hi ${user.name || user.email}</p>
              
              <div id="message" class="message"></div>
              
              <div class="warning-box">
                <h3>This action cannot be undone!</h3>
                <ul>
                  <li>All your personal data will be permanently deleted</li>
                  <li>Your login history will be removed</li>
                  <li>You will not be able to recover your account</li>
                  <li>This process is irreversible</li>
                </ul>
              </div>
              
              <form id="deleteForm" method="POST">
                <div class="btn-group">
                  <button type="button" class="btn btn-secondary" onclick="window.close()">
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-danger" id="submitBtn">
                    Yes, Delete My Account
                  </button>
                </div>
              </form>
            </div>
            
            <script>
              const form = document.getElementById('deleteForm');
              const message = document.getElementById('message');
              const submitBtn = document.getElementById('submitBtn');
              
              function showMessage(text, type) {
                message.textContent = text;
                message.className = 'message ' + type;
                message.style.display = 'block';
              }
              
              form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                submitBtn.disabled = true;
                submitBtn.textContent = 'Deleting...';
                
                try {
                  const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: 'no-password-required' })
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    showMessage(data.message, 'success');
                    setTimeout(() => window.close(), 3000);
                  } else {
                    showMessage(data.message || 'Failed to delete account', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Yes, Delete My Account';
                  }
                } catch (error) {
                  showMessage('Network error. Please try again.', 'error');
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Yes, Delete My Account';
                }
              });
            </script>
          </body>
          </html>
        `);
      }

      // Show password confirmation form for users with passwords
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Confirm Account Deletion - ${app.app_name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              width: 100%;
              padding: 40px;
            }
            h2 { color: #dc3545; margin-bottom: 10px; text-align: center; }
            .subtitle { color: #666; text-align: center; margin-bottom: 30px; font-size: 14px; }
            .warning-box {
              background: #fff3cd;
              border: 2px solid #ffc107;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .warning-box h3 {
              color: #856404;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .warning-box ul {
              margin-left: 20px;
              color: #856404;
              font-size: 14px;
            }
            .warning-box li { margin-bottom: 8px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px; }
            input {
              width: 100%;
              padding: 12px 15px;
              border: 2px solid #e1e8ed;
              border-radius: 8px;
              font-size: 15px;
              transition: all 0.3s;
            }
            input:focus {
              outline: none;
              border-color: #dc3545;
              box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
            }
            .btn-group {
              display: flex;
              gap: 10px;
              margin-top: 20px;
            }
            .btn {
              flex: 1;
              padding: 14px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }
            .btn-danger {
              background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
              color: white;
            }
            .btn-danger:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(220, 53, 69, 0.3); }
            .btn-danger:disabled { background: #ccc; cursor: not-allowed; }
            .btn-secondary {
              background: #f8f9fa;
              color: #495057;
              border: 2px solid #dee2e6;
            }
            .btn-secondary:hover { background: #e2e6ea; }
            .message {
              padding: 12px;
              border-radius: 8px;
              margin-bottom: 20px;
              font-size: 14px;
              display: none;
            }
            .message.error { background: #fee; color: #c33; border: 1px solid #fcc; }
            .message.success { background: #efe; color: #3c3; border: 1px solid #cfc; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>⚠️ Confirm Account Deletion</h2>
            <p class="subtitle">Hi ${user.name || user.email}, enter your password to confirm</p>
            
            <div id="message" class="message"></div>
            
            <div class="warning-box">
              <h3>This action cannot be undone!</h3>
              <ul>
                <li>All your personal data will be permanently deleted</li>
                <li>Your login history will be removed</li>
                <li>You will not be able to recover your account</li>
                <li>This process is irreversible</li>
              </ul>
            </div>
            
            <form id="deleteForm" method="POST">
              <div class="form-group">
                <label for="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  placeholder="Enter your password to confirm"
                  autocomplete="current-password"
                >
              </div>
              
              <div class="btn-group">
                <button type="button" class="btn btn-secondary" onclick="window.close()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-danger" id="submitBtn">
                  Delete My Account
                </button>
              </div>
            </form>
          </div>
          
          <script>
            const form = document.getElementById('deleteForm');
            const passwordInput = document.getElementById('password');
            const message = document.getElementById('message');
            const submitBtn = document.getElementById('submitBtn');
            
            function showMessage(text, type) {
              message.textContent = text;
              message.className = 'message ' + type;
              message.style.display = 'block';
            }
            
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const password = passwordInput.value;
              
              if (!password) {
                showMessage('Password is required', 'error');
                return;
              }
              
              submitBtn.disabled = true;
              submitBtn.textContent = 'Deleting...';
              
              try {
                const response = await fetch(window.location.href, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  showMessage(data.message, 'success');
                  form.reset();
                  setTimeout(() => window.close(), 3000);
                } else {
                  showMessage(data.message || 'Failed to delete account', 'error');
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Delete My Account';
                }
              } catch (error) {
                showMessage('Network error. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Delete My Account';
              }
            });
          </script>
        </body>
        </html>
      `);
    }

    // POST request with password - proceed with deletion

    // Verify password if user has one
    if (user.password_hash) {
      const trimmedPassword = password.trim().replace(/[\n\r\t]/g, '');
      const isPasswordValid = await bcrypt.compare(trimmedPassword, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Password is incorrect'
        });
      }
    }

    // Delete user data from all related tables
    await pool.query(
      'INSERT INTO user_deletion_history (app_id, name, username, email, account_created_at, account_deleted_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [verification.app_id, user.name, user.username, user.email, user.created_at]
    );

    await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
    await pool.query('DELETE FROM user_password_history WHERE user_id = $1', [user.id]);
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    await pool.query('DELETE FROM user_login_history WHERE user_id = $1', [user.id]);
    await pool.query('UPDATE user_email_verifications SET used = true WHERE id = $1', [verification.id]);

    sendMail({
      to: user.email,
      subject: 'Account deleted successfully',
      html: buildAccountDeletedEmail({ appName: app.app_name, deletedAt: new Date().toLocaleString(), supportEmail: app.support_email }),
    }).catch(err => console.error('Send deletion confirmation email error:', err));

    res.json({
      success: true,
      message: 'Account deleted successfully. All your data has been permanently removed.'
    });

  } catch (error) {
    console.error('Verify delete email error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: 'Failed to process account deletion. Please try again.'
    });
  }
};

/**
 * Google OAuth login/register for end users
 */
const googleAuth = async (req, res) => {
  try {
    const { id_token, access_token } = req.body;
    const app = req.devApp;

    // Validation
    if (!id_token) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Google token is required (id_token or access_token)'
      });
    }

    // Check if Google sign-in is enabled
    if (!app.allow_google_signin) {
      return res.status(403).json({
        success: false,
        error: 'Feature disabled',
        message: 'Google sign-in is not enabled for this app'
      });
    }

    // Validate token with Google
    let googleUser;
    try {
      const tokenToVerify = id_token;
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`);

      if (!response.ok) {
        throw new Error('Invalid Google token');
      }

      googleUser = await response.json();

      // Verify the token is for this app's client ID (if configured)
      if (app.google_client_id && googleUser.aud !== app.google_client_id) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Token is not for this application'
        });
      }

    } catch (error) {
      console.error('Google token validation error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Failed to validate Google token'
      });
    }

    // Check if user exists by google_id
    let userResult = await pool.query(
      'SELECT * FROM users WHERE app_id = $1 AND google_id = $2',
      [app.id, googleUser.sub]
    );

    let user;
    let isNewUser = false;

    if (userResult.rows.length === 0) {
      // Check if email exists (link accounts)
      const emailResult = await pool.query(
        'SELECT * FROM users WHERE app_id = $1 AND email = $2',
        [app.id, googleUser.email?.toLowerCase()]
      );

      if (emailResult.rows.length > 0) {
        // Link Google to existing account
        user = emailResult.rows[0];

        await pool.query(`
          UPDATE users 
          SET google_linked = true, 
              google_id = $1, 
              email_verified = true,
              updated_at = NOW()
          WHERE id = $2
        `, [googleUser.sub, user.id]);

        user.google_linked = true;
        user.google_id = googleUser.sub;
        user.email_verified = true;

      } else {
        // Create new user
        const insertResult = await pool.query(`
          INSERT INTO users (
            app_id, email, name, google_id, google_linked,
            email_verified, is_blocked, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, true, true, false, NOW(), NOW()
          )
          RETURNING id, email, name, username, google_id, google_linked, email_verified, created_at
        `, [
          app.id,
          googleUser.email?.toLowerCase(),
          googleUser.name,
          googleUser.sub
        ]);

        user = insertResult.rows[0];
        isNewUser = true;

        // Invalidate old tokens
        await pool.query(
          'UPDATE user_email_verifications SET used = true WHERE user_id = $1 AND used = false',
          [user.id]
        );

        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        await pool.query(`
      INSERT INTO user_email_verifications (
        user_id, app_id, token, expires_at, verify_type, created_at
      ) VALUES (
        $1, $2, $3, NOW() + INTERVAL '1 day', $4, NOW()
      )
    `, [user.id, app.id, verificationToken, 'Set Password - Google User']);

        // Send verification email
        const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-email-set-password-google-user?token=${verificationToken}`;

        sendMail({
          to: googleUser.email?.toLowerCase(),
          subject: 'Welcome to ' + app.app_name,
          html: buildGoogleUserWelcomeEmail({ appName: app.app_name, email: googleUser.email?.toLowerCase(), verificationUrl, name: googleUser.name, supportEmail: app.support_email }),
        }).catch(err => console.error('Send welcome email error:', err));

      }
    } else {
      user = userResult.rows[0];
    }

    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({
        success: false,
        error: 'Account blocked',
        message: 'Your account has been blocked. Please contact support.'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Log login history
    await pool.query(`
      INSERT INTO user_login_history (
        user_id, app_id, login_method, ip_address, user_agent, login_time, created_at
      ) VALUES (
        $1, $2, 'google', $3, $4, NOW(), NOW()
      )
    `, [user.id, app.id, req.ip, req.headers['user-agent']]);

    // Determine access token TTL (per-app override, then env fallback, then default 7 days)
    const ttl = app.access_token_expires_seconds ? parseInt(app.access_token_expires_seconds, 10) : (process.env.ACCESS_TOKEN_EXPIRES_SECONDS ? parseInt(process.env.ACCESS_TOKEN_EXPIRES_SECONDS, 10) : 604800);

    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, appId: app.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: ttl }
    );

    res.json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          google_linked: user.google_linked,
          email_verified: user.email_verified,
          last_login: user.last_login,
          login_method: 'google',
          extra: user.extra || {}
        },
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: ttl,
        is_new_user: isNewUser
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Failed to authenticate with Google'
    });
  }
};

const setPasswordGoogleUser = async (req, res) => {
  try {
    const { email } = req.body;
    const app = req.devApp;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, name, email_verified, google_linked FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with this email'
      });
    }

    const user = result.rows[0];

    if (user.email_verified && user.password_hash) {
      return res.status(400).json({
        success: false,
        error: 'Already password set, try resetting password',
        message: 'Password is already set for this account. Please use the password reset option if you forgot your password.'
      });
    }

    if (!user.google_linked) {
      return res.status(400).json({
        success: false,
        error: 'Not a Google-linked account',
        message: 'This account is not linked with Google sign-in.'
      });
    }

    // Invalidate old tokens
    await pool.query(
      'UPDATE user_email_verifications SET used = true WHERE user_id = $1 AND used = false',
      [user.id]
    );

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await pool.query(`
      INSERT INTO user_email_verifications (
        user_id, app_id, token, expires_at, verify_type, created_at
      ) VALUES (
        $1, $2, $3, NOW() + INTERVAL '1 day', $4, NOW()
      )
    `, [user.id, app.id, verificationToken, 'Set Password - Google User']);

    // Send verification email
    const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-email-set-password-google-user?token=${verificationToken}`;
    sendMail({
      to: email,
      subject: 'Link to set your password',
      html: buildSetPasswordGoogleUserEmail({ appName: app.app_name, name: user.name, verificationUrl, supportEmail: app.support_email }),
    }).catch(err => console.error('Send set password email error:', err));

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Set password for Google user error:', error);
    res.status(500).json({
      success: false,
      error: 'Operation failed',
      message: 'Failed to set password. Please try again.'
    });
  }
};

const verifyEmailSetPasswordGoogleUser = async (req, res) => {
  try {
    const { token } = req.query;
    // const app = req.devApp;
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>

          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>

          <h2 class="error">Invalid Link</h2>
          <p>The password setup link is invalid or missing the token.</p>
        </body>
        </html>
      `);
    }
    // Find verification record
    const result = await pool.query(`
      SELECT * FROM user_email_verifications
      WHERE token = $1 AND expires_at > NOW() AND used = false AND verify_type = 'Set Password - Google User'
    `, [token]);
    if (result.rows.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expired Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">Link Expired</h2>
          <p>This password setup link has expired or has already been used.</p>
        </body>
        </html>
      `);
    }
    const verification = result.rows[0];

    // Handle POST: set password when user submits the form
    if (req.method === 'POST') {
      let { password } = req.body || {};
      if (typeof password === 'string') {
        password = password.trim().replace(/[\n\r\t]/g, '');
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Password must be at least 6 characters'
        });
      }

      // Get user
      const userRes = await pool.query(
        'SELECT id, email, password_hash FROM users WHERE id = $1 AND app_id = $2',
        [verification.user_id, verification.app_id]
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User does not exist'
        });
      }

      const user = userRes.rows[0];

      // If password already set, reject to avoid overwriting silently
      if (user.password_hash) {
        return res.status(400).json({
          success: false,
          error: 'Password already set',
          message: 'Password is already set. Use password reset instead.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );

      // Mark verification token as used
      await pool.query('UPDATE user_email_verifications SET used = true WHERE id = $1', [verification.id]);

      // Send confirmation email
      sendMail({
        to: user.email,
        subject: 'Password linked to your account',
        html: buildPasswordSetConfirmationEmail({ changedAt: new Date().toLocaleString(), supportEmail: 'Contact your app support.' }),
      }).catch(err => console.error('Send password setup confirmation email error:', err));

      return res.json({
        success: true,
        message: 'Password set successfully. You can now log in with your password.'
      });
    }

    // Render password setup form (GET)
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>

        <title>Set Your Password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
          }
          h2 { color: #007bff; margin-bottom: 10px; text-align: center; }
          .subtitle { color: #666; text-align: center; margin-bottom: 30px; font-size: 14px; }
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px; }
          input {

            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s;
          }
          input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
          }
          .btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            transition: all 0.2s;
          }
          .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0, 123, 255, 0.3); }
          .btn:disabled { background: #ccc; cursor: not-allowed; }
          .message {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
          }
          .message.error { background: #fee; color: #c33; border: 1px solid #fcc; }
          .message.success { background: #efe; color: #3c3; border: 1px solid #cfc; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Set Your Password</h2>
          <p class="subtitle">Please set your password to secure your account.</p>
          <div id="message" class="message"></div>
          <form id="setPasswordForm" method="POST">
            <div class="form-group
">              <label for="password">New Password</label>
              <input 
                type="password" 
                id="password"
                name="password"
                required
                placeholder="Enter your new password"
                autocomplete="new-password"
              >
            </div>
            <button type="submit" class="btn" id="submitBtn">

              Set Password
            </button>
          </form>
        </div>
        <script>
          const form = document.getElementById('setPasswordForm');
          const passwordInput = document.getElementById('password');
          const message = document.getElementById('message');
          const submitBtn = document.getElementById('submitBtn');
          function showMessage(text, type) {
            message.textContent = text;
            message.className = 'message ' + type;
            message.style.display = 'block';
          }
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = passwordInput.value;
            if (!password) {
              showMessage('Password is required', 'error');
              return;
            }
            submitBtn.disabled = true;  
            submitBtn.textContent = 'Setting...';
            try {
              const response = await fetch(window.location.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })  
              });
              const data = await response.json();
              if (data.success) {
                showMessage(data.message, 'success');
                form.reset();
                setTimeout(() => window.close(), 3000);
              } else {
                showMessage(data.message || 'Failed to set password', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Set Password';
              }
            } catch (error) { 
              showMessage('Network error. Please try again.', 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = 'Set Password';
            }
          });
        </script>
      </body>
        </html>
      `);

  } catch (error) {
    console.error('Verify email set password Google user error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>

        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <h2 class="error">Error</h2>
        <p>Failed to process your request. Please try again later.</p>
      </body> 
      </html>
    `);
  }
};


/**
 * Verify change password link and process GET/POST
 */
const verifyChangePassword = async (req, res) => {
  try {
    const { token } = req.query;
    const method = req.method;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid Link</h2>
          <p>The change password link is invalid or missing the token.</p>
        </body>
        </html>
      `);
    }

    const result = await pool.query(`
      SELECT * FROM user_email_verifications
      WHERE token = $1 AND expires_at > NOW() AND used = false AND verify_type = 'Password change'
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expired Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">Link Expired</h2>
          <p>This change password link has expired or has already been used.</p>
        </body>
        </html>
      `);
    }

    const verification = result.rows[0];

    const appData = await pool.query('SELECT app_name FROM dev_apps WHERE id = $1', [verification.app_id]);
    const app = appData.rows[0] || { app_name: 'your app' };

    const userRes = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE id = $1 AND app_id = $2',
      [verification.user_id, verification.app_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h2 class="error">User Not Found</h2>
          <p>The user associated with this request does not exist.</p>
        </body>
        </html>
      `);
    }

    const user = userRes.rows[0];

    // Handle POST: verify current password, set new password
    if (method === 'POST') {
      let { current_password, new_password, password, confirmPassword } = req.body || {};
      // Support both field names
      if (!new_password && password) new_password = password;

      if (typeof current_password === 'string') current_password = current_password.trim().replace(/[\n\r\t]/g, '');
      if (typeof new_password === 'string') new_password = new_password.trim().replace(/[\n\r\t]/g, '');
      if (typeof confirmPassword === 'string') confirmPassword = confirmPassword.trim().replace(/[\n\r\t]/g, '');

      if (!current_password || !new_password) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Current password and new password are required'
        });
      }

      if (new_password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'New password must be at least 6 characters'
        });
      }

      if (confirmPassword && new_password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Passwords do not match'
        });
      }

      if (!user.password_hash) {
        return res.status(400).json({
          success: false,
          error: 'No existing password',
          message: 'No password is set for this account. Use the set password option.'
        });
      }

      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
          message: 'Current password is incorrect'
        });
      }

      // Log old password
      await pool.query(`
        INSERT INTO user_password_history (user_id, old_password_hash, changed_at)
        VALUES ($1, $2, NOW())
      `, [user.id, user.password_hash]);

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(new_password, salt);

      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashed, user.id]);

      await pool.query('UPDATE user_email_verifications SET used = true WHERE id = $1', [verification.id]);

      sendMail({
        to: user.email,
        subject: 'Password changed successfully',
        html: buildPasswordChangedEmail({ appName: app.app_name, changedAt: new Date().toLocaleString(), supportEmail: app.support_email }),
      }).catch(err => console.error('Send change password confirmation email error:', err));

      return res.json({ success: true, message: 'Password changed successfully.' });
    }

    // GET: render HTML form
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Change Password - ${app.app_name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .container { background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; width: 100%; padding: 40px; }
          h2 { color: #2b7a0b; margin-bottom: 10px; text-align: center; }
          .subtitle { color: #666; text-align: center; margin-bottom: 30px; font-size: 14px; }
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px; }
          input { width: 100%; padding: 12px 15px; border: 2px solid #e1e8ed; border-radius: 8px; font-size: 15px; transition: all 0.3s; }
          input:focus { outline: none; border-color: #28a745; box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1); }
          .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
          .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(40, 167, 69, 0.3); }
          .btn:disabled { background: #ccc; cursor: not-allowed; }
          .message { padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; display: none; }
          .message.error { background: #fee; color: #c33; border: 1px solid #fcc; }
          .message.success { background: #efe; color: #3c3; border: 1px solid #cfc; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Change Your Password</h2>
          <p class="subtitle">Enter your current and new password</p>
          <div id="message" class="message"></div>
          <form id="changeForm" method="POST">
            <div class="form-group">
              <label for="current_password">Current Password</label>
              <input type="password" id="current_password" name="current_password" required autocomplete="current-password" placeholder="Enter current password">
            </div>
            <div class="form-group">
              <label for="new_password">New Password</label>
              <input type="password" id="new_password" name="new_password" required autocomplete="new-password" placeholder="Enter new password">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm new password">
            </div>
            <button type="submit" class="btn" id="submitBtn">Change Password</button>
          </form>
        </div>
        <script>
          const form = document.getElementById('changeForm');
          const currentEl = document.getElementById('current_password');
          const newEl = document.getElementById('new_password');
          const confirmEl = document.getElementById('confirmPassword');
          const message = document.getElementById('message');
          const submitBtn = document.getElementById('submitBtn');
          function showMessage(text, type) { message.textContent = text; message.className = 'message ' + type; message.style.display = 'block'; }
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const current_password = currentEl.value;
            const new_password = newEl.value;
            const confirmPassword = confirmEl.value;
            if (!current_password || !new_password) { showMessage('Current password and new password are required', 'error'); return; }
            if (new_password.length < 6) { showMessage('New password must be at least 6 characters', 'error'); return; }
            if (new_password !== confirmPassword) { showMessage('Passwords do not match', 'error'); return; }
            submitBtn.disabled = true; submitBtn.textContent = 'Changing...';
            try {
              const resp = await fetch(window.location.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password, new_password, confirmPassword }) });
              const data = await resp.json();
              if (data.success) { showMessage(data.message, 'success'); form.reset(); setTimeout(() => window.close(), 3000); }
              else { showMessage(data.message || 'Failed to change password', 'error'); submitBtn.disabled = false; submitBtn.textContent = 'Change Password'; }
            } catch (err) { showMessage('Network error. Please try again.', 'error'); submitBtn.disabled = false; submitBtn.textContent = 'Change Password'; }
          });
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Verify change password error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <h2 class="error">Something Went Wrong</h2>
        <p>An error occurred while processing your request. Please try again later.</p>
      </body>
      </html>
    `);
  }
};

/**
 * Patch user profile (may require verification)
 * PATCH /:apiKey/user/profile
 */
const patchUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    // console.log    console.log("log1 ", authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Access token is required' });
    }

    const token = authHeader.substring(7);
    // console.log    console.log(token);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid token', message: 'Access token invalid or expired' });
    }

    // Ensure app matches
    if (!req.devApp || req.devApp.id !== decoded.appId) {
      return res.status(403).json({ success: false, error: 'App mismatch', message: 'Token does not belong to this app' });
    }

    const userId = decoded.userId;
    // console.log("userId", userId);
    // Load user
    const userRes = await pool.query('SELECT id, email, name, username, extra FROM users WHERE id = $1 AND app_id = $2', [userId, req.devApp.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const user = userRes.rows[0];

    const body = req.body || {};
    const app = req.devApp;
    // console.log    console.log("body", body, "\n", "app", app);

    // Build editable map
    const extraFields = app.extra_fields || [];
    const editableExtra = {};
    for (const f of extraFields) editableExtra[f.name] = !!f.editable_by_user;
    const userEditPerm = app.user_edit_permissions || {};
    // console.log    console.log("editableExtra", editableExtra, "\n", "userEditPerm", userEditPerm);
    // Determine allowed updates
    const allowed = {};
    if (body.name !== undefined && userEditPerm.name === true) allowed.name = body.name;
    if (body.username !== undefined && userEditPerm.username === true) allowed.username = body.username;
    if (body.email !== undefined && userEditPerm.email === true) allowed.email = body.email;
    if (body.extra !== undefined && typeof body.extra === 'object') {
      const filtered = {};
      for (const k of Object.keys(body.extra)) {
        if (editableExtra[k]) filtered[k] = body.extra[k];
      }
      if (Object.keys(filtered).length > 0) allowed.extra = filtered;
    }

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ success: false, message: 'No editable fields provided or not permitted' });
    }

    // If email changed, create pending update and send verification to new email
    if (allowed.email && allowed.email.toLowerCase() !== user.email.toLowerCase()) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const payload = allowed;
      await pool.query(`
        INSERT INTO pending_user_updates (user_id, app_id, payload, email_target, token, expires_at, created_at)
        VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '24 hours', NOW())
      `, [userId, app.id, JSON.stringify(payload), allowed.email.toLowerCase(), verificationToken]);

      const verificationUrl = `${process.env.BACKEND_URL}/api/v1/user/confirm-update?token=${verificationToken}`;
      const changesSummary = Object.keys(allowed).join(', ');
      sendMail({ to: allowed.email, subject: 'Confirm profile changes', html: buildProfileUpdateVerificationEmail({ name: user.name, verificationUrl, changesSummary, supportEmail: app.support_email }) }).catch(err => console.error('Send profile update verification email error:', err));

      return res.status(202).json({ success: true, verification_required: true, message: 'Verification sent to new email address' });
    }

    // For non-email updates: apply immediately
    const updates = [];
    const params = [];
    let idx = 1;
    if (allowed.name !== undefined) { updates.push(`name = $${idx++}`); params.push(allowed.name); }
    if (allowed.username !== undefined) { updates.push(`username = $${idx++}`); params.push(allowed.username); }
    if (allowed.extra !== undefined) {
      // merge into jsonb
      updates.push(`extra = COALESCE(extra, '{}'::jsonb) || $${idx++}::jsonb`);
      params.push(JSON.stringify(allowed.extra));
    }
    if (updates.length > 0) {
      params.push(userId);
      await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);
    }

    res.json({ success: true, message: 'Profile updated' });

  } catch (error) {
    console.error('Patch user profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

/**
 * Confirm pending user update via token
 * GET /user/confirm-update?token=...
 */
const confirmUserUpdate = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

    const q = await pool.query('SELECT * FROM pending_user_updates WHERE token = $1 AND used = false AND expires_at > NOW()', [token]);
    if (q.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    const pending = q.rows[0];

    // Apply payload
    const payload = pending.payload || {};
    const updates = [];
    const params = [];
    let idx = 1;
    if (payload.name !== undefined) { updates.push(`name = $${idx++}`); params.push(payload.name); }
    if (payload.username !== undefined) { updates.push(`username = $${idx++}`); params.push(payload.username); }
    if (payload.email !== undefined) { updates.push(`email = $${idx++}`); params.push(payload.email.toLowerCase()); updates.push(`email_verified = true`); }
    if (payload.extra !== undefined) { updates.push(`extra = COALESCE(extra, '{}'::jsonb) || $${idx++}::jsonb`); params.push(JSON.stringify(payload.extra)); }

    if (updates.length > 0) {
      params.push(pending.user_id);
      await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);
    }

    // mark pending used
    await pool.query('UPDATE pending_user_updates SET used = true WHERE id = $1', [pending.id]);

    // respond with simple success page
    res.send(`
      <html><body>
      <h2>Profile changes confirmed</h2>
      <p>Your profile changes have been applied.</p>
      </body></html>
    `);

  } catch (error) {
    console.error('Confirm user update error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm update' });
  }
};

module.exports = {
  verifyAppCredentials,
  registerUser,
  loginUser,
  verifyEmail,
  getUserProfile,
  patchUserProfile,
  requestPasswordReset,
  requestChangePasswordLink,
  resetPasswordPage,
  completePasswordReset,
  changePassword,
  verifyChangePassword,
  resendVerification,
  deleteAccount,
  verifyDeleteEmail,
  googleAuth,
  setPasswordGoogleUser,
  verifyEmailSetPasswordGoogleUser,
  verifyChangePassword,
  verifyAccessToken,
  confirmUserUpdate
};