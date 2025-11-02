import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import devRoutes from './routes/dev.routes.js';
import appRoutes from './routes/app.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import authRoutes from './routes/auth.routes.js';
import passwordRoutes from './routes/password.routes.js';
import googleRoutes from './routes/google.routes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

// simple request logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// routes
app.use('/api/dev', devRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/tenant', tenantRoutes);

// error handler (simple)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
