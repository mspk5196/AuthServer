const cron = require('node-cron');
const pool = require('../config/db');
const { sendMail } = require('../utils/mailer');
const {
  buildPlanExpiredEmail,
  buildPlanInactiveEmail,
  buildPlanExpiryWarningEmail,
  buildPostExpiryReminderEmail,
} = require('../templates/emailTemplates');

const DEVELOPER_PORTAL_URL = process.env.DEVELOPER_PORTAL_URL || 'https://authservices.mspkapps.in';

/**
 * Send pre-expiry warning emails (7, 5, 2, 1 day before expiry).
 * Uses dev_plan_expiry_reminders to ensure each reminder is sent only once per cycle.
 */
const sendExpiryWarnings = async () => {
  const brackets = [
    { type: '7day', minDays: 5, maxDays: 7 },
    { type: '5day', minDays: 2, maxDays: 5 },
    { type: '2day', minDays: 1, maxDays: 2 },
    { type: '1day', minDays: 0, maxDays: 1 },
  ];

  for (const b of brackets) {
    try {
      const result = await pool.query(
        `SELECT
           dpr.id AS registration_id,
           dpr.developer_id,
           dpr.end_date,
           d.email,
           d.name,
           dp.name AS plan_name
         FROM developer_plan_registrations dpr
         JOIN developers d  ON dpr.developer_id = d.id
         JOIN dev_plans   dp ON dpr.plan_id = dp.id
         WHERE dpr.is_active = true
           AND dpr.end_date IS NOT NULL
           AND COALESCE(dp.duration_days, 0) > 0
           AND dpr.end_date > NOW() + INTERVAL '${b.minDays} days'
           AND dpr.end_date <= NOW() + INTERVAL '${b.maxDays} days'
           AND NOT EXISTS (
             SELECT 1 FROM dev_plan_expiry_reminders r
              WHERE r.registration_id = dpr.id
                AND r.reminder_type   = $1
           )
           AND NOT EXISTS (
             SELECT 1 FROM developer_plan_registrations newer
              WHERE newer.developer_id = dpr.developer_id
                AND newer.id > dpr.id
                AND newer.is_active = true
           )`,
        [b.type]
      );

      for (const row of result.rows) {
        try {
          const daysLeft = b.maxDays;
          await sendMail({
            to: row.email,
            subject: `Your plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} - Auth Platform`,
            html: buildPlanExpiryWarningEmail({
              name: row.name,
              planName: row.plan_name,
              daysLeft: daysLeft,
              endDate: row.end_date,
              renewUrl: `${DEVELOPER_PORTAL_URL}/plans`,
            }),
          });

          await pool.query(
            `INSERT INTO dev_plan_expiry_reminders
              (registration_id, developer_id, reminder_type)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [row.registration_id, row.developer_id, b.type]
          );
        } catch (err) {
          console.error(`Failed to send ${b.type} expiry warning for dev ${row.developer_id}:`, err);
        }
      }
    } catch (err) {
      console.error(`sendExpiryWarnings (${b.type}) error:`, err);
    }
  }
};

/**
 * Send post-expiry reminders every 2 days until developer renews.
 * Only sends if the developer has NO currently active plan and only for the latest registration.
 */
const sendPostExpiryReminders = async () => {
  try {
    const result = await pool.query(
      `SELECT
         dpr.id AS registration_id,
         dpr.developer_id,
         dpr.end_date,
         dpr.last_expiry_reminder_at,
         d.email,
         d.name,
         dp.name AS plan_name
       FROM developer_plan_registrations dpr
       JOIN developers d  ON dpr.developer_id = d.id
       JOIN dev_plans   dp ON dpr.plan_id = dp.id
       WHERE dpr.is_active = false
         AND dpr.end_date IS NOT NULL
         AND COALESCE(dp.duration_days, 0) > 0
         AND dpr.end_date < NOW()
         AND (
           dpr.last_expiry_reminder_at IS NULL
           OR dpr.last_expiry_reminder_at < NOW() - INTERVAL '2 days'
         )
         -- CRITICAL: Never send post-expiry reminders if the developer currently has ANY active plan
         AND NOT EXISTS (
           SELECT 1 FROM developer_plan_registrations active_dpr
           WHERE active_dpr.developer_id = dpr.developer_id
             AND active_dpr.is_active = true
             AND (active_dpr.end_date IS NULL OR active_dpr.end_date > NOW())
         )
         -- Only send for the developer's most recent registration
         AND dpr.id = (
           SELECT id FROM developer_plan_registrations sub
           WHERE sub.developer_id = dpr.developer_id
           ORDER BY sub.created_at DESC NULLS LAST, sub.id DESC
           LIMIT 1
         )`
    );

    for (const row of result.rows) {
      try {
        await sendMail({
          to: row.email,
          subject: 'Your plan has expired — API access blocked - Auth Platform',
          html: buildPostExpiryReminderEmail({
            name: row.name,
            planName: row.plan_name,
            endDate: row.end_date,
            renewUrl: `${DEVELOPER_PORTAL_URL}/plans`,
          }),
        });

        await pool.query(
          `UPDATE developer_plan_registrations
           SET last_expiry_reminder_at = NOW()
           WHERE id = $1`,
          [row.registration_id]
        );
      } catch (err) {
        console.error(`Failed to send post-expiry reminder for dev ${row.developer_id}:`, err);
      }
    }
  } catch (err) {
    console.error('sendPostExpiryReminders error:', err);
  }
};

// Runs every hour
const schedulePlanStatusJob = () => {
  // Hourly: expire plans + deactivate orphaned registrations
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
          AND COALESCE(dp.duration_days, 0) > 0
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

  // Daily at 08:00 UTC: send pre-expiry warnings (7, 5, 2, 1 day before)
  cron.schedule('0 8 * * *', async () => {
    try {
      await sendExpiryWarnings();
    } catch (err) {
      console.error('Expiry warning job error:', err);
    }
  }, { timezone: 'UTC' });

  // Daily at 09:00 UTC: post-expiry reminders every 2 days
  cron.schedule('0 9 * * *', async () => {
    try {
      await sendPostExpiryReminders();
    } catch (err) {
      console.error('Post-expiry reminder job error:', err);
    }
  }, { timezone: 'UTC' });
};

module.exports = { schedulePlanStatusJob };
