const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes.js');
const settingsRoutes = require('./routes/settingsRoutes.js');
const appRoutes = require('./routes/appRoutes.js');
const publicApiRoutes = require('./routes/publicApiRoutes.js');

const app = express();

// Robust CORS: allow localhost:5173 and :5174 and optional FRONTEND_URL (normalize trailing slashes)
const normalizeOrigin = (o) => (o ? o.replace(/\/$/, '') : o);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean).map(normalizeOrigin);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow mobile apps / curl
    const o = normalizeOrigin(origin);
    if (allowedOrigins.includes(o)) {
      return callback(null, true); // reflect request origin
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  exposedHeaders: ['x-csrf-token'],
  credentials: true,
}));

// Handle preflight for all routes (Express 5: avoid '*' path-to-regexp)
app.options(/.*/, cors());
app.use(express.json());
app.use(helmet());

// simple request logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// routes
app.use('/api/developer', authRoutes);
app.use('/api/developer', settingsRoutes);
app.use('/api/developer/apps', appRoutes);
app.use('/api/v1', publicApiRoutes);

// error handler (simple)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
