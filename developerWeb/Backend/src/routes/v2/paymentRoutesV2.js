const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { createOrder, verifyPayment } = require('../../controllers/v2/paymentControllerV2');

router.post('/payment/create-order', authenticateToken, createOrder);
router.post('/payment/verify', authenticateToken, verifyPayment);

module.exports = router;
