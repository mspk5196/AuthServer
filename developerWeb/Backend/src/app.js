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

// Initialize Redis connection (no-op if fallback is used)
getRedis().catch(console.error);

const app = express();

const API_VERSION = process.env.API_VERSION || 'v1';

app.use(express.json());
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
app.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// ── v1 routes (version controlled via API_VERSION env var) ──────────────────
app.use(`/api/${API_VERSION}/developer`, authRoutes);
app.use(`/api/${API_VERSION}/cpanel`, cPanelRoutes);

// ── v2 routes (hardcoded — new/changed endpoints for v2 features) ───────────
// Also mount existing auth+cpanel routes at v2 so frontend can point to /api/v2
app.use('/api/v2/developer', authRoutes);
app.use('/api/v2/cpanel', cPanelRoutes);
// New v2-specific endpoints
app.use('/api/v2/developer', planRoutesV2);
app.use('/api/v2/developer', paymentRoutesV2);
app.use('/api/v2/developer', transactionRoutes);
app.use('/api/v2/developer', feedbackRoutes);

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

app.use(express.json());
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
app.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// routes
app.use(`/api/${API_VERSION}/developer`, authRoutes);
app.use(`/api/${API_VERSION}/cpanel`, cPanelRoutes);
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
