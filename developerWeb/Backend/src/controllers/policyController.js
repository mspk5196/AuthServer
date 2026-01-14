const pool = require('../config/db');

/**
 * Get all active policies (terms, privacy, refund, etc.)
 * This is public so it can be used on register/login pages.
 */
const getActivePolicies = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, key, title, content, version, is_active, created_at, updated_at
       FROM dev_policies
       WHERE is_active = true
       ORDER BY id ASC`
    );

    return res.status(200).json({
      success: true,
      data: { policies: result.rows },
    });
  } catch (error) {
    console.error('Get active policies error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch policies',
      error: error.message,
    });
  }
};

module.exports = {
  getActivePolicies,
};
