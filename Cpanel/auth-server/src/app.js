const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes.js');
const settingsRoutes = require('./routes/settingsRoutes.js');
const appRoutes = require('./routes/appRoutes.js');
const publicApiRoutes = require('./routes/publicApiRoutes.js');

const app = express();

// Robust CORS setup
const normalizeOrigin = (o) => (o ? o.replace(/\/$/, '') : o);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://authservices.mspkapps.in',
  'https://cpanel.authservices.mspkapps.in',
  'https://cpanel.backend.mspkapps.in', // backend domain if front-end may embed assets
].filter(Boolean).map(normalizeOrigin);

const allowedHeaders = [
  'Content-Type',
  'Authorization',
  'X-API-Key',
  'X-API-Secret',
  'X-Requested-With',
  'Accept',
  'Origin',
  'x-csrf-token'
];

const corsConfig = {
  origin: function (origin, callback) {
    const normalized = normalizeOrigin(origin);
    if (!origin || allowedOrigins.includes(normalized)) {
      if (origin) {
        console.log(`[CORS] allow origin: ${origin}`);
      } else {
        console.log('[CORS] allow non-browser/no-origin request');
      }
      return callback(null, true);
    }
    console.warn(`[CORS] blocked origin: ${origin}`);
    return callback(new Error('CORS not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders,
  exposedHeaders: ['x-csrf-token'],
  credentials: true,
  maxAge: 600
};

app.use((req, res, next) => {
  // Preflight debugging
  if (req.method === 'OPTIONS') {
    console.log('[CORS][Preflight] Origin:', req.headers.origin, 'Req-Headers:', req.headers['access-control-request-headers']);
  }
  next();
});

// app.use(cors(corsConfig));
// Explicit preflight handler reusing same config
app.options(/.*/, cors(corsConfig));
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
