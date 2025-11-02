const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const verifyDeveloper = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Missing token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const { id, email } = decoded;

    // Activate developer
    await query('UPDATE developers SET is_active = ?, updated_at = NOW(), activated_at = NOW() WHERE id = ? AND email = ?', [true, id, email]);

    res.json({ success: true, message: 'Account verified successfully!' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, message: 'Verification link expired' });
    }
    return res.status(400).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { verifyDeveloper };
