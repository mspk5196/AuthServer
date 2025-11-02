const bcrypt = require('bcryptjs');
const { generateTokens, verifyToken } = require('../middleware/auth');
const connection = require('../config/db');
const { promisify } = require('util');
require('dotenv').config();

// Promisify database query
const query = promisify(connection.query).bind(connection);

/**
 * User registration (Admin only)
 */
const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    
    console.log('Registration request body:', req.body);
    console.log('Extracted fields:', { name, username, email, password: password ? '***' : undefined });

    // Validate required fields
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'VALIDATION_ERROR',
        required: ['name', 'username', 'email', 'password']
      });
    }

    // Check if user already exists
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists',
        error: 'USER_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await query(
      'INSERT INTO users (name, username, email, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [name, username, email, hashedPassword, 'developer', true]
    );

    console.log('User created successfully:', { id: result.insertId, email, username });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: result.insertId,
          name,
          username,
          email,
          role: 'developer'
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: 'REGISTRATION_ERROR'
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
    const users = await query(
      'SELECT id, email, password, name, role, is_active, failed_login_attempts, locked_until FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }

    const user = users[0];

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
      const lockUntil = failedAttempts >= 5 ? 'DATE_ADD(NOW(), INTERVAL 30 MINUTE)' : 'NULL';

      await query(
        `UPDATE users SET failed_login_attempts = ?, locked_until = ${lockUntil}, updated_at = NOW() WHERE id = ?`,
        [failedAttempts, user.id]
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS',
        attemptsRemaining: Math.max(0, 5 - failedAttempts)
      });
    }

    // Reset failed login attempts on successful login
    await query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW(), updated_at = NOW() WHERE id = ?',
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
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
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
