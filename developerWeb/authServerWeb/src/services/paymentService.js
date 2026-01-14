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
   * Get payment history
   */
  getPaymentHistory: async () => {
    const response = await api.get('/developer/payment/history');
    return response;
  }, 

  /**
   * Initialize Razorpay checkout
   */
  initiatePayment: (orderData, onSuccess, onError) => {
    if (!window.Razorpay) { 
      onError(new Error('Razorpay SDK not loaded'));
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Auth Platform',
      description: `${orderData.planName} - ${orderData.planDuration} days`,
      order_id: orderData.orderId,
      handler: function (response) {
        onSuccess(response);
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
      onError({
        reason: response.error.reason,
        description: response.error.description,
        code: response.error.code
      });
    });

    razorpay.open();
  }
};

export default paymentService;
