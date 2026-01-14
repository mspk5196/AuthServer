const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Generate JWT tokens
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
    issuer: 'mspk-apps-auth',
    audience: 'mspk-apps-auth-developers'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'mspk-apps-auth',
    audience: 'mspk-apps-auth-developers'
  });

  return { accessToken, refreshToken };
};

/**
 * Verify JWT token
 */
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret, {
      issuer: 'mspk-apps-auth',
      audience: 'mspk-apps-auth-developers'
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
    // Prefer Authorization header
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Fallback to cookie-based tokens (cpanel_access_token or older names)
    if (!token && req.headers.cookie) {
      const cookies = Object.fromEntries(req.headers.cookie.split(';').map(c => c.trim().split('=').map(decodeURIComponent)));
      token = cookies['cpanel_access_token'] || cookies['cpanel-access_token'] || cookies['cpanel_access-token'] || cookies['access_token'] || cookies['access-token'] || null;
    }

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
  verifyRefreshToken
};
