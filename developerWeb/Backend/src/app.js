const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes.js');
const cPanelRoutes = require('./routes/cPanelRoutes.js');
const paymentController = require('./controllers/paymentController.js');
const { getRedis } = require('./config/redisClient.js');
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
