const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { passwordEncryptAES, passwordDecryptAES } = require('../utils/decryptAES');
const { sendMail } = require('../utils/mailer');
const { log } = require('console');

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
    `, [app.id, email.toLowerCase(), hashedPassword, name, username]);

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

    if (user.email_verified === false) {
      return res.status(403).json({
        success: false,
        error: 'Account not verified',
        message: 'Your account has not been verified. Please check your email for the verification link.'
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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save to user_password_change
    await pool.query(`
      INSERT INTO user_password_change (
        id, user_id, app_id, token, expires_at, change_type, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, 'Forget', NOW()
      )
    `, [user.id, app.id, resetToken, expiresAt]);

    // Send reset email
    const resetUrl = `${process.env.BACKEND_URL}/api/v1/auth/reset-password?token=${resetToken}`;
    sendMail({
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
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
 * Change password (requires current password)
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const app = req.devApp;
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

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

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Log password change
    await pool.query(`
      INSERT INTO user_password_change (
        id, user_id, app_id, change_type, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Request', NOW()
      )
    `, [user.id, app.id]);

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

    const validPurposes = ['New Account', 'Password change', 'Profile Edit'];
    const verifyPurpose = purpose && validPurposes.includes(purpose) ? purpose : 'New Account';

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
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(`
      INSERT INTO user_email_verifications (
        id, user_id, app_id, token, expires_at, verify_type, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
      )
    `, [user.id, app.id, verificationToken, expiresAt, verifyPurpose]);

    // Send verification email
    const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-email?token=${verificationToken}`;
    sendMail({
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h2>Email Verification</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
        <p>Purpose: ${verifyPurpose}</p>
      `
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
      FROM user_password_change pc
      JOIN users u ON pc.user_id = u.id
      JOIN dev_apps a ON pc.app_id = a.id
      WHERE pc.token = $1 AND pc.expires_at > NOW() AND pc.change_type = 'Forget'
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
          
          <form id="resetForm">
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
              const response = await fetch(window.location.pathname + window.location.search, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: password })
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
    const { token } = req.query;
    const { new_password } = req.body;

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

    // Find valid reset token
    const result = await pool.query(`
      SELECT pc.id, pc.user_id, pc.app_id
      FROM user_password_change pc
      WHERE pc.token = $1 AND pc.expires_at > NOW() AND pc.change_type = 'Forget'
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'Reset token is invalid or expired'
      });
    }

    const resetRecord = result.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update user password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, resetRecord.user_id]
    );

    // Delete used token (one-time use)
    await pool.query(
      'DELETE FROM user_password_change WHERE id = $1',
      [resetRecord.id]
    );

    // Invalidate all other pending tokens for this user
    await pool.query(
      'DELETE FROM user_password_change WHERE user_id = $1 AND change_type = \'Forget\'',
      [resetRecord.user_id]
    );

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
    const { email, password } = req.body;
    const app = req.devApp;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE app_id = $1 AND email = $2',
      [app.id, email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Soft delete: mark as deleted (recommended for data retention/compliance)
    await pool.query(
      'UPDATE users SET is_blocked = true, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Optional: Hard delete (uncomment if you prefer complete removal)
    // await pool.query('DELETE FROM users WHERE id = $1', [user.id]);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: 'Failed to delete account'
    });
  }
};

module.exports = {
  verifyAppCredentials,
  registerUser,
  loginUser,
  verifyEmail,
  getUserProfile,
  requestPasswordReset,
  resetPasswordPage,
  completePasswordReset,
  changePassword,
  resendVerification,
  deleteAccount
};