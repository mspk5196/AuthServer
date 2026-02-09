const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const app = require('./src/app.js');
const db = require('./src/config/db.js');

// Default to 5001 to align with cPanel Web dev config; override with PORT env as needed
const PORT = process.env.PORT;
const server = http.createServer(app);

app.set('trust proxy', 1);

app.get('/', (req, res) => {
  res.send('✅ OK - Auth Server Running');
});
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
