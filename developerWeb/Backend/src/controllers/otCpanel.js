const crypto = require('crypto');
const { getRedis } = require('../config/redisClient');
const { verifyToken } = require('../middleware/auth');
const pool = require('../config/db');

// Create short-lived, single-use ticket in Redis
const createCpanelTicket = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Fallback to access_token cookie if no Authorization header
    if (!token && req.headers.cookie) {
      const cookies = Object.fromEntries(req.headers.cookie.split(';').map(c => c.trim().split('=').map(decodeURIComponent)));
      token = cookies['access_token'] || cookies['access-token'] || cookies['accessToken'] || null;
    }

    if (!token) return res.status(401).json({ success: false, message: 'Missing access token' });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'developer') {
      return res.status(401).json({ success: false, message: 'Invalid access token' });
    }

    // Optional sanity check
    const { rows } = await pool.query(
      `SELECT id, email_verified, is_blocked FROM developers WHERE id = $1`,
      [payload.userId]
    );
    if (rows.length === 0 || rows[0].is_blocked || !rows[0].email_verified) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

  const ticket = crypto.randomUUID();
    const key = `cpanel:ticket:${ticket}`;
    const ttlSeconds = 60; 

    // NX ensures no overwrite; EX sets TTL
  const redis = await getRedis();
  const ok = await redis.set(key, JSON.stringify({ developerId: payload.userId }), { EX: ttlSeconds, NX: true });
    if (ok !== 'OK') {
      return res.status(500).json({ success: false, message: 'Could not create ticket' });
    }

    const base = (process.env.CPANEL_URL).replace(/\/$/, '');
    const cpanelUrl = `${base}/sso/${ticket}`;
    console.log('[cPanelTicket] created URL:', cpanelUrl);
    return res.status(201).json({
      success: true,
      data: {
        url: cpanelUrl,
        expiresIn: ttlSeconds
      }
    });
  } catch (err) {
    console.error('Create cPanel ticket error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

// Redeem ticket (single-use) — called by cPanel backend
const redeemCpanelTicket = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Missing token' });

    const key = `cpanel:ticket:${token}`;

    // Atomically read-and-delete (prevents reuse). Use sendCommand for wide compatibility.
    const redis = await getRedis();
    // Prefer getdel (polyfilled in redis client), fallback to GETDEL if available
    let payloadStr;
    if (typeof redis.getdel === 'function') {
      payloadStr = await redis.getdel(key);
    } else {
      payloadStr = await redis.sendCommand(['GETDEL', key]);
    }
    if (!payloadStr) {
      return res.status(410).json({ success: false, message: 'Ticket invalid or expired' });
    }

    const { developerId } = JSON.parse(payloadStr);

    // Final check against DB (still not blocked/verified)
    const devRes = await pool.query(
      `SELECT id, email, name, username, email_verified, is_blocked FROM developers WHERE id = $1`,
      [developerId]
    );
    if (
      devRes.rows.length === 0 ||
      devRes.rows[0].is_blocked ||
      !devRes.rows[0].email_verified
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.status(200).json({
      success: true,
      data: { developer: { id: devRes.rows[0].id, email: devRes.rows[0].email, name: devRes.rows[0].name, username: devRes.rows[0].username } }
    });
  } catch (err) {
    console.error('Redeem cPanel ticket error:', err);
    return res.status(500).json({ success: false, message: 'Redeem failed' });
  }
};

module.exports = {
  createCpanelTicket,
  redeemCpanelTicket
};