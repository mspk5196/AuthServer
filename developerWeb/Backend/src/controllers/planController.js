const pool = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { buildPlanChangeEmail, buildPlanCancelledEmail } = require('../templates/emailTemplates');

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
  features_desc,
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
      'SELECT id, name, duration_days, price FROM dev_plans WHERE id = $1 AND is_active = true',
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
      'SELECT id, plan_id, start_date, end_date, renewal_count FROM developer_plan_registrations WHERE developer_id = $1 AND is_active = true',
      [developerId]
    );

    const existingPlan = existingPlanResult.rows[0];
    let oldPlanId = existingPlan ? existingPlan.plan_id : null;
    let action = 'initial_selection';
    let registrationRow;

    if (existingPlan) {
      // Prevent downgrades to cheaper plans while current plan period is still active
      const currentPlanRes = await client.query(
        'SELECT id, name, price, duration_days FROM dev_plans WHERE id = $1',
        [existingPlan.plan_id]
      );

      if (currentPlanRes.rows.length) {
        const currentPlan = currentPlanRes.rows[0];
        const currentPrice = Number(currentPlan.price || 0);
        const newPrice = Number(plan.price || 0);

        const now = new Date();
        const endDate = existingPlan.end_date ? new Date(existingPlan.end_date) : null;
        const isWithinCurrentPeriod = !endDate || endDate > now;

        if (newPrice < currentPrice && isWithinCurrentPeriod) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'DOWNGRADE_NOT_ALLOWED',
            message: 'You can switch to a lower-priced plan only after your current plan period ends.',
          });
        }
      }

      const isRenewal = existingPlan.plan_id === planId && plan.duration_days;

      if (isRenewal) {
        action = 'renewal';

        const updated = await client.query(
          `UPDATE developer_plan_registrations
             SET end_date = COALESCE(end_date, NOW()) + INTERVAL '${plan.duration_days} days',
                 renewal_count = renewal_count + 1,
                 updated_at = NOW()
           WHERE id = $1
           RETURNING id, start_date, end_date;`,
          [existingPlan.id]
        );

        registrationRow = updated.rows[0];
      } else {
        action = 'upgrade';

        await client.query(
          'UPDATE developer_plan_registrations SET is_active = false, updated_at = NOW() WHERE developer_id = $1 AND is_active = true',
          [developerId]
        );

        const endDate = plan.duration_days 
          ? `NOW() + INTERVAL '${plan.duration_days} days'`
          : 'NULL';

        const inserted = await client.query(
          `INSERT INTO developer_plan_registrations 
            (developer_id, plan_id, start_date, end_date, is_active, renewal_count, auto_renew, created_at, updated_at)
           VALUES ($1, $2, NOW(), ${endDate}, true, 0, false, NOW(), NOW())
           RETURNING id, start_date, end_date`,
          [developerId, planId]
        );

        registrationRow = inserted.rows[0];
      }
    } else {
      const endDate = plan.duration_days 
        ? `NOW() + INTERVAL '${plan.duration_days} days'`
        : 'NULL';

      const inserted = await client.query(
        `INSERT INTO developer_plan_registrations 
          (developer_id, plan_id, start_date, end_date, is_active, renewal_count, auto_renew, created_at, updated_at)
         VALUES ($1, $2, NOW(), ${endDate}, true, 0, false, NOW(), NOW())
         RETURNING id, start_date, end_date`,
        [developerId, planId]
      );

      registrationRow = inserted.rows[0];
    }

    await client.query(
      `INSERT INTO dev_plan_change_history 
        (developer_id, old_plan_id, new_plan_id, changed_at, change_reason, remarks)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [
        developerId,
        oldPlanId,
        planId,
        action,
        `Plan ${action.replace('_', ' ')}`
      ]
    );

    await client.query('COMMIT');

    const subjectMap = {
      initial_selection: 'Plan Selected - Auth Platform',
      upgrade: 'Plan Upgraded - Auth Platform',
      renewal: 'Plan Renewed - Auth Platform'
    };

    try {
      await sendMail({
        to: devRes.rows[0].email,
        subject: subjectMap[action] || 'Plan Updated - Auth Platform',
        html: buildPlanChangeEmail({
          name: devRes.rows[0].name,
          planName: plan.name,
          action,
          startDate: registrationRow.start_date,
          endDate: registrationRow.end_date,
          changedAt: new Date().toLocaleString()
        }),
      });

      console.log('Plan change notification sent to:', devRes.rows[0].email);
    } catch (emailError) {
      console.error('Failed to send plan change notification:', emailError);
      // Don't fail the plan selection, just log the error
    }

    res.status(201).json({
      success: true,
      message: 'Plan registered successfully',
      data: {
        action,
        registration: registrationRow,
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
 * Cancel developer's current plan
 */
const cancelPlan = async (req, res) => {
  const client = await pool.connect();

  try {
    const developerId = req.user.userId;

    await client.query('BEGIN');

    const devRes = await client.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [developerId]
    );

    if (devRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }

    const registrationResult = await client.query(
      `SELECT 
         dpr.id,
         dpr.plan_id,
         dpr.start_date,
         dpr.end_date,
         dp.name as plan_name
       FROM developer_plan_registrations dpr
       JOIN dev_plans dp ON dp.id = dpr.plan_id
       WHERE dpr.developer_id = $1 AND dpr.is_active = true
       ORDER BY dpr.created_at DESC
       LIMIT 1`,
      [developerId]
    );

    if (registrationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No active plan to cancel'
      });
    }

    const registration = registrationResult.rows[0];

    const updateResult = await client.query(
      `UPDATE developer_plan_registrations
         SET is_active = false,
             end_date = COALESCE(end_date, NOW()),
             updated_at = NOW()
       WHERE id = $1
       RETURNING end_date`,
      [registration.id]
    );

    const effectiveEndDate = updateResult.rows[0].end_date;

    await client.query(
      `INSERT INTO dev_plan_change_history 
        (developer_id, old_plan_id, new_plan_id, changed_at, change_reason, remarks)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [
        developerId,
        registration.plan_id,
        null,
        'cancel',
        'Plan cancelled by developer'
      ]
    );

    await client.query('COMMIT');

    try {
      await sendMail({
        to: devRes.rows[0].email,
        subject: 'Plan Cancelled - Auth Platform',
        html: buildPlanCancelledEmail({
          name: devRes.rows[0].name,
          planName: registration.plan_name,
          cancelledAt: new Date().toLocaleString(),
          endDate: effectiveEndDate
        })
      });
    } catch (emailError) {
      console.error('Failed to send plan cancellation email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Plan cancelled successfully',
      data: {
        cancelledPlanId: registration.plan_id,
        effectiveEndDate
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel plan',
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
  upgradePlan,
  cancelPlan
};
