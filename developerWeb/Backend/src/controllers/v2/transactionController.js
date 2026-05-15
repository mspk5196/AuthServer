const pool = require('../../config/db');

/**
 * GET /transactions
 * List all payments with their receipt numbers for the authenticated developer.
 */
const getTransactions = async (req, res) => {
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
         dp.name  AS plan_name,
         dp.duration_days,
         dp.duration_label,
         r.receipt_number,
         r.payment_type,
         r.plan_start_date,
         r.plan_end_date,
         r.id AS receipt_id
       FROM dev_payment_orders po
       JOIN dev_plans dp ON po.plan_id = dp.id
       LEFT JOIN dev_payment_receipts r ON r.order_id = po.order_id
       WHERE po.developer_id = $1
       ORDER BY po.created_at DESC`,
      [developerId]
    );

    res.status(200).json({ success: true, data: { transactions: result.rows } });
  } catch (error) {
    console.error('getTransactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
  }
};

/**
 * GET /transactions/:receiptId/receipt
 * Return full receipt data for rendering / downloading.
 */
const getReceipt = async (req, res) => {
  try {
    const developerId = req.user.userId;
    const { receiptId } = req.params;

    const result = await pool.query(
      `SELECT * FROM dev_payment_receipts
       WHERE id = $1 AND developer_id = $2`,
      [receiptId, developerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.status(200).json({ success: true, data: { receipt: result.rows[0] } });
  } catch (error) {
    console.error('getReceipt error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch receipt', error: error.message });
  }
};

module.exports = { getTransactions, getReceipt };
