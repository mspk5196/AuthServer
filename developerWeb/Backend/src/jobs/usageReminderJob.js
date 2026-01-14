const cron = require('node-cron');
const pool = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { buildUsageReminderEmail } = require('../templates/emailTemplates');

// Runs once per month on the 1st at 09:00 UTC
const scheduleUsageReminderJob = () => {
  cron.schedule('0 9 1 * *', async () => {
    try {
      // Get all developers with an active plan
      const activePlans = await pool.query(`
        SELECT 
          d.id as developer_id,
          d.email,
          d.name,
          dp.name as plan_name,
          dp.features
        FROM developer_plan_registrations dpr
        JOIN developers d ON dpr.developer_id = d.id
        JOIN dev_plans dp ON dpr.plan_id = dp.id
        WHERE dpr.is_active = true
      `);

      for (const row of activePlans.rows) {
        const { developer_id, email, name, plan_name, features } = row;

        // Derive limits from plan features (0 or null => unlimited)
        const maxApps =
          features && features.max_apps !== undefined && features.max_apps !== null
            ? Number(features.max_apps)
            : null;
        const maxApiCalls =
          features && features.max_api_calls !== undefined && features.max_api_calls !== null
            ? Number(features.max_api_calls)
            : null;

        // Current app count
        const appsRes = await pool.query(
          'SELECT COUNT(*) as count FROM dev_apps WHERE developer_id = $1',
          [developer_id]
        );
        const appsUsed = parseInt(appsRes.rows[0]?.count || 0, 10);

        // API calls this month
        let apiCallsUsed = 0;
        try {
          const apiRes = await pool.query(
            `SELECT COUNT(*) as count
             FROM dev_api_calls
             WHERE developer_id = $1
               AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
            [developer_id]
          );
          apiCallsUsed = parseInt(apiRes.rows[0]?.count || 0, 10);
        } catch (err) {
          console.warn('usageReminderJob: dev_api_calls missing or query failed for developer', developer_id, err.message);
        }

        const appsRemaining =
          maxApps === null || Number.isNaN(maxApps)
            ? null
            : Math.max(maxApps - appsUsed, 0);
        const apiCallsRemaining =
          maxApiCalls === null || Number.isNaN(maxApiCalls)
            ? null
            : Math.max(maxApiCalls - apiCallsUsed, 0);

        try {
          await sendMail({
            to: email,
            subject: 'Monthly usage summary - Auth Platform',
            html: buildUsageReminderEmail({
              name,
              planName: plan_name,
              maxApps,
              appsUsed,
              appsRemaining,
              maxApiCalls,
              apiCallsUsed,
              apiCallsRemaining,
            }),
          });
        } catch (err) {
          console.error('usageReminderJob: failed to send email to', email, err);
        }
      }
    } catch (error) {
      console.error('usageReminderJob error:', error);
    }
  }, {
    timezone: 'UTC',
  });
};

module.exports = { scheduleUsageReminderJob };
