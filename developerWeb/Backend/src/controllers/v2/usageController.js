const pool = require('../../config/db');

/**
 * GET /usage/history
 * Query params:
 *   groupBy: 'app' | 'group' | 'daily' | 'weekly' | 'monthly' | 'yearly'  (default: 'daily')
 *   startDate: ISO date string  (default: 30 days ago)
 *   endDate:   ISO date string  (default: today)
 *   appId:     UUID (optional filter by app)
 *   groupId:   UUID (optional filter by group)
 */
const getUsageHistory = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { groupBy = 'daily', startDate, endDate, appId, groupId } = req.query;

    const validGroupBy = ['app', 'group', 'daily', 'weekly', 'monthly', 'yearly'];
    if (!validGroupBy.includes(groupBy)) {
      return res.status(400).json({ success: false, message: `groupBy must be one of: ${validGroupBy.join(', ')}` });
    }

    // Default date range: last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Clamp to reasonable range (max 2 years)
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    const params = [developerId, start.toISOString(), end.toISOString()];
    let paramIndex = 4; // next param index

    // Optional filters
    const filterClauses = [];
    if (appId) {
      filterClauses.push(`dac.app_id = $${paramIndex}`);
      params.push(appId);
      paramIndex++;
    }
    if (groupId) {
      filterClauses.push(`da.group_id = $${paramIndex}`);
      params.push(groupId);
      paramIndex++;
    }
    const extraWhere = filterClauses.length ? `AND ${filterClauses.join(' AND ')}` : '';

    let selectExpr, groupExpr, orderExpr;

    if (groupBy === 'app') {
      selectExpr = `dac.app_id AS id, da.name AS label`;
      groupExpr = `dac.app_id, da.name`;
      orderExpr = `call_count DESC`;
    } else if (groupBy === 'group') {
      selectExpr = `ag.id, COALESCE(ag.name, 'No Group') AS label`;
      groupExpr = `ag.id, ag.name`;
      orderExpr = `call_count DESC`;
    } else if (groupBy === 'daily') {
      selectExpr = `DATE(dac.created_at) AS period, TO_CHAR(DATE(dac.created_at), 'YYYY-MM-DD') AS label`;
      groupExpr = `DATE(dac.created_at)`;
      orderExpr = `period ASC`;
    } else if (groupBy === 'weekly') {
      selectExpr = `DATE_TRUNC('week', dac.created_at) AS period, TO_CHAR(DATE_TRUNC('week', dac.created_at), 'YYYY-MM-DD') AS label`;
      groupExpr = `DATE_TRUNC('week', dac.created_at)`;
      orderExpr = `period ASC`;
    } else if (groupBy === 'monthly') {
      selectExpr = `DATE_TRUNC('month', dac.created_at) AS period, TO_CHAR(DATE_TRUNC('month', dac.created_at), 'Mon YYYY') AS label`;
      groupExpr = `DATE_TRUNC('month', dac.created_at)`;
      orderExpr = `period ASC`;
    } else {
      // yearly
      selectExpr = `DATE_TRUNC('year', dac.created_at) AS period, TO_CHAR(DATE_TRUNC('year', dac.created_at), 'YYYY') AS label`;
      groupExpr = `DATE_TRUNC('year', dac.created_at)`;
      orderExpr = `period ASC`;
    }

    const query = `
      SELECT
        ${selectExpr},
        COUNT(*) AS call_count,
        COUNT(CASE WHEN dac.status_code >= 200 AND dac.status_code < 300 THEN 1 END) AS success_count,
        COUNT(CASE WHEN dac.status_code >= 400 THEN 1 END) AS error_count,
        ROUND(AVG(dac.response_time_ms)::numeric, 2) AS avg_response_ms
      FROM dev_api_calls dac
      JOIN dev_apps da ON da.id = dac.app_id
      LEFT JOIN app_groups ag ON ag.id = da.group_id
      WHERE dac.developer_id = $1
        AND dac.created_at BETWEEN $2 AND $3
        ${extraWhere}
      GROUP BY ${groupExpr}
      ORDER BY ${orderExpr}
    `;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: {
        rows: result.rows,
        groupBy,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }
    });
  } catch (error) {
    console.error('getUsageHistory error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch usage history', error: error.message });
  }
};

/**
 * GET /usage/apps
 * Returns list of developer's apps for filter dropdown.
 */
const getDeveloperApps = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const result = await pool.query(
      `SELECT da.id, da.name, ag.name AS group_name
       FROM dev_apps da
       LEFT JOIN app_groups ag ON ag.id = da.group_id
       WHERE da.developer_id = $1
       ORDER BY da.name ASC`,
      [developerId]
    );
    res.status(200).json({ success: true, data: { apps: result.rows } });
  } catch (error) {
    console.error('getDeveloperApps error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch apps', error: error.message });
  }
};

/**
 * GET /usage/groups
 * Returns list of developer's groups for filter dropdown.
 */
const getDeveloperGroups = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const result = await pool.query(
      `SELECT ag.id, ag.name
       FROM app_groups ag
       JOIN developer_group_registrations dgr ON dgr.group_id = ag.id
       WHERE dgr.developer_id = $1
       ORDER BY ag.name ASC`,
      [developerId]
    );
    res.status(200).json({ success: true, data: { groups: result.rows } });
  } catch (error) {
    console.error('getDeveloperGroups error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch groups', error: error.message });
  }
};

module.exports = { getUsageHistory, getDeveloperApps, getDeveloperGroups };
