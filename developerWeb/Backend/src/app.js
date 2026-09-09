const path = require('path');
const appDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(appDir, '.env.local') });
require('dotenv').config({ path: path.join(appDir, '.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes.js');
const cPanelRoutes = require('./routes/cPanelRoutes.js');
const paymentController = require('./controllers/paymentController.js');
const { getRedis } = require('./config/redisClient.js');

// v2 routes
const planRoutesV2       = require('./routes/v2/planRoutesV2.js');
const paymentRoutesV2    = require('./routes/v2/paymentRoutesV2.js');
const transactionRoutes  = require('./routes/v2/transactionRoutes.js');
const feedbackRoutes     = require('./routes/v2/feedbackRoutes.js');
const usageRoutes        = require('./routes/v2/usageRoutes.js');

// Initialize Redis connection (no-op if fallback is used)
getRedis().catch(console.error);

const app = express();

const API_VERSION = process.env.API_VERSION || 'v1';

// Dynamic CORS handling: In production, Nginx/reverse proxy handles CORS headers.
// Express CORS is enabled for local development or when explicitly enabled via ENABLE_CORS=true.
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CORS === 'true') {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.BASE_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:4001',
    'http://localhost:4002',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
        origin.endsWith('.mspkapps.in')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  }));
}

// Capture raw body for webhook HMAC signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);
 
// simple request logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Razorpay webhook — intentionally unversioned (Razorpay callback URL is fixed)
app.post('/api/razorpay/webhook', paymentController.handleWebhook);

// ── Stable versionless Google OAuth callback (never changes regardless of API_VERSION) ──
app.get('/api/developer/auth/google/callback', require('./controllers/authController').googleCallback);

// ── Route Mounts (Mount across configured API_VERSION, v1, and v2 aliases) ───
// IMPORTANT: v2-specific routes must be mounted BEFORE authRoutes so they win on overlapping paths (e.g. /plans, /my-plan)
const developerPrefixes = Array.from(new Set([
  `/api/${API_VERSION}/developer`,
  '/api/v1/developer',
  '/api/v2/developer',
]));

const cpanelPrefixes = Array.from(new Set([
  `/api/${API_VERSION}/cpanel`,
  '/api/v1/cpanel',
  '/api/v2/cpanel',
]));

developerPrefixes.forEach((prefix) => {
  app.use(prefix, planRoutesV2);
  app.use(prefix, paymentRoutesV2);
  app.use(prefix, transactionRoutes);
  app.use(prefix, feedbackRoutes);
  app.use(prefix, usageRoutes);
  app.use(prefix, authRoutes);
});

cpanelPrefixes.forEach((prefix) => {
  app.use(prefix, cPanelRoutes);
});

// block all non-API routes
app.use((req, res, next) => {
  if (
    req.path === '/health' ||
    req.path === '/'
  ) {
    return next();
  }

  if (!req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }

  next();
});

// error handler (simple)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
