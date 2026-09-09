const path = require('path');
const dotenv = require('dotenv');
const appDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(appDir, '.env.local') });
dotenv.config({ path: path.join(appDir, '.env') });
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes.js');
const settingsRoutes = require('./routes/settingsRoutes.js');
const appRoutes = require('./routes/appRoutes.js');
const publicApiRoutes = require('./routes/publicApiRoutes.js');
const groupSettingsRoutes = require('./routes/groupSettingsRoutes.js');

const app = express();

const API_VERSION = process.env.API_VERSION || 'v1';

// Dynamic CORS handling: In production, Nginx/reverse proxy handles CORS headers.
// Express CORS is enabled for local development or when explicitly enabled via ENABLE_CORS=true.
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CORS === 'true') {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
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

// Trust reverse proxy (nginx/Docker) so req.ip returns the real client IP from X-Forwarded-For
app.set('trust proxy', true);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// simple request logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// routes
app.use(`/api/${API_VERSION}/developer`, authRoutes);
app.use(`/api/${API_VERSION}/developer`, settingsRoutes);
app.use(`/api/${API_VERSION}/developer/apps`, appRoutes);
app.use(`/api/${API_VERSION}/developer/group-settings`, groupSettingsRoutes);
app.use(`/api/${API_VERSION}`, publicApiRoutes);

// error handler (simple)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
