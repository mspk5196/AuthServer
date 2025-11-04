const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes.js');
const cPanelRoutes = require('./routes/cPanelRoutes.js');
const { getRedis } = require('./config/redisClient.js');
// Initialize Redis connection (no-op if fallback is used)
getRedis().catch(console.error);

const app = express();
app.use(cors({
  origin: "http://localhost:5173", // specify exact frontend origin
  credentials: true,               // allow cookies and credentials
}));
app.use(express.json());
app.use(helmet());

// simple request logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// routes
app.use('/api/developer', authRoutes);
app.use('/api/cpanel', cPanelRoutes);

// error handler (simple)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
