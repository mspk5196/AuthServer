const pool = require('../config/db');

/**
 * Get all active plans
 */
const getPlans = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
  id, 
  name, 
  description, 
  price, 
  duration_days, 
  features, 
  is_active
FROM dev_plans
WHERE 
  is_active = true
  AND (features->>'visible')::boolean = true
ORDER BY 
  price ASC;`
    );

    res.status(200).json({
      success: true,
      data: { plans: result.rows }
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error.message
    });
  }
};

/**
 * Get developer's current plan
 */
const getDeveloperPlan = async (req, res) => {
  try {
    const developerId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        dpr.id,
        dpr.plan_id,
        dpr.start_date,
        dpr.end_date,
        dpr.is_active,
        dpr.renewal_count,
        dpr.auto_renew,
        dp.name as plan_name,
        dp.description,
        dp.price,
        dp.duration_days,
        dp.features,
        dp.features_desc
       FROM developer_plan_registrations dpr
       JOIN dev_plans dp ON dpr.plan_id = dp.id
       WHERE dpr.developer_id = $1 AND dpr.is_active = true
       ORDER BY dpr.created_at DESC
       LIMIT 1`,
      [developerId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: { hasPlan: false, plan: null }
      });
    }

    res.status(200).json({
      success: true,
      data: { hasPlan: true, plan: result.rows[0] }
    });
  } catch (error) {
    console.error('Get developer plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch developer plan',
      error: error.message
    });
  }
};

/**
 * Select/Register a plan for developer
 */
const selectPlan = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const developerId = req.user.userId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    await client.query('BEGIN');

    const devRes = await client.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [developerId]
    );

    // Check if plan exists and is active
    const planResult = await client.query(
      'SELECT id, duration_days, price FROM dev_plans WHERE id = $1 AND is_active = true',
      [planId]
    );

    if (planResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }

    const plan = planResult.rows[0];

    // Check if developer already has an active plan
    const existingPlanResult = await client.query(
      'SELECT id, plan_id FROM developer_plan_registrations WHERE developer_id = $1 AND is_active = true',
      [developerId]
    );

    let oldPlanId = null;

    // If there's an existing plan, deactivate it
    if (existingPlanResult.rows.length > 0) {
      oldPlanId = existingPlanResult.rows[0].plan_id;
      await client.query(
        'UPDATE developer_plan_registrations SET is_active = false, updated_at = NOW() WHERE developer_id = $1 AND is_active = true',
        [developerId]
      );
    }

    // Calculate end date based on duration_days
    const endDate = plan.duration_days 
      ? `NOW() + INTERVAL '${plan.duration_days} days'`
      : 'NULL';

    // Insert new plan registration
    const registrationResult = await client.query(
      `INSERT INTO developer_plan_registrations 
        (developer_id, plan_id, start_date, end_date, is_active, renewal_count, auto_renew, created_at, updated_at)
       VALUES ($1, $2, NOW(), ${endDate}, true, 0, false, NOW(), NOW())
       RETURNING id, start_date, end_date`,
      [developerId, planId]
    );

    // Record plan change in history
    await client.query(
      `INSERT INTO dev_plan_change_history 
        (developer_id, old_plan_id, new_plan_id, changed_at, change_reason, remarks)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [
        developerId,
        oldPlanId,
        planId,
        oldPlanId ? 'upgrade' : 'initial_selection',
        oldPlanId ? 'User upgraded plan' : 'Initial plan selection'
      ]
    );

    await client.query('COMMIT');

    try {
      const emailHTML = `
        <h2>Plan Selected Successfully</h2>
        <p>Hello ${devRes.rows[0].name},</p>
        <p>Your plan has been successfully selected for your developer account.</p>
        <p><strong>If you made this change</strong>, you can ignore this email.</p>
        <p><strong>If you did not make this change</strong>, please contact our support team immediately.</p>
        <br />
        <p>Changed at: ${new Date().toLocaleString()}</p>
        <br />
        <p>Best regards,<br />MSPK Auth Platform Support</p>
      `;

      await sendMail({
        to: devRes.rows[0].email,
        subject: 'Plan Selected - Auth Platform',
        html: emailHTML
      });

      console.log('Plan selection notification sent to:', devRes.rows[0].email);
    } catch (emailError) {
      console.error('Failed to send plan selection notification:', emailError);
      // Don't fail the plan selection, just log the error
    }

    res.status(201).json({
      success: true,
      message: 'Plan registered successfully',
      data: {
        registration: registrationResult.rows[0],
        plan: plan
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Select plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register plan',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Upgrade developer's plan
 */
const upgradePlan = async (req, res) => {
  // Reuse the selectPlan logic since it handles both initial selection and upgrades
  return selectPlan(req, res);
};

module.exports = {
  getPlans,
  getDeveloperPlan,
  selectPlan,
  upgradePlan
};
