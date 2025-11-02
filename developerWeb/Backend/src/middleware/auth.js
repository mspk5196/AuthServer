const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Generate JWT tokens
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
    issuer: 'mspk-apps-admin',
    audience: 'mspk-apps-users'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'mspk-apps-admin',
    audience: 'mspk-apps-users'
  });

  return { accessToken, refreshToken };
};

/**
 * Verify JWT token
 */
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret, {
      issuer: 'mspk-apps-admin',
      audience: 'mspk-apps-users'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * JWT Authentication Middleware
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'NO_TOKEN'
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT Authentication Error:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'INVALID_TOKEN'
    });
  }
};

/**
 * Admin Role Middleware
 */
const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NO_AUTH'
      });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        error: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    next();
  } catch (error) {
    console.error('Admin Authorization Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authorization error',
      error: 'AUTH_ERROR'
    });
  }
};

/**
 * Refresh Token Middleware
 */
const verifyRefreshToken = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
        error: 'NO_REFRESH_TOKEN'
      });
    }

    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Refresh Token Error:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid refresh token',
      error: 'INVALID_REFRESH_TOKEN'
    });
  }
};

module.exports = {
  generateTokens,
  verifyToken,
  authenticateToken,
  requireAdmin,
  verifyRefreshToken
};
