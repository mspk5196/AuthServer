const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { buildPlanChangeEmail } = require('../templates/emailTemplates');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay order for plan purchase
 */
const createOrder = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    // Get plan details
    const planResult = await pool.query(
      'SELECT id, name, price, duration_days FROM dev_plans WHERE id = $1 AND is_active = true',
      [planId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }

    const plan = planResult.rows[0];

    if (!plan.price || plan.price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan price'
      });
    }

    // Get developer details
    const devResult = await pool.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [developerId]
    );

    if (devResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }

    const developer = devResult.rows[0];

    // Create Razorpay order
    // Receipt must be max 40 chars
    const receiptId = `rcpt_${Date.now()}`.slice(0, 40);
    
    const options = {
      amount: Math.round(plan.price * 100), // Convert to paise
      currency: 'INR',
      receipt: receiptId,
      notes: {
        plan_id: planId,
        plan_name: plan.name,
        developer_id: developerId,
        developer_email: developer.email
      }
    };

    const order = await razorpay.orders.create(options);

    // Store order in database
    await pool.query(
      `INSERT INTO dev_payment_orders 
        (order_id, developer_id, plan_id, amount, currency, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [order.id, developerId, planId, plan.price, 'INR', 'created']
    );

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        planName: plan.name,
        planDuration: plan.duration_days
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

/**
 * Verify Razorpay payment signature
 */
const verifyPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const developerId = req.user.userId;
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    await client.query('BEGIN');

    // Get order details
    const orderResult = await client.query(
      'SELECT id, developer_id, plan_id, amount, status FROM dev_payment_orders WHERE order_id = $1',
      [razorpay_order_id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Verify developer owns this order
    if (order.developer_id !== developerId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Check if already processed
    if (order.status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Payment already processed'
      });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Update payment order
    await client.query(
      `UPDATE dev_payment_orders 
       SET payment_id = $1, 
           status = $2, 
           payment_method = $3,
           updated_at = NOW()
       WHERE order_id = $4`,
      [razorpay_payment_id, 'paid', payment.method, razorpay_order_id]
    );

    // Get plan details
    const planResult = await client.query(
      'SELECT id, name, duration_days, price FROM dev_plans WHERE id = $1',
      [order.plan_id]
    );

    const plan = planResult.rows[0];

    // Developer details for email
    const devRes = await client.query(
      'SELECT id, email, name FROM developers WHERE id = $1',
      [developerId]
    );

    // Active plan (if any)
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
               updated_at = NOW()
         WHERE id = $1
         RETURNING id, start_date, end_date`,
        [existingPlan.id]
      );
      registrationRow = updated.rows[0];
    } else {
      if (existingPlan) {
        action = 'upgrade';
        await client.query(
          'UPDATE developer_plan_registrations SET is_active = false, updated_at = NOW() WHERE developer_id = $1 AND is_active = true',
          [developerId]
        );
      }

      const endDate = plan.duration_days 
        ? `NOW() + INTERVAL '${plan.duration_days} days'`
        : 'NULL';

      const inserted = await client.query(
        `INSERT INTO developer_plan_registrations 
          (developer_id, plan_id, start_date, end_date, is_active, renewal_count, auto_renew, created_at, updated_at)
         VALUES ($1, $2, NOW(), ${endDate}, true, 0, false, NOW(), NOW())
         RETURNING id, start_date, end_date`,
        [developerId, order.plan_id]
      );

      registrationRow = inserted.rows[0];
    }

    // Record plan change in history
    await client.query(
      `INSERT INTO dev_plan_change_history 
        (developer_id, old_plan_id, new_plan_id, changed_at, change_reason, remarks)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [
        developerId,
        oldPlanId,
        order.plan_id,
        action,
        `Paid ₹${order.amount} via ${payment.method}`
      ]
    );

    await client.query('COMMIT');

    const subjectMap = {
      initial_purchase: 'Plan Purchased - Auth Platform',
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
    } catch (emailError) {
      console.error('Failed to send plan change notification:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and plan activated successfully',
      data: {
        action,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        registration: registrationRow
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get payment history for developer
 */
const getPaymentHistory = async (req, res) => {
  try {
    const developerId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        po.id,
        po.order_id,
        po.payment_id,
        po.amount,
        po.currency,
        po.status,
        po.payment_method,
        po.created_at,
        po.updated_at,
        dp.name as plan_name,
        dp.duration_days
       FROM dev_payment_orders po
       JOIN dev_plans dp ON po.plan_id = dp.id
       WHERE po.developer_id = $1
       ORDER BY po.created_at DESC`,
      [developerId]
    );

    res.status(200).json({
      success: true,
      data: { payments: result.rows }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

/**
 * Webhook to handle Razorpay events
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    console.log('Razorpay webhook event:', event);

    // Handle different events
    switch (event) {
      case 'payment.captured':
        // Payment was successful
        await pool.query(
          `UPDATE dev_payment_orders 
           SET status = 'paid', 
               payment_method = $1,
               updated_at = NOW()
           WHERE payment_id = $2`,
          [payload.method, payload.id]
        );
        break;

      case 'payment.failed':
        // Payment failed
        await pool.query(
          `UPDATE dev_payment_orders 
           SET status = 'failed',
               updated_at = NOW()
           WHERE order_id = $1`,
          [payload.order_id]
        );
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  handleWebhook
};
