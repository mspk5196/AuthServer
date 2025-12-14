import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import paymentService from '../../services/paymentService';
import './PlanSelection.scss';

const PlanSelection = ({ onPlanSelected }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/developer/plans');
      setPlans(response.data.plans || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError('Failed to load plans. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId, planPrice) => {
    try {
      setSelecting(true);
      setSelectedPlanId(planId);
      setError('');

      // If plan is free, select directly
      if (!planPrice || planPrice === 0) {
        const response = await api.post('/developer/select-plan', { planId });
        
        if (response.success) {
          onPlanSelected(response.data);
        }
        return;
      }

      // For paid plans, initiate Razorpay payment
      const orderResponse = await paymentService.createOrder(planId);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      // Open Razorpay checkout
      paymentService.initiatePayment(
        orderResponse.data,
        async (razorpayResponse) => {
          // Payment successful, verify on backend
          try {
            const verifyResponse = await paymentService.verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature
            });

            if (verifyResponse.success) {
              onPlanSelected(verifyResponse.data);
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (verifyError) {
            console.error('Payment verification error:', verifyError);
            setError('Payment verification failed. Please contact support with your payment ID.');
          } finally {
            setSelecting(false);
            setSelectedPlanId(null);
          }
        },
        (error) => {
          // Payment failed or cancelled
          console.error('Payment error:', error);
          setError(error.description || 'Payment failed. Please try again.');
          setSelecting(false);
          setSelectedPlanId(null);
        }
      );
    } catch (err) {
      console.error('Failed to select plan:', err);
      setError(err.response?.data?.message || err.message || 'Failed to select plan. Please try again.');
      setSelectedPlanId(null);
      setSelecting(false);
    }
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Free';
    return `₹${parseFloat(price).toFixed(2)}`;
  };

  const formatDuration = (days) => {
    if (!days) return 'Lifetime';
    if (days === 30) return '/ month';
    if (days === 365) return '/ year';
    return `/ ${days} days`;
  };

  if (loading) {
    return (
      <div className="plan-selection">
        <div className="plan-selection-container">
          <div className="loading-spinner">Loading plans...</div>
        </div>
      </div>
    );
  }

  const normalizeFeatures = (raw) => {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (raw && typeof raw === 'object') return Object.values(raw).filter(Boolean);
    if (typeof raw === 'string') return [raw];
    return [];
  };

  return (
    <div className="plan-selection">
      <div className="plan-selection-container">
        <div className="plan-header">
          <h1>Choose Your Plan</h1>
          <p>Select a plan to get started with your developer account</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="plans-grid">
          {(plans || []).map((plan) => {
            const features = normalizeFeatures(plan?.features);

            const isSelecting = selecting && selectedPlanId === plan.id;
            const isFree = !plan.price || plan.price === 0;

            return (
              <div key={plan.id} className={`plan-card ${isFree ? 'plan-free' : ''}`}>
                <div className="plan-card-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="plan-price">
                    <span className="price-amount">{formatPrice(plan.price)}</span>
                    {plan.price > 0 && (
                      <span className="price-duration">{formatDuration(plan.duration_days)}</span>
                    )}
                  </div>
                </div>

                <div className="plan-card-body">
                  {plan.description && (
                    <p className="plan-description">{plan.description}</p>
                  )}

                  {features.length > 0 && (
                    <ul className="plan-features">
                      {features.map((feature, index) => (
                        <li key={index} className="feature-item">
                          <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="plan-card-footer">
                  <button
                    className={`btn ${isFree ? 'btn-primary' : 'btn-secondary'} btn-block`}
                    onClick={() => handleSelectPlan(plan.id, plan.price)}
                    disabled={selecting}
                  >
                    {isSelecting ? 'Processing...' : (isFree ? `Select ${plan.name}` : `Buy ${plan.name}`)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="plan-footer">
          <p className="plan-note">
            You can upgrade your plan at any time from your dashboard settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanSelection;
