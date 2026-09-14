const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const {
  createOrder,
  verifyPayment,
  checkOrderStatus,
  handleMobileCallback,
} = require('../../controllers/v2/paymentControllerV2');

router.post('/payment/create-order', authenticateToken, createOrder);
router.post('/payment/verify', authenticateToken, verifyPayment);
router.post('/payment/check-status/:orderId', authenticateToken, checkOrderStatus);
router.post('/payment/razorpay-callback', handleMobileCallback);

module.exports = router;
