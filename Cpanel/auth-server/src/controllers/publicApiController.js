const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { passwordEncryptAES } = require('../utils/decryptAES');
const { sendMail } = require('../utils/mailer');

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
 * Register a new user
 */
const registerUser = async (req, res) => {
  try {
    const { email, password, name, username } = req.body;
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
      'SELECT id FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email exists',
        message: 'A user with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const encryptedPassword = passwordEncryptAES(hashedPassword);

    // Create user
    const result = await pool.query(`
      INSERT INTO users (
        id, app_id, email, password_hash, name, username,
        email_verified, google_linked, is_blocked,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, false, false, false, NOW(), NOW()
      )
      RETURNING id, email, name, username, email_verified, created_at
    `, [app.id, email.toLowerCase(), encryptedPassword, name, username]);

    const user = result.rows[0];

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(`
      INSERT INTO user_email_verifications (
        id, user_id, app_id, token, expires_at, created_at, verify_type
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, NOW(), 'New Account'
      )
    `, [user.id, app.id, verificationToken, expiresAt]);

    // Send verification email (non-blocking)
    const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-email?token=${verificationToken}`;

    sendMail({
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h2>Welcome to ${app.app_name}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      `
    }).catch(err => console.error('Send verification email error:', err));

    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, appId: app.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
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
          created_at: user.created_at
        },
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 604800 // 7 days in seconds
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
      'SELECT * FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = result.rows[0];

    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({
        success: false,
        error: 'Account blocked',
        message: 'Your account has been blocked. Please contact support.'
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
        id, user_id, app_id, login_method, ip_address, user_agent, login_time
      ) VALUES (
        gen_random_uuid(), $1, $2, 'email', $3, $4, NOW()
      )
    `, [user.id, app.id, req.ip, req.headers['user-agent']]);

    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, appId: app.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
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
          last_login: user.last_login
        },
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 604800
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
    const app = req.devApp;

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
      WHERE app_id = $1 AND token = $2 AND expires_at > NOW() AND used = 0
    `, [app.id, token]);

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
    await pool.query('UPDATE user_email_verifications SET used = 1 WHERE id = $1', [verification.id]);

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

/**
 * Get user profile (requires authentication)
 */
const getUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user info
    const result = await pool.query(
      'SELECT id, email, name, username, email_verified, google_linked, is_blocked, last_login, created_at FROM users WHERE id = $1 AND app_id = $2',
      [decoded.userId, req.devApp.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
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

module.exports = {
  verifyAppCredentials,
  registerUser,
  loginUser,
  verifyEmail,
  getUserProfile
};