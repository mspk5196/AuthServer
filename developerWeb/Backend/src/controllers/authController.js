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
      `INSERT INTO developers (name, username, email, password_hash, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`,
      [name, username, email, finalHashedPassword, false]
    );

    const userId = result.rows[0].id;

    const token = jwt.sign(
      { id: userId, email },
      process.env.VERIFY_EMAIL_SECRET,
      { expiresIn: "5m" }
    );

    const verifyLink = `http://localhost:5000/api/developer/verify?token=${token}`;

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

    console.log("Verification email sent:", email);

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
 * User login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const users = await pool.query(
      'SELECT id, email, password, name, role, is_active, failed_login_attempts, locked_until FROM users WHERE email = $1',
      [email]
    );

    if (users.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }

    const user = users.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts',
        error: 'ACCOUNT_LOCKED'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled',
        error: 'ACCOUNT_DISABLED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

      await pool.query(
        `UPDATE users SET failed_login_attempts = $1, locked_until = $2, updated_at = NOW() WHERE id = $3`,
        [failedAttempts, lockUntil, user.id]
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS',
        attemptsRemaining: Math.max(0, 5 - failedAttempts)
      });
    }

    // Reset failed login attempts on successful login
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // Store refresh token in database
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: 'LOGIN_ERROR'
    });
  }
};

module.exports = {
  register,
  login
};
