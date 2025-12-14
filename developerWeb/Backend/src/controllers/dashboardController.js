const pool = require('../config/db');

/**
 * Get high-level dashboard stats for a developer
 */
const getDashboardStats = async (req, res) => {
  try {
    const developerId = req.user.userId;

    // Total apps for this developer
    const appsResult = await pool.query(
      'SELECT COUNT(*) as count FROM dev_apps WHERE developer_id = $1',
      [developerId]
    );
    const totalApps = parseInt(appsResult.rows[0]?.count || 0, 10);

    // Total users across all apps
    let totalUsers = 0;
    try {
      const usersResult = await pool.query(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         JOIN dev_apps a ON u.app_id = a.id
         WHERE a.developer_id = $1`,
        [developerId]
      );
      totalUsers = parseInt(usersResult.rows[0]?.count || 0, 10);
    } catch (err) {
      console.warn('Dashboard stats: users table not available, skipping user count');
    }

    // Today's API calls
    let todayApiCalls = 0;
    let monthApiCalls = 0;
    try {
      const todayCallsResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM dev_api_calls
         WHERE developer_id = $1
           AND DATE(created_at) = CURRENT_DATE`,
        [developerId]
      );
      todayApiCalls = parseInt(todayCallsResult.rows[0]?.count || 0, 10);

      const monthCallsResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM dev_api_calls
         WHERE developer_id = $1
           AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
        [developerId]
      );
      monthApiCalls = parseInt(monthCallsResult.rows[0]?.count || 0, 10);
    } catch (err) {
      console.warn('Dashboard stats: dev_api_calls table not available, skipping API call counts');
    }

    return res.status(200).json({
      success: true,
      data: {
        totalApps,
        totalUsers,
        todayApiCalls,
        monthApiCalls,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
};
