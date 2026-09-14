const crypto = require('crypto');
const pool = require('../config/db');
const { processSuccessfulPayment, razorpay } = require('../services/paymentProcessor');
const { checkOrderStatus, handleMobileCallback } = require('./v2/paymentControllerV2');

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

    const result = await processSuccessfulPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      developerId,
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and plan activated successfully',
      data: {
        action: result.action,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        registration: result.registration,
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
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
 * Webhook to handle Razorpay events (server-to-server)
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET is not configured in .env');
      return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }

    // Use rawBody buffer if available, or fall back to stringified req.body
    const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Webhook signature mismatch. Received:', signature, 'Expected:', expectedSignature);
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const orderEntity = req.body.payload?.order?.entity;

    console.log('Razorpay webhook event received:', event);

    switch (event) {
      case 'payment.captured':
      case 'order.paid': {
        const orderId = paymentEntity?.order_id || orderEntity?.id;
        const paymentId = paymentEntity?.id;
        const paymentMethod = paymentEntity?.method || 'unknown';

        if (orderId) {
          await processSuccessfulPayment({
            orderId,
            paymentId,
            paymentMethod,
          });
          console.log(`Webhook successfully fulfilled payment for order ${orderId}`);
        } else {
          console.warn('Webhook payment.captured/order.paid missing orderId:', req.body);
        }
        break;
      }

      case 'payment.failed': {
        const orderId = paymentEntity?.order_id;
        if (orderId) {
          await pool.query(
            `UPDATE dev_payment_orders 
             SET status = 'failed',
                 updated_at = NOW()
             WHERE order_id = $1`,
            [orderId]
          );
          console.log(`Webhook marked order ${orderId} as failed`);
        }
        break;
      }

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
  handleWebhook,
  checkOrderStatus,
  handleMobileCallback,
};
