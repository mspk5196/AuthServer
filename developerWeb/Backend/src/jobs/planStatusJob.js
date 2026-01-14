const cron = require('node-cron');
const pool = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { buildPlanExpiredEmail, buildPlanInactiveEmail } = require('../templates/emailTemplates');

// Runs every hour
const schedulePlanStatusJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      // Expire plans past end_date
      const expired = await pool.query(
        `UPDATE developer_plan_registrations dpr
           SET is_active = false, updated_at = NOW()
         FROM dev_plans dp
        WHERE dpr.plan_id = dp.id
          AND dpr.is_active = true
          AND dpr.end_date IS NOT NULL
          AND dpr.end_date < NOW()
        RETURNING dpr.id, dpr.developer_id, dpr.plan_id, dpr.end_date, dp.name as plan_name;`
      );

      for (const row of expired.rows) {
        const dev = await pool.query('SELECT email, name FROM developers WHERE id = $1', [row.developer_id]);
        if (dev.rows.length) {
          try {
            await sendMail({
              to: dev.rows[0].email,
              subject: 'Plan Expired - Auth Platform',
              html: buildPlanExpiredEmail({
                name: dev.rows[0].name,
                planName: row.plan_name,
                endDate: row.end_date
              }),
            });
          } catch (err) {
            console.error('Failed to send plan expired email:', err);
          }
        }

        await pool.query(
          `INSERT INTO dev_plan_change_history (developer_id, old_plan_id, new_plan_id, changed_at, change_reason, remarks)
           VALUES ($1, $2, NULL, NOW(), $3, $4)`,
          [row.developer_id, row.plan_id, 'expired', 'Plan expired automatically']
        );
      }

      // Deactivate registrations whose plan was inactivated
      const inactivated = await pool.query(
        `UPDATE developer_plan_registrations dpr
           SET is_active = false, updated_at = NOW()
         FROM dev_plans dp
        WHERE dpr.plan_id = dp.id
          AND dpr.is_active = true
          AND dp.is_active = false
        RETURNING dpr.id, dpr.developer_id, dpr.plan_id, dp.name as plan_name;`
      );

      for (const row of inactivated.rows) {
        const dev = await pool.query('SELECT email, name FROM developers WHERE id = $1', [row.developer_id]);
        if (dev.rows.length) {
          try {
            await sendMail({
              to: dev.rows[0].email,
              subject: 'Plan Deactivated - Auth Platform',
              html: buildPlanInactiveEmail({
                name: dev.rows[0].name,
                planName: row.plan_name
              }),
            });
          } catch (err) {
            console.error('Failed to send plan inactive email:', err);
          }
        }

        await pool.query(
          `INSERT INTO dev_plan_change_history (developer_id, old_plan_id, new_plan_id, changed_at, change_reason, remarks)
           VALUES ($1, $2, NULL, NOW(), $3, $4)`,
          [row.developer_id, row.plan_id, 'plan_inactive', 'Plan marked inactive by admin']
        );
      }
    } catch (error) {
      console.error('Plan status job error:', error);
    }
  }, {
    timezone: 'UTC'
  });
};

module.exports = { schedulePlanStatusJob };
