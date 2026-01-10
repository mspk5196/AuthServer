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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// simple request logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Razorpay webhook (must be before json parsing for raw body)
app.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// routes
app.use('/api/developer', authRoutes);
app.use('/api/cpanel', cPanelRoutes);

// error handler (simple)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
