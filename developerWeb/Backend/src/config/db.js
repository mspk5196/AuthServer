const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'auth_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully!');
    const res = await client.query('SELECT NOW() AS now');
    console.log('⏰ DB Time:', res.rows[0].now);
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:');
    console.error('   ↳', err.message);
  }
})();

pool.on('error', (err) => {
  console.error('⚠️  Unexpected DB error:', err.message);
});

module.exports = pool;
