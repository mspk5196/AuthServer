const crypto = require('crypto');
const pool = require('../../config/db');
const { processSuccessfulPayment, razorpay } = require('../../services/paymentProcessor');

/**
 * POST /payment/create-order
 * Creates a Razorpay order for plan purchase.
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
 * Verifies Razorpay signature, activates plan, and generates a receipt.
 */
const verifyPayment = async (req, res) => {
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

    // Process payment fulfillment via unified processor
    const result = await processSuccessfulPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      developerId,
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and plan activated successfully',
      data: result,
    });
  } catch (error) {
    console.error('V2 verifyPayment error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
  }
};

/**
 * POST /payment/check-status/:orderId
 * Check order status directly with Razorpay. If paid on Razorpay, fulfills and activates.
 */
const checkOrderStatus = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { orderId } = req.params;

    const orderRes = await pool.query(
      `SELECT id, order_id, developer_id, plan_id, amount, status, payment_id, payment_method, created_at
       FROM dev_payment_orders
       WHERE order_id = $1 AND developer_id = $2`,
      [orderId, developerId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // If already marked as paid
    if (order.status === 'paid') {
      const receiptRes = await pool.query(
        `SELECT * FROM dev_payment_receipts WHERE order_id = $1`,
        [orderId]
      );
      return res.status(200).json({
        success: true,
        status: 'paid',
        message: 'Payment already verified and completed',
        data: {
          orderId,
          paymentId: order.payment_id,
          receipt: receiptRes.rows[0] || null,
        }
      });
    }

    // Query Razorpay API directly for payments attached to this order
    const payments = await razorpay.orders.fetchPayments(orderId);
    const captured = (payments?.items || []).find(
      (p) => p.status === 'captured' || p.status === 'authorized'
    );

    if (captured) {
      const result = await processSuccessfulPayment({
        orderId,
        paymentId: captured.id,
        paymentMethod: captured.method,
        developerId,
      });

      return res.status(200).json({
        success: true,
        status: 'paid',
        message: 'Payment confirmed and plan activated successfully',
        data: result,
      });
    }

    // Check if order failed or expired
    const rzpOrder = await razorpay.orders.fetch(orderId);
    if (rzpOrder?.status === 'attempted' && (payments?.items || []).length > 0 && (payments.items).every(p => p.status === 'failed')) {
      await pool.query(
        `UPDATE dev_payment_orders SET status = 'failed', updated_at = NOW() WHERE order_id = $1`,
        [orderId]
      );
      return res.status(200).json({
        success: true,
        status: 'failed',
        message: 'Payment failed on Razorpay',
      });
    }

    return res.status(200).json({
      success: true,
      status: 'pending',
      message: 'Payment is still pending',
      data: { orderId, amount: order.amount }
    });
  } catch (error) {
    console.error('V2 checkOrderStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to check order status', error: error.message });
  }
};

/**
 * POST /payment/razorpay-callback
 * Handles Razorpay checkout redirect (e.g. mobile browser redirect flow).
 */
const handleMobileCallback = async (req, res) => {
  const portalUrl = process.env.DEVELOPER_PORTAL_URL || 'https://authservices.mspkapps.in';

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } = req.body;

    if (error || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.warn('Razorpay mobile callback error or missing params:', req.body);
      return res.redirect(`${portalUrl}/transactions?payment=failed`);
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Razorpay mobile callback invalid signature');
      return res.redirect(`${portalUrl}/transactions?payment=invalid_signature`);
    }

    await processSuccessfulPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    return res.redirect(`${portalUrl}/settings?payment=success&orderId=${razorpay_order_id}`);
  } catch (err) {
    console.error('handleMobileCallback error:', err);
    return res.redirect(`${portalUrl}/transactions?payment=error`);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  checkOrderStatus,
  handleMobileCallback,
};
