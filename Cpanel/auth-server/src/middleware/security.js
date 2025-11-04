const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

/**
 * Rate limiting configuration
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: message || 'Too many requests from this IP, please try again later.',
      error: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      console.log(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

/**
 * General API rate limiter
 */
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many API requests'
);

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts'
);

/**
 * Helmet security configuration
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'https://mspkapps.in',
      'https://admin.mspkapps.in',
      'https://accounts.google.com'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Temporarily allow all origins for Google OAuth
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  exposedHeaders: ['x-csrf-token']
};

/**
 * Input validation middleware
 */
const validateInput = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        error: 'VALIDATION_ERROR'
      });
    }
    next();
  };
};

/**
 * Common validation rules
 */
const validationRules = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  // Credential (Google id_token) validation
  credential: body('credential')
    .exists()
    .withMessage('Credential is required')
    .isString()
    .withMessage('Credential must be a string')
    .isLength({ min: 10 })
    .withMessage('Credential looks too short'),
  
  sanitizeString: (field) => body(field)
    .trim()
    .escape()
    .isLength({ min: 1, max: 1000 })
    .withMessage(`${field} must be between 1 and 1000 characters`),

  // Accept emails as either a pasted string or an array, normalize to string
  emailsPasted: body('emails')
    .customSanitizer((value) => {
      if (Array.isArray(value)) return value.join(',');
      if (typeof value === 'string') return value;
      return '';
    })
    .isString()
    .withMessage('emails must be a string or array')
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip} - User-Agent: ${userAgent}`);
  
  // Log sensitive endpoint access
  if (req.url.includes('/auth') || req.url.includes('/admin')) {
    console.log(`[SECURITY] Sensitive endpoint accessed: ${req.method} ${req.url} from ${ip}`);
  }
  
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  helmetConfig,
  corsOptions,
  validateInput,
  validationRules,
  securityHeaders,
  securityLogger,
  createRateLimiter
};
