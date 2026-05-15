const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../../config/db');
const { sendMail } = require('../../utils/mailer');
const { buildPlanChangeEmail, buildReceiptEmail } = require('../../templates/emailTemplates');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/** Generate a unique receipt number: RCPT-YYYYMMDD-XXXXX */
const generateReceiptNumber = async (client) => {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  // Use a sequence counter from the receipts table for the day
  const countRes = await client.query(
    `SELECT COUNT(*) FROM dev_payment_receipts WHERE created_at::date = CURRENT_DATE`
  );
  const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(5, '0');
  return `RCPT-${datePart}-${seq}`;
};

/**
 * POST /payment/create-order
 * Creates a Razorpay order for plan purchase.
 * Identical to v1 — no breaking changes needed here.
 */
const createOrder = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    const planResult = await pool.query(
      `SELECT id, name, price, duration_days, duration_label, is_admin_plan
       FROM dev_plans WHERE id = $1 AND is_active = true`,
      [planId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found or inactive' });
    }

    const plan = planResult.rows[0];

    if (!plan.price || plan.price <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid plan price' });
    }

    const devResult = await pool.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [developerId]
    );

    if (devResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }

    const developer = devResult.rows[0];
    const receiptId = `rcpt_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: Math.round(plan.price * 100),
      currency: 'INR',
      receipt: receiptId,
      notes: {
        plan_id: planId,
        plan_name: plan.name,
        developer_id: developerId,
        developer_email: developer.email,
      },
    });

    await pool.query(
      `INSERT INTO dev_payment_orders
        (order_id, developer_id, plan_id, amount, currency, status, created_at)
       VALUES ($1, $2, $3, $4, 'INR', 'created', NOW())`,
      [order.id, developerId, planId, plan.price]
    );

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        planName: plan.name,
        planDuration: plan.duration_days,
      },
    });
  } catch (error) {
    console.error('V2 createOrder error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order', error: error.message });
  }
};

/**
 * POST /payment/verify
 * Verifies Razorpay signature, activates plan and generates a receipt.
 */
const verifyPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const developerId = req.user.userId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification parameters' });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT id, developer_id, plan_id, amount, status FROM dev_payment_orders WHERE order_id = $1',
      [razorpay_order_id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.developer_id !== developerId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Unauthorized access to order' });
    }

    if (order.status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    // Fetch payment from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Update order
    await client.query(
      `UPDATE dev_payment_orders
       SET payment_id = $1, status = 'paid', payment_method = $2, updated_at = NOW()
       WHERE order_id = $3`,
      [razorpay_payment_id, payment.method, razorpay_order_id]
    );

    const planResult = await client.query(
      'SELECT id, name, duration_days, duration_label, price FROM dev_plans WHERE id = $1',
      [order.plan_id]
    );
    const plan = planResult.rows[0];

    const devRes = await client.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [developerId]
    );
    const developer = devRes.rows[0];

    const existingPlanResult = await client.query(
      'SELECT id, plan_id, start_date, end_date, renewal_count FROM developer_plan_registrations WHERE developer_id = $1 AND is_active = true',
      [developerId]
    );
    const existingPlan = existingPlanResult.rows[0];
    let oldPlanId = existingPlan ? existingPlan.plan_id : null;
    let action = 'initial_purchase';
    let registrationRow;

    const isRenewal = existingPlan && existingPlan.plan_id === order.plan_id && plan.duration_days;

    if (isRenewal) {
      action = 'renewal';
      const updated = await client.query(
        `UPDATE developer_plan_registrations
           SET end_date = COALESCE(end_date, NOW()) + INTERVAL '${plan.duration_days} days',
               renewal_count = renewal_count + 1,
               last_expiry_reminder_at = NULL,
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
             SET plan_id = $2, start_date = NOW(), end_date = ${endDateExpr},
                 renewal_count = 0, is_active = true,
                 last_expiry_reminder_at = NULL, updated_at = NOW()
           WHERE id = $1
           RETURNING id, start_date, end_date`,
          [existingPlan.id, order.plan_id]
        );
        registrationRow = updated.rows[0];
      } else {
        const inserted = await client.query(
          `INSERT INTO developer_plan_registrations
            (developer_id, plan_id, start_date, end_date, is_active, renewal_count, auto_renew, created_at, updated_at)
           VALUES ($1, $2, NOW(), ${endDateExpr}, true, 0, false, NOW(), NOW())
           RETURNING id, start_date, end_date`,
          [developerId, order.plan_id]
        );
        registrationRow = inserted.rows[0];
      }
    }

    // History
    await client.query(
      `INSERT INTO dev_plan_change_history
        (developer_id, old_plan_id, new_plan_id, changed_at, change_reason, remarks)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [developerId, oldPlanId, order.plan_id, action, `Paid ₹${order.amount} via ${payment.method}`]
    );

    // Generate receipt
    const receiptNumber = await generateReceiptNumber(client);
    await client.query(
      `INSERT INTO dev_payment_receipts
        (receipt_number, order_id, developer_id, plan_id, plan_name,
         developer_name, developer_email, amount, currency, payment_id,
         payment_method, payment_type, duration_label, plan_start_date, plan_end_date, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'INR',$9,$10,$11,$12,$13,$14,NOW())`,
      [
        receiptNumber,
        razorpay_order_id,
        developerId,
        order.plan_id,
        plan.name,
        developer.name,
        developer.email,
        order.amount,
        razorpay_payment_id,
        payment.method,
        action,
        plan.duration_label || null,
        registrationRow.start_date,
        registrationRow.end_date,
      ]
    );

    await client.query('COMMIT');

    // Send plan change email
    const subjectMap = {
      initial_purchase: 'Plan Purchased - Auth Platform',
      upgrade: 'Plan Upgraded - Auth Platform',
      renewal: 'Plan Renewed - Auth Platform',
    };

    try {
      await sendMail({
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
      });
    } catch (e) {
      console.error('Failed to send plan email:', e);
    }

    // Send receipt email
    try {
      await sendMail({
        to: developer.email,
        subject: `Payment Receipt ${receiptNumber} - Auth Platform`,
        html: buildReceiptEmail({
          name: developer.name,
          receiptNumber,
          planName: plan.name,
          paymentType: action,
          amount: order.amount,
          currency: 'INR',
          paymentMethod: payment.method,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          planStartDate: registrationRow.start_date,
          planEndDate: registrationRow.end_date,
          createdAt: new Date(),
        }),
      });
    } catch (e) {
      console.error('Failed to send receipt email:', e);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and plan activated successfully',
      data: {
        action,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        receiptNumber,
        registration: registrationRow,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('V2 verifyPayment error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { createOrder, verifyPayment };
