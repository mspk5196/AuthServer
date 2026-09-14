import { api } from '../utils/api';

const paymentService = {
  /**
   * Create Razorpay order for plan purchase
   */
  createOrder: async (planId) => {
    const response = await api.post('/developer/payment/create-order', { planId });
    return response;
  },

  /**
   * Verify payment after Razorpay checkout
   */
  verifyPayment: async (paymentData) => {
    const response = await api.post('/developer/payment/verify', paymentData);
    return response;
  },

  /**
   * Check order status directly against server & Razorpay API
   */
  checkOrderStatus: async (orderId) => {
    const response = await api.post(`/developer/payment/check-status/${orderId}`);
    return response;
  },

  /**
   * Get payment history
   */
  getPaymentHistory: async () => {
    const response = await api.get('/developer/payment/history');
    return response;
  },

  /**
   * Retrieve any stored pending payment order from localStorage
   */
  getPendingPayment: () => {
    try {
      const raw = localStorage.getItem('pending_payment_order');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Valid for 30 minutes
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        return parsed;
      }
      localStorage.removeItem('pending_payment_order');
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Clear stored pending payment
   */
  clearPendingPayment: () => {
    try {
      localStorage.removeItem('pending_payment_order');
    } catch (e) {
      console.warn('Could not clear pending payment from localStorage:', e);
    }
  },

  /**
   * Initialize Razorpay checkout with mobile resilience
   */
  initiatePayment: (orderData, onSuccess, onError, onDismiss) => {
    if (!window.Razorpay) { 
      onError(new Error('Razorpay SDK not loaded'));
      return;
    }

    // Save pending order to localStorage to recover state if mobile browser reloads
    try {
      localStorage.setItem('pending_payment_order', JSON.stringify({
        orderId: orderData.orderId,
        planName: orderData.planName,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Could not save pending payment order to localStorage:', e);
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Auth Platform',
      description: `${orderData.planName} - ${orderData.planDuration} days`,
      order_id: orderData.orderId,
      handler: function (response) {
        paymentService.clearPendingPayment();
        onSuccess(response);
      },
      modal: {
        ondismiss: function () {
          // On mobile, app switching to UPI (GPay/PhonePe) may fire ondismiss when returning.
          // Check backend status before assuming the user cancelled.
          paymentService.checkOrderStatus(orderData.orderId)
            .then((res) => {
              if (res.status === 'paid' || res.data?.status === 'paid') {
                paymentService.clearPendingPayment();
                onSuccess(res.data);
              } else {
                paymentService.clearPendingPayment();
                if (typeof onDismiss === 'function') {
                  onDismiss();
                } else {
                  onError({
                    code: 'PAYMENT_CANCELLED',
                    description: 'Payment cancelled',
                    reason: 'cancelled'
                  });
                }
              }
            })
            .catch(() => {
              paymentService.clearPendingPayment();
              if (typeof onDismiss === 'function') {
                onDismiss();
              } else {
                onError({
                  code: 'PAYMENT_CANCELLED',
                  description: 'Payment cancelled',
                  reason: 'cancelled'
                });
              }
            });
        }
      },
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      notes: {
        plan_name: orderData.planName
      },
      theme: {
        color: '#667eea'
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true
      }
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on('payment.failed', function (response) {
      paymentService.clearPendingPayment();
      onError({
        reason: response.error?.reason,
        description: response.error?.description,
        code: response.error?.code
      });
    });

    razorpay.open();
  }
};

export default paymentService;
