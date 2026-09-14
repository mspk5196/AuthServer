const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { getTransactions, getReceipt } = require('../../controllers/v2/transactionController');

router.get('/transactions', authenticateToken, getTransactions);
router.get('/transactions/:receiptId/receipt', authenticateToken, getReceipt);

module.exports = router;
