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

// app.use(cors({
//   origin: "*",
//   credentials: true, 
// }));

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
