const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes.js');
const settingsRoutes = require('./routes/settingsRoutes.js');
const appRoutes = require('./routes/appRoutes.js');
const publicApiRoutes = require('./routes/publicApiRoutes.js');

const app = express();

// Robust CORS: echo request origin when allowed (cannot use '*' with credentials)
const normalizeOrigin = (o) => (o ? o.replace(/\/$/, '') : '');
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://authservices.mspkapps.in',
  'https://cpanel.authservices.mspkapps.in',
  'https://cpanel.backend.mspkapps.in',
].filter(Boolean).map(normalizeOrigin);

const corsConfig = {
  origin: function (origin, callback) {
    const normalized = normalizeOrigin(origin);
    if (!origin) return callback(null, true); // non-browser or tools
    if (allowedOrigins.includes(normalized)) return callback(null, true);
    console.warn('[CORS] blocked origin:', origin);
    return callback(new Error('CORS not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Secret', 'X-Requested-With', 'Accept', 'Origin', 'x-csrf-token'],
  exposedHeaders: ['x-csrf-token'],
  credentials: true,
  maxAge: 600,
};

// Defensive: ensure only a single Access-Control-Allow-Origin header is ever set
app.use((req, res, next) => {
  const origSet = res.setHeader;
  res.setHeader = function (name, value) {
    if (name && String(name).toLowerCase() === 'access-control-allow-origin') {
      const existing = res.getHeader('Access-Control-Allow-Origin');
      if (existing) {
        // prefer existing single origin if present
        let v = existing;
        if (Array.isArray(v)) v = String(v[0]);
        if (typeof v === 'string' && v.indexOf(',') !== -1) v = v.split(',')[0].trim();
        return origSet.call(this, 'Access-Control-Allow-Origin', String(v));
      }
      if (Array.isArray(value)) value = String(value[0]);
      if (typeof value === 'string' && value.indexOf(',') !== -1) value = value.split(',')[0].trim();
    }
    return origSet.call(this, name, value);
  };
  next();
});

app.use(cors(corsConfig));
app.options(/.*/, cors(corsConfig));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
