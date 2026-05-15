const pool = require('../../config/db');

/**
 * GET /plans
 * Returns public plans (is_admin_plan = false) grouped by duration_type.
 */
const getPlans = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id, name, description, price, duration_days, duration_type,
         duration_label, features, features_desc, is_active
       FROM dev_plans
       WHERE is_active = true
         AND (is_admin_plan = false OR is_admin_plan IS NULL)
         AND (features->>'visible')::boolean = true
       ORDER BY price ASC`
    );

    // Group by duration_type
    const grouped = {};
    for (const plan of result.rows) {
      const key = plan.duration_type || 'monthly';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(plan);
    }

    res.status(200).json({
      success: true,
      data: { grouped, plans: result.rows }
    });
  } catch (error) {
    console.error('V2 getPlans error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch plans', error: error.message });
  }
};

/**
 * GET /my-plan
 * Returns the developer's current active plan registration.
 */
const getDeveloperPlan = async (req, res) => {
  try {
    const developerId = req.user.userId;

    const result = await pool.query(
      `SELECT
         dpr.id, dpr.plan_id, dpr.start_date, dpr.end_date,
         dpr.is_active, dpr.renewal_count, dpr.auto_renew,
         dp.name as plan_name, dp.description, dp.price,
         dp.duration_days, dp.duration_type, dp.duration_label,
         dp.features, dp.features_desc
       FROM developer_plan_registrations dpr
       JOIN dev_plans dp ON dpr.plan_id = dp.id
       WHERE dpr.developer_id = $1 AND dpr.is_active = true
       ORDER BY dpr.created_at DESC
       LIMIT 1`,
      [developerId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, data: { hasPlan: false, plan: null } });
    }

    res.status(200).json({ success: true, data: { hasPlan: true, plan: result.rows[0] } });
  } catch (error) {
    console.error('V2 getDeveloperPlan error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch developer plan', error: error.message });
  }
};

module.exports = { getPlans, getDeveloperPlan };
