const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verifyDeveloper = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Missing token' });

    const decoded = jwt.verify(token, process.env.VERIFY_EMAIL_SECRET || 'your_jwt_secret');
    const { id, email } = decoded;

    // Activate developer (email_verified is the correct column)
    await pool.query('UPDATE developers SET email_verified = $1, updated_at = NOW(), activated_at = NOW(), is_active = true WHERE id = $2 AND email = $3', [true, id, email]);
    await pool.query(
      `UPDATE dev_email_verifications SET used = $1, updated_at = NOW() WHERE dev_id = $2 AND token = $3`,
      [true, id, token]
    );
    res.json({ success: true, message: 'Account verified successfully!' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, message: 'Verification link expired' });
    }
    return res.status(400).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { verifyDeveloper };
