import { useState, useEffect } from 'react';
import paymentService from '../../services/paymentService';
import './PaymentHistory.scss';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getPaymentHistory();
      setPayments(response.data.payments || []);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      setError('Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      paid: 'status-success',
      created: 'status-pending',
      failed: 'status-error'
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentMethodLabel = (method) => {
    if (!method) return 'N/A';
    
    const methods = {
      upi: 'UPI',
      card: 'Card',
      netbanking: 'Net Banking',
      wallet: 'Wallet'
    };

    return methods[method] || method.toUpperCase();
  };

  if (loading) {
    return (
      <div className="payment-history">
        <div className="loading-spinner">Loading payment history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-history">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="payment-history">
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3>No Payment History</h3>
          <p>You haven't made any payments yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-history">
      <div className="payment-history-header">
        <h2>Payment History</h2>
        <p>View all your payment transactions</p>
      </div>

      <div className="payments-table-container">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Order ID</th>
              <th>Payment ID</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{formatDate(payment.created_at)}</td>
                <td>
                  <div className="plan-info">
                    <strong>{payment.plan_name}</strong>
                    {payment.duration_days && (
                      <span className="duration">{payment.duration_days} days</span>
                    )}
                  </div>
                </td>
                <td className="amount">{formatAmount(payment.amount)}</td>
                <td>{getPaymentMethodLabel(payment.payment_method)}</td>
                <td>{getStatusBadge(payment.status)}</td>
                <td className="order-id">
                  <code>{payment.order_id}</code>
                </td>
                <td className="payment-id">
                  {payment.payment_id ? (
                    <code>{payment.payment_id}</code>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentHistory;
