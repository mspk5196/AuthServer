require('dotenv').config();
const Razorpay = require('razorpay');
const pool = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { buildPlanChangeEmail, buildReceiptEmail } = require('../templates/emailTemplates');

// Safe lazy Razorpay instance to prevent errors on startup if env vars are missing
let razorpayInstance = null;
const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }
  return razorpayInstance;
};

const razorpay = new Proxy({}, {
  get(target, prop) {
    return getRazorpayInstance()[prop];
  }
});

/**
 * Generate a unique receipt number: RCPT-YYYYMMDD-XXXXX
 */
const generateReceiptNumber = async (client) => {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const countRes = await client.query(
    `SELECT COUNT(*) FROM dev_payment_receipts WHERE created_at::date = CURRENT_DATE`
  );
  const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(5, '0');
  return `RCPT-${datePart}-${seq}`;
};

/**
 * Idempotent processor for successful payments.
 *
 * @param {object} params
 * @param {string} params.orderId - Razorpay order ID (e.g. 'order_xxx')
 * @param {string} [params.paymentId] - Razorpay payment ID (e.g. 'pay_xxx')
 * @param {string} [params.paymentMethod] - Payment method (upi, card, etc.)
 * @param {string} [params.developerId] - Optional developer ID for validation
 * @returns {Promise<object>} Processing result
 */
const processSuccessfulPayment = async ({ orderId, paymentId, paymentMethod, developerId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock and fetch the order
    const orderResult = await client.query(
      `SELECT id, developer_id, plan_id, amount, status, payment_id, payment_method
       FROM dev_payment_orders
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    const order = orderResult.rows[0];

    // Optional ownership check if developerId was provided
    if (developerId && order.developer_id !== developerId) {
      await client.query('ROLLBACK');
      const err = new Error('Unauthorized access to order');
      err.statusCode = 403;
      throw err;
    }

    // Fetch existing receipt if already paid (idempotency)
    if (order.status === 'paid') {
      const existingReceipt = await client.query(
        `SELECT r.*, dpr.start_date, dpr.end_date
         FROM dev_payment_receipts r
         LEFT JOIN developer_plan_registrations dpr ON dpr.developer_id = r.developer_id AND dpr.is_active = true
         WHERE r.order_id = $1`,
        [orderId]
      );

      await client.query('COMMIT');
      return {
        success: true,
        alreadyProcessed: true,
        orderId,
        paymentId: order.payment_id,
        receiptNumber: existingReceipt.rows[0]?.receipt_number || null,
        receipt: existingReceipt.rows[0] || null,
        message: 'Payment already processed'
      };
    }

    // 2. If paymentId or paymentMethod is not provided, fetch from Razorpay
    let finalPaymentId = paymentId || order.payment_id;
    let finalPaymentMethod = paymentMethod || order.payment_method || 'unknown';

    if (!finalPaymentId || finalPaymentMethod === 'unknown') {
      try {
        const payments = await razorpay.orders.fetchPayments(orderId);
        const captured = (payments?.items || []).find(
          (p) => p.status === 'captured' || p.status === 'authorized'
        );
        if (captured) {
          finalPaymentId = finalPaymentId || captured.id;
          finalPaymentMethod = captured.method || finalPaymentMethod;
        }
      } catch (rzpErr) {
        console.warn(`Could not fetch payments from Razorpay for order ${orderId}:`, rzpErr.message);
      }
    }

    // 3. Mark order as paid
    await client.query(
      `UPDATE dev_payment_orders
       SET payment_id = COALESCE($1, payment_id),
           status = 'paid',
           payment_method = $2,
           updated_at = NOW()
       WHERE order_id = $3`,
      [finalPaymentId, finalPaymentMethod, orderId]
    );

    // 4. Fetch plan details
    const planResult = await client.query(
      `SELECT id, name, duration_days, duration_label, price
       FROM dev_plans
       WHERE id = $1`,
      [order.plan_id]
    );

    if (planResult.rows.length === 0) {
      await client.query('ROLLBACK');
      const err = new Error('Plan associated with order not found');
      err.statusCode = 404;
      throw err;
    }

    const plan = planResult.rows[0];

    // 5. Fetch developer details
    const devRes = await client.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [order.developer_id]
    );

    if (devRes.rows.length === 0) {
      await client.query('ROLLBACK');
      const err = new Error('Developer not found');
      err.statusCode = 404;
      throw err;
    }

    const developer = devRes.rows[0];

    // 6. Check existing active plan
    const existingPlanResult = await client.query(
      `SELECT id, plan_id, start_date, end_date, renewal_count
       FROM developer_plan_registrations
       WHERE developer_id = $1 AND is_active = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [order.developer_id]
    );

    const existingPlan = existingPlanResult.rows[0];
    let oldPlanId = existingPlan ? existingPlan.plan_id : null;
    let action = 'initial_purchase';
    let registrationRow;

    const isRenewal = existingPlan && existingPlan.plan_id === order.plan_id && plan.duration_days;

    if (isRenewal) {
      action = 'renewal';
      // If renewed before expiry, extend from current end_date. If renewed after expiry, start from NOW().
      const updated = await client.query(
        `UPDATE developer_plan_registrations
         SET end_date = (CASE WHEN end_date > NOW() THEN end_date ELSE NOW() END) + INTERVAL '${plan.duration_days} days',
             renewal_count = renewal_count + 1,
             last_expiry_reminder_at = NULL,
             is_active = true,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, start_date, end_date`,
        [existingPlan.id]
      );
      registrationRow = updated.rows[0];
    } else {
      const endDateExpr = plan.duration_days
        ? `NOW() + INTERVAL '${plan.duration_days} days'`
        : 'NULL';

      if (existingPlan) {
        action = 'upgrade';
        const updated = await client.query(
          `UPDATE developer_plan_registrations
           SET plan_id = $2,
               start_date = NOW(),
               end_date = ${endDateExpr},
               renewal_count = 0,
               is_active = true,
               last_expiry_reminder_at = NULL,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, start_date, end_date`,
          [existingPlan.id, order.plan_id]
        );
        registrationRow = updated.rows[0];
      } else {
        // Deactivate any dangling active registrations for this developer to avoid duplicates
        await client.query(
          `UPDATE developer_plan_registrations
           SET is_active = false, updated_at = NOW()
           WHERE developer_id = $1 AND is_active = true`,
          [order.developer_id]
        );

        const inserted = await client.query(
          `INSERT INTO developer_plan_registrations
            (developer_id, plan_id, start_date, end_date, is_active, renewal_count, auto_renew, last_expiry_reminder_at, created_at, updated_at)
           VALUES ($1, $2, NOW(), ${endDateExpr}, true, 0, false, NULL, NOW(), NOW())
           RETURNING id, start_date, end_date`,
          [order.developer_id, order.plan_id]
        );
        registrationRow = inserted.rows[0];
      }
    }

    // 7. Clear old pre-expiry reminders for this developer so reminders fire again for the new cycle
    try {
      await client.query(
        `DELETE FROM dev_plan_expiry_reminders
         WHERE developer_id = $1 OR registration_id = $2`,
        [order.developer_id, registrationRow.id]
      );
    } catch (reminderErr) {
      console.warn('Could not clear old expiry reminders:', reminderErr.message);
    }

    // 8. Record in dev_plan_change_history
    await client.query(
      `INSERT INTO dev_plan_change_history
        (developer_id, old_plan_id, new_plan_id, changed_at, change_reason, remarks)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [order.developer_id, oldPlanId, order.plan_id, action, `Paid ₹${order.amount} via ${finalPaymentMethod}`]
    );

    // 9. Generate receipt
    const receiptNumber = await generateReceiptNumber(client);
    const receiptResult = await client.query(
      `INSERT INTO dev_payment_receipts
        (receipt_number, order_id, developer_id, plan_id, plan_name,
         developer_name, developer_email, amount, currency, payment_id,
         payment_method, payment_type, duration_label, plan_start_date, plan_end_date, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'INR',$9,$10,$11,$12,$13,$14,NOW())
       RETURNING *`,
      [
        receiptNumber,
        orderId,
        order.developer_id,
        order.plan_id,
        plan.name,
        developer.name,
        developer.email,
        order.amount,
        finalPaymentId,
        finalPaymentMethod,
        action,
        plan.duration_label || null,
        registrationRow.start_date,
        registrationRow.end_date,
      ]
    );

    await client.query('COMMIT');

    // 10. Send notification emails
    const subjectMap = {
      initial_purchase: 'Plan Purchased - Auth Platform',
      upgrade: 'Plan Upgraded - Auth Platform',
      renewal: 'Plan Renewed - Auth Platform',
    };

    // Plan change email
    sendMail({
      to: developer.email,
      subject: subjectMap[action] || 'Plan Updated - Auth Platform',
      html: buildPlanChangeEmail({
        name: developer.name,
        planName: plan.name,
        action,
        startDate: registrationRow.start_date,
        endDate: registrationRow.end_date,
        changedAt: new Date().toLocaleString(),
      }),
    }).catch((e) => console.error('Failed to send plan change email:', e.message));

    // Receipt email
    sendMail({
      to: developer.email,
      subject: `Payment Receipt ${receiptNumber} - Auth Platform`,
      html: buildReceiptEmail({
        name: developer.name,
        receiptNumber,
        planName: plan.name,
        paymentType: action,
        amount: order.amount,
        currency: 'INR',
        paymentMethod: finalPaymentMethod,
        paymentId: finalPaymentId,
        orderId,
        planStartDate: registrationRow.start_date,
        planEndDate: registrationRow.end_date,
        createdAt: new Date(),
      }),
    }).catch((e) => console.error('Failed to send receipt email:', e.message));

    return {
      success: true,
      action,
      paymentId: finalPaymentId,
      orderId,
      receiptNumber,
      registration: registrationRow,
      receipt: receiptResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  processSuccessfulPayment,
  generateReceiptNumber,
  razorpay,
};
