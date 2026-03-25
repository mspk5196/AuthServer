const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const client = require('prom-client');

const authRoutes = require('./routes/authRoutes.js');
const cPanelRoutes = require('./routes/cPanelRoutes.js');
const paymentController = require('./controllers/paymentController.js');
const { getRedis } = require('./config/redisClient.js');
// Initialize Redis connection (no-op if fallback is used)
getRedis().catch(console.error);

const app = express();
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

// collect default metrics (CPU, memory, etc.)
client.collectDefaultMetrics();

// custom metric: request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
});

// middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
  });

  next();
});

// metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Razorpay webhook (must be before json parsing for raw body)
app.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// routes
app.use('/api/developer', authRoutes);
app.use('/api/cpanel', cPanelRoutes);
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
