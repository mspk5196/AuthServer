import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './src/app.js';
import './src/config/db.js';

const PORT = process.env.PORT || 5050;
const server = http.createServer(app);

app.set('trust proxy', 1);

app.get('/', (req, res) => {
  res.send('✅ OK - Auth Server Running');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
