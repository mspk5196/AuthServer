const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateTokens, verifyToken } = require('../middleware/auth');
const pool = require('../config/db');
const { promisify } = require('util');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
const { passwordEncryptAES } = require('../utils/decryptAES')
const { sendMail } = require("../utils/mailer.js");
const { 
  buildVerifyAccountEmail, 
  buildPasswordChangeRequestEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail 
} = require('../templates/emailTemplates');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * User registration (Admin only)
 */
const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const existingUserName = await pool.query("SELECT id FROM developers WHERE username = $1", [username]);
    const existingUsers = await pool.query("SELECT id FROM developers WHERE email = $1", [email]);

    if (existingUserName.rows.length > 0)
      return res.status(409).json({ success: false, message: "Username already taken" });

    if (existingUsers.rows.length > 0)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const encryptAES = passwordEncryptAES(password);
    const finalHashedPassword = await bcrypt.hash(encryptAES, 12);

    const result = await pool.query(
      `INSERT INTO developers (name, username, email, password_hash, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`,
      [name, username, email, finalHashedPassword, false]
    );

    const userId = result.rows[0].id;

    const token = jwt.sign(
      { id: userId, email },
      process.env.VERIFY_EMAIL_SECRET,
      { expiresIn: "5m" }
    );

    const verifyLink = `${process.env.BACKEND_URL}/api/developer/verify?token=${token}`;

    const mailResponse = await sendMail({
      to: email,
      subject: "Verify your Developer Account",
      html: buildVerifyAccountEmail({ name, verifyLink }),
    });

    if (!mailResponse.success) {
      console.error("Verification mail sending failed:", mailResponse.error);
      return res.status(500).json({
        success: false,
        message: "Registration successful but failed to send verification email",
      });
    }

    await pool.query(
      `UPDATE dev_email_verifications SET used = true WHERE id = $1`,
      [userId]
    );

    // console.log("Verification email sent:", email);
    await pool.query(
      `INSERT INTO dev_email_verifications (dev_id, token, expires_at, used, created_at, verify_type)
       VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING id`,
      [userId, token, new Date(Date.now() + 5 * 60 * 1000), false, 'New Account']
    );

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Verification link sent to your email (valid for 5 minutes).",
      data: { id: userId, name, username, email },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
      error: error.message,
    });
  }
};



/**
 * Developer login
 */
const developerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find developer
    const developers = await pool.query(
      'SELECT id, email, password_hash, name, username, email_verified, is_blocked, failed_login_attempts, locked_until FROM developers WHERE email = $1',
      [email]
    );

    if (developers.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }

    const developer = developers.rows[0];

    // Check if account is blocked
    if (developer.is_blocked) {
      return res.status(403).json({
        success: false,
        message: 'This email is blocked. Please contact support.',
        error: 'ACCOUNT_BLOCKED'
      });
    }

    // Check if account is locked due to failed attempts
    if (developer.locked_until && new Date() < new Date(developer.locked_until)) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts',
        error: 'ACCOUNT_LOCKED'
      });
    }

    // Verify password
    const encryptedPassword = passwordEncryptAES(password);
    const isValidPassword = await bcrypt.compare(encryptedPassword, developer.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (developer.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

      await pool.query(
        `UPDATE developers SET failed_login_attempts = $1, locked_until = $2, updated_at = NOW() WHERE id = $3`,
        [failedAttempts, lockUntil, developer.id]
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS',
        attemptsRemaining: Math.max(0, 5 - failedAttempts)
      });
    }

    // Check if email is verified
    if (!developer.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        error: 'EMAIL_NOT_VERIFIED',
        email: developer.email
      });
    }

    // Reset failed login attempts on successful login
    await pool.query(
      'UPDATE developers SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1',
      [developer.id]
    );

    // Track login history
    await pool.query(
      'INSERT INTO dev_login_history (developer_id, login_at, login_ip) VALUES ($1, NOW(), $2)',
      [developer.id, req.ip]
    );

    // Generate tokens
    const tokenPayload = {
      userId: developer.id,
      email: developer.email,
      name: developer.name,
      username: developer.username,
      role: 'developer',
      iat: Math.floor(Date.now() / 1000)
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // Store refresh token in database
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
      [developer.id, refreshToken]
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: developer.id,
          email: developer.email,
          name: developer.name,
          username: developer.username,
          email_verified: developer.email_verified,
          role: 'developer'
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Developer login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: 'LOGIN_ERROR'
    });
  }
};

/**
 * Resend verification email
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find developer
    const developers = await pool.query(
      'SELECT id, email, name, email_verified, is_blocked FROM developers WHERE email = $1',
      [email]
    );

    if (developers.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email',
      });
    }

    const developer = developers.rows[0];

    // Check if account is blocked
    if (developer.is_blocked) {
      return res.status(403).json({
        success: false,
        message: 'This email is blocked. Please contact support.',
      });
    }

    // Check if already verified
    if (developer.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. You can sign in.',
      });
    }

    // Generate new verification token
    const token = jwt.sign(
      { id: developer.id, email: developer.email },
      process.env.VERIFY_EMAIL_SECRET,
      { expiresIn: "5m" }
    );

    const verifyLink = `${process.env.BACKEND_URL}/api/developer/verify?token=${token}`;

    const mailResponse = await sendMail({
      to: developer.email,
      subject: "Verify your Developer Account",
      html: buildVerifyAccountEmail({ name: developer.name, verifyLink }),
    });

    if (!mailResponse.success) {
      console.error("Verification mail sending failed:", mailResponse.error);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    console.log("Verification email resent:", developer.email);

    res.status(200).json({
      success: true,
      message: "Verification email sent! Please check your inbox (valid for 5 minutes).",
    });

  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


/**
 * Request password change - sends email with link
 */
const requestPasswordChange = async (req, res) => {
  try {
    const developerId = req.user.userId;

    // Get developer details
    const developerResult = await pool.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [developerId]
    );

    if (developerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found',
      });
    }

    const developer = developerResult.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: developer.id, email: developer.email, purpose: 'password-change' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await pool.query(
      `UPDATE dev_password_change_tokens SET used = true WHERE dev_id = $1`,
      [developer.id]
    );
    // Save token to database
    await pool.query(
      `INSERT INTO dev_password_change_tokens (dev_id, token, expires_at, used, created_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour', false, NOW())`,
      [developer.id, token]
    );

    const changeUrl = `${process.env.BACKEND_URL}/api/developer/change-password?token=${token}`;

    const mailResponse = await sendMail({
      to: developer.email,
      subject: 'Password Change Request',
      html: buildPasswordChangeRequestEmail({ name: developer.name, changeUrl }),
    });

    if (!mailResponse.success) {
      console.error('Password change email sending failed:', mailResponse.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password change email',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password change link sent to your email (valid for 1 hour)',
    });

  } catch (error) {
    console.error('Request password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};


/**
 * Change password with token - HTML form and POST handler
 */
const changePasswordWithToken = async (req, res) => {
  try {
    // Support token from query, body, or header to handle proxy quirks
    const token = req.query?.token || req.body?.token || req.headers['x-token'];

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid Request</h2>
          <p>No token provided.</p>
        </body>
        </html>
      `);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid or Expired Token</h2>
          <p>This password change link has expired or is invalid.</p>
        </body>
        </html>
      `);
    }

    // Check if token exists in database and is not used
    const tokenResult = await pool.query(
      'SELECT id, dev_id, used, expires_at FROM dev_password_change_tokens WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid Token</h2>
          <p>This password change link is invalid.</p>
        </body>
        </html>
      `);
    }

    const tokenRecord = tokenResult.rows[0];

    if (tokenRecord.used) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Token Already Used</h2>
          <p>This password change link has already been used.</p>
        </body>
        </html>
      `);
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Token Expired</h2>
          <p>This password change link has expired.</p>
        </body>
        </html>
      `);
    }

    // Get developer details
    const developerResult = await pool.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [tokenRecord.dev_id]
    );

    if (developerResult.rows.length === 0) {
      return res.status(404).send('<h2>Developer not found</h2>');
    }

    const developer = developerResult.rows[0];

    // Handle POST request to change password
    if (req.method === 'POST') {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
        });
      }

      // Verify current password
      const encryptedCurrentPassword = passwordEncryptAES(currentPassword);
      const passwordResult = await pool.query(
        'SELECT password_hash FROM developers WHERE id = $1',
        [developer.id]
      );

      const isValidPassword = await bcrypt.compare(
        encryptedCurrentPassword,
        passwordResult.rows[0].password_hash
      );

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Hash new password
      const encryptedNewPassword = passwordEncryptAES(newPassword);
      const hashedNewPassword = await bcrypt.hash(encryptedNewPassword, 12);

      // Update password
      await pool.query(
        'UPDATE developers SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, developer.id]
      );

      // Mark token as used
      await pool.query(
        'UPDATE dev_password_change_tokens SET used = true WHERE id = $1',
        [tokenRecord.id]
      );

      // Send confirmation email
      await sendMail({
        to: developer.email,
        subject: 'Password Changed Successfully',
        html: buildPasswordChangedEmail({ 
          name: developer.name, 
          changedAt: new Date().toLocaleString() 
        }),
      }).catch(err => console.error('Send password changed email error:', err));

      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    }

    // GET request - render HTML form
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Change Password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
            padding: 40px;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          h2 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
          }
          .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            color: #555;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
          }
          input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
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
            transition: transform 0.2s;
          }
          .btn:hover {
            transform: translateY(-2px);
          }
          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .message {
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
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
          .info-text {
            color: #666;
            font-size: 12px;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Change Password</h2>
          <p class="subtitle">Hi ${developer.name}, enter your current and new password</p>
          
          <div id="message" class="message"></div>
          
          <form id="changePasswordForm">
            <input type="hidden" id="token" value="${token}">
            
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input 
                type="password" 
                id="currentPassword" 
                name="currentPassword" 
                required 
                placeholder="Enter current password"
              >
            </div>
            
            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input 
                type="password" 
                id="newPassword" 
                name="newPassword" 
                required 
                minlength="6"
                placeholder="Enter new password"
              >
              <p class="info-text">Minimum 6 characters</p>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword" 
                required 
                minlength="6"
                placeholder="Confirm new password"
              >
            </div>
            
            <button type="submit" class="btn" id="submitBtn">Change Password</button>
          </form>
        </div>

        <script>
          const form = document.getElementById('changePasswordForm');
          const messageDiv = document.getElementById('message');
          const submitBtn = document.getElementById('submitBtn');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = document.getElementById('token').value;
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate passwords match
            if (newPassword !== confirmPassword) {
              showMessage('Passwords do not match', 'error');
              return;
            }

            if (newPassword.length < 6) {
              showMessage('New password must be at least 6 characters', 'error');
              return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Changing...';

            try {
              const response = await fetch(window.location.href, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, currentPassword, newPassword }),
              });

              const data = await response.json();

              if (data.success) {
                showMessage('Password changed successfully! You can close this window.', 'success');
                form.reset();
                setTimeout(() => {
                  window.close();
                }, 2000);
              } else {
                showMessage(data.message || 'Failed to change password', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Change Password';
              }
            } catch (error) {
              showMessage('Network error. Please try again.', 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = 'Change Password';
            }
          });

          function showMessage(text, type) {
            messageDiv.textContent = text;
            messageDiv.className = 'message ' + type;
            messageDiv.style.display = 'block';
          }
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Change password with token error:', error);
    res.status(500).send('<h2>Internal server error</h2>');
  }
};


/**
 * Request password reset (forgot password)
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find developer
    const developerResult = await pool.query(
      'SELECT id, email, name FROM developers WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (developerResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    }

    const developer = developerResult.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: developer.id, email: developer.email, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save token to database
    await pool.query(
      `INSERT INTO dev_password_reset_tokens (dev_id, token, expires_at, used, created_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour', false, NOW())`,
      [developer.id, token]
    );

    const resetUrl = `${process.env.BACKEND_URL}/api/developer/reset-password?token=${token}`;

    const mailResponse = await sendMail({
      to: developer.email,
      subject: 'Reset Your Password',
      html: buildPasswordResetEmail({ name: developer.name, resetUrl }),
    });

    if (!mailResponse.success) {
      console.error('Password reset email sending failed:', mailResponse.error);
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    });

  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};


/**
 * Reset password with token - HTML form and POST handler
 */
const resetPasswordWithToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid Request</h2>
          <p>No token provided.</p>
        </body>
        </html>
      `);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid or Expired Token</h2>
          <p>This password reset link has expired or is invalid.</p>
        </body>
        </html>
      `);
    }

    // Check if token exists in database and is not used
    const tokenResult = await pool.query(
      'SELECT id, dev_id, used, expires_at FROM dev_password_reset_tokens WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Invalid Token</h2>
          <p>This password reset link is invalid.</p>
        </body>
        </html>
      `);
    }

    const tokenRecord = tokenResult.rows[0];

    if (tokenRecord.used) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Token Already Used</h2>
          <p>This password reset link has already been used.</p>
        </body>
        </html>
      `);
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; max-width: 500px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2 class="error">Token Expired</h2>
          <p>This password reset link has expired.</p>
        </body>
        </html>
      `);
    }

    // Get developer details
    const developerResult = await pool.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [tokenRecord.dev_id]
    );

    if (developerResult.rows.length === 0) {
      return res.status(404).send('<h2>Developer not found</h2>');
    }

    const developer = developerResult.rows[0];

    // Handle POST request to reset password
    if (req.method === 'POST') {
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password is required',
        });
      }

      // Hash new password
      const encryptedNewPassword = passwordEncryptAES(newPassword);
      const hashedNewPassword = await bcrypt.hash(encryptedNewPassword, 12);

      // Update password
      await pool.query(
        'UPDATE developers SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, developer.id]
      );

      // Mark token as used
      await pool.query(
        'UPDATE dev_password_reset_tokens SET used = true WHERE id = $1',
        [tokenRecord.id]
      );

      // Send confirmation email
      await sendMail({
        to: developer.email,
        subject: 'Password Reset Successful',
        html: buildPasswordChangedEmail({ 
          name: developer.name, 
          changedAt: new Date().toLocaleString() 
        }),
      }).catch(err => console.error('Send password reset confirmation email error:', err));

      return res.json({
        success: true,
        message: 'Password reset successfully',
      });
    }

    // GET request - render HTML form
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reset Password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
            padding: 40px;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          h2 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
          }
          .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            color: #555;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
          }
          input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
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
            transition: transform 0.2s;
          }
          .btn:hover {
            transform: translateY(-2px);
          }
          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .message {
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
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
          .info-text {
            color: #666;
            font-size: 12px;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reset Password</h2>
          <p class="subtitle">Hi ${developer.name}, enter your new password</p>
          
          <div id="message" class="message"></div>
          
          <form id="resetPasswordForm">
            <input type="hidden" id="token" value="${token}">
            
            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input 
                type="password" 
                id="newPassword" 
                name="newPassword" 
                required 
                minlength="6"
                placeholder="Enter new password"
              >
              <p class="info-text">Minimum 6 characters</p>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword" 
                required 
                minlength="6"
                placeholder="Confirm new password"
              >
            </div>
            
            <button type="submit" class="btn" id="submitBtn">Reset Password</button>
          </form>
        </div>

        <script>
          const form = document.getElementById('resetPasswordForm');
          const messageDiv = document.getElementById('message');
          const submitBtn = document.getElementById('submitBtn');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate passwords match
            if (newPassword !== confirmPassword) {
              showMessage('Passwords do not match', 'error');
              return;
            }

            if (newPassword.length < 6) {
              showMessage('Password must be at least 6 characters', 'error');
              return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Resetting...';

            try {
              const token = document.getElementById('token').value;
              const response = await fetch(window.location.href, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword }),
              });

              const data = await response.json();

              if (data.success) {
                showMessage('Password reset successfully! Redirecting to login...', 'success');
                form.reset();
                setTimeout(() => {
                  window.location.href = '${process.env.FRONTEND_URL}/login';
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

          function showMessage(text, type) {
            messageDiv.textContent = text;
            messageDiv.className = 'message ' + type;
            messageDiv.style.display = 'block';
          }
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Reset password with token error:', error);
    res.status(500).send('<h2>Internal server error</h2>');
  }
};


/**
 * Google OAuth login - initiate
 */
const googleLogin = async (req, res) => {
  const redirectUrl = `${process.env.BACKEND_URL}/api/developer/auth/google/callback`;
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(authUrl);
};


/**
 * Google OAuth callback
 */
const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BACKEND_URL}/api/developer/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.id_token) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_token`);
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    if (!email) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
    }

    // Check if developer exists
    let developer;
    const existingDeveloper = await pool.query(
      'SELECT * FROM developers WHERE email = $1',
      [email]
    );

    if (existingDeveloper.rows.length > 0) {
      developer = existingDeveloper.rows[0];

      // Update Google ID if not set
      if (!developer.google_id) {
        await pool.query(
          'UPDATE developers SET google_id = $1, email_verified = true, updated_at = NOW() WHERE id = $2',
          [googleId, developer.id]
        );
        developer.google_id = googleId;
        developer.email_verified = true;
      }
    } else {
      // Create new developer with Google account
      const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5);
      
      const result = await pool.query(
        `INSERT INTO developers (name, username, email, google_id, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW()) RETURNING *`,
        [name || 'Developer', username, email, googleId]
      );

      developer = result.rows[0];
    }

    // Check if account is blocked
    if (developer.is_blocked) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=blocked`);
    }

    // Track login history
    await pool.query(
      'INSERT INTO dev_login_history (developer_id, login_at, login_ip) VALUES ($1, NOW(), $2)',
      [developer.id, req.ip]
    );

    // Generate JWT tokens
    const tokenPayload = {
      userId: developer.id,
      email: developer.email,
      name: developer.name,
      username: developer.username,
      role: 'developer',
      iat: Math.floor(Date.now() / 1000)
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // Store refresh token in database
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
      [developer.id, refreshToken]
    );

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/login?` +
      `token=${encodeURIComponent(accessToken)}&` +
      `refreshToken=${encodeURIComponent(refreshToken)}`;

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};


module.exports = {
  register,
  developerLogin,
  resendVerificationEmail,
  requestPasswordChange,
  changePasswordWithToken,
  requestPasswordReset,
  resetPasswordWithToken,
  googleLogin,
  googleCallback,
};
