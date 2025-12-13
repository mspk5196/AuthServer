const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateTokens, verifyToken } = require('../middleware/auth');
const pool = require('../config/db');
const { promisify } = require('util');
require('dotenv').config();
const { passwordEncryptAES } = require('../utils/decryptAES')
const { sendMail } = require("../utils/mailer.js");

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

    // const verifyLink = `http://localhost:5000/api/developer/verify?token=${token}`;
    const verifyLink = `${process.env.BACKEND_URL}/api/developer/verify?token=${token}`;

    // Send verification email
     const emailHTML = `
      <h2>Verify your Developer Account</h2>
      <p>Hello ${name},</p>
      <p>Click the link below to verify your account (valid for <b>5 minutes</b>):</p>
      <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">Verify My Account</a>
      <br /><br />
      <p>If you did not register, please ignore this email.</p>
    `;

    const mailResponse = await sendMail({
      to: email,
      subject: "Verify your Developer Account",
      html: emailHTML,
    });

    if (!mailResponse.success) {
      console.error("Verification mail sending failed:", mailResponse.error);
      return res.status(500).json({
        success: false,
        message: "Registration successful but failed to send verification email",
      });
    }

    // console.log("Verification email sent:", email);
    await pool.query(
      `INSERT INTO dev_email_verifications (dev_id, token, expires_at, used, created_at, verify_type)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6) RETURNING id`,
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

    const verifyLink = `http://localhost:5000/api/developer/verify?token=${token}`;

    const emailHTML = `
      <h2>Verify your Developer Account</h2>
      <p>Hello ${developer.name},</p>
      <p>Click the link below to verify your account (valid for <b>5 minutes</b>):</p>
      <a href="${verifyLink}" target="_blank" style="color:#1a73e8;">Verify My Account</a>
      <br /><br />
      <p>If you did not request this, please ignore this email.</p>
    `;

    const mailResponse = await sendMail({
      to: developer.email,
      subject: "Verify your Developer Account",
      html: emailHTML,
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


module.exports = {
  register,
  developerLogin,
  resendVerificationEmail
};
