import { useState, useEffect, useCallback } from 'react';
import transactionService from '../../services/transactionService';
import Modal from '../../components/Modal';
import './Transactions.scss';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionService.getTransactions();
      setTransactions(response.data?.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = useCallback(async (receiptId) => {
    if (!receiptId) return;
    try {
      setReceiptLoading(true);
      const response = await transactionService.getReceipt(receiptId);
      setReceipt(response.data?.receipt || null);
    } catch (err) {
      console.error('Failed to load receipt:', err);
      alert('Could not load receipt. Please try again.');
    } finally {
      setReceiptLoading(false);
    }
  }, []);

  const handlePrintReceipt = () => {
    const content = document.getElementById('receipt-print-area');
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Receipt ${receipt?.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            td { padding: 8px 12px; border-bottom: 1px solid #eee; }
            td:first-child { font-weight: bold; width: 45%; background: #f9f9f9; }
            h2 { color: #1a73e8; }
            .logo { height: 40px; margin-bottom: 8px; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const fmt = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString('en-IN', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : '—';

  const fmtDateTime = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleString('en-IN', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '—';

  const fmtAmount = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  const typeLabel = (t) =>
    ({ initial_purchase: 'New Purchase', renewal: 'Renewal', upgrade: 'Upgrade' }[t] || t || '—');

  const statusClass = (s) =>
    ({ paid: 'status-success', created: 'status-pending', failed: 'status-error' }[s] || 'status-pending');

  return (
    <div className="transactions-page">
      <div className="container">
        <div className="page-header">
          <h1>Transactions</h1>
          <p>Your complete payment history and receipts.</p>
        </div>

        {loading && <div className="loading">Loading transactions...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && transactions.length === 0 && (
          <div className="empty-state">
            <p>No transactions yet.</p>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <div className="table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{fmtDateTime(tx.created_at)}</td>
                    <td>
                      <strong>{tx.plan_name}</strong>
                      {tx.duration_label && (
                        <span className="duration-label"> · {tx.duration_label}</span>
                      )}
                    </td>
                    <td>{typeLabel(tx.payment_type)}</td>
                    <td className="amount">{fmtAmount(tx.amount)}</td>
                    <td>
                      <span className={`status-badge ${statusClass(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="receipt-num">
                      {tx.receipt_number ? (
                        <code>{tx.receipt_number}</code>
                      ) : (
                        <span className="na">—</span>
                      )}
                    </td>
                    <td>
                      {tx.receipt_id && (
                        <button
                          className="btn-receipt"
                          onClick={() => handleViewReceipt(tx.receipt_id)}
                          disabled={receiptLoading}
                        >
                          {receiptLoading ? '...' : 'View Receipt'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <Modal onClose={() => setReceipt(null)}>
          <div className="receipt-modal">
            <div className="receipt-modal-header">
              <h2>Payment Receipt</h2>
              <button className="btn-print" onClick={handlePrintReceipt}>
                🖨 Print / Save as PDF
              </button>
            </div>

            <div id="receipt-print-area">
              <img
                src="/logo.png"
                alt="MSPK™ Apps"
                className="receipt-logo"
              />
              <h2>Payment Receipt</h2>
              <table className="receipt-table">
                <tbody>
                  <tr><td>Receipt No.</td><td><strong>{receipt.receipt_number}</strong></td></tr>
                  <tr><td>Transaction Type</td><td>{typeLabel(receipt.payment_type)}</td></tr>
                  <tr><td>Plan</td><td>{receipt.plan_name}</td></tr>
                  {receipt.duration_label && (
                    <tr><td>Duration</td><td>{receipt.duration_label}</td></tr>
                  )}
                  <tr><td>Developer</td><td>{receipt.developer_name}</td></tr>
                  <tr><td>Email</td><td>{receipt.developer_email}</td></tr>
                  <tr>
                    <td>Amount Paid</td>
                    <td className="receipt-amount">
                      {fmtAmount(receipt.amount)} {receipt.currency}
                    </td>
                  </tr>
                  <tr><td>Payment Method</td><td>{receipt.payment_method || '—'}</td></tr>
                  <tr><td>Payment ID</td><td><small>{receipt.payment_id || '—'}</small></td></tr>
                  <tr><td>Order ID</td><td><small>{receipt.order_id}</small></td></tr>
                  <tr><td>Plan Active From</td><td>{fmt(receipt.plan_start_date)}</td></tr>
                  <tr><td>Plan Valid Until</td><td>{fmt(receipt.plan_end_date) || 'No expiry'}</td></tr>
                  <tr><td>Date</td><td>{fmtDateTime(receipt.created_at)}</td></tr>
                </tbody>
              </table>
              <p className="receipt-footer">
                Powered by MSPK™ Apps
              </p>
            </div>

            <div className="receipt-modal-actions">
              <button className="btn-secondary" onClick={() => setReceipt(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Transactions;
