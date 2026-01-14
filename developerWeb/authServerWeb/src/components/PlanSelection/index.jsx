import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import paymentService from '../../services/paymentService';
import { getFeatureSentences } from '../PlanFeatures/PlanFeatures';
import './PlanSelection.scss';


const PlanSelection = ({ onPlanSelected, currentPlanId }) => {
  const [plans, setPlans] = useState([]);
  const [displayedPlans, setDisplayedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [error, setError] = useState('');

  const isUnlimitedAdmin = (p) => {
    if (!p) return false;
    const n = (p.name || p.plan_name || p.key || p.slug || '').toString().toLowerCase();
    return n === 'unlimited_admin' || n === 'unlimited admin';
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      
      const response = await api.get('/developer/plans');
      const fetched = response.data.plans || [];
      const filtered = fetched.filter((p) => !isUnlimitedAdmin(p));
      setPlans(filtered);
      // initialize displayedPlans based on whether a currentPlanId was provided
      if (currentPlanId) {
        const current = filtered.find((p) => p.id === currentPlanId);
        if (current) {
          const currentPrice = Number(current.price || 0);
          const higher = filtered.filter((p) => Number(p.price || 0) > currentPrice);
          setDisplayedPlans(higher);
        } else {
          setDisplayedPlans(filtered);
        }
      } else {
        setDisplayedPlans(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError('Failed to load plans. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Update displayedPlans whenever plans or currentPlanId change
  useEffect(() => {
    if (!plans || plans.length === 0) return;
    if (!currentPlanId) {
      setDisplayedPlans(plans);
      return;
    }

    const current = plans.find((p) => p.id === currentPlanId);
    if (!current) {
      setDisplayedPlans(plans);
      return;
    }

    const currentPrice = Number(current.price || 0);
    const higher = plans.filter((p) => Number(p.price || 0) > currentPrice);
    setDisplayedPlans(higher);
  }, [plans, currentPlanId]);

  const isFreePrice = (price) => {
    if (price === null || price === undefined) return true;
    const numeric = Number(price);
    if (Number.isNaN(numeric)) return false;
    return numeric === 0;
  };

  const handleSelectPlan = async (planId, planPrice) => {
    try {
      setSelecting(true);
      setSelectedPlanId(planId);
      setError('');

      if (currentPlanId && currentPlanId !== planId) {
        const confirmed = window.confirm(
          'Are you sure you want to change your plan? Any downgrade to a lower-priced plan will only take effect after your current plan period ends.'
        );
        if (!confirmed) {
          setSelecting(false);
          setSelectedPlanId(null);
          return;
        }
      }

      if (isFreePrice(planPrice)) {
        const response = await api.post('/developer/select-plan', { planId });

        if (response.success) {
          onPlanSelected(response.data);
        }
        setSelecting(false);
        setSelectedPlanId(null);
        return;
      }

      const orderResponse = await paymentService.createOrder(planId);

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      paymentService.initiatePayment(
        orderResponse.data,
        async (razorpayResponse) => {
          try {
            const verifyResponse = await paymentService.verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
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
    if (isFreePrice(price)) return 'Free';
    const numeric = Number(price);
    if (Number.isNaN(numeric)) return '₹0.00';
    return `₹${numeric.toFixed(2)}`;
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

  return (
    <div className="plan-selection">
      <div className="plan-selection-container">
        <div className="plan-header">
          <h1>Choose Your Plan</h1>
          <p>
            Select a plan to get started, upgrade your current plan, or renew an existing paid plan.
            Free plans do not require any payment.
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="plans-grid">
          {(displayedPlans || []).map((plan) => {
            const features = getFeatureSentences(plan.features || {});

            const isSelecting = selecting && selectedPlanId === plan.id;
            const isFree = isFreePrice(plan.price);
            const isCurrent = currentPlanId && currentPlanId === plan.id;

            return (
              <div key={plan.id} className={`plan-card ${isFree ? 'plan-free' : ''}`}>
                <div className="plan-card-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  {isCurrent && (
                    <span className="current-plan-badge">Current plan</span>
                  )}
                  <div className="plan-price">
                    <span className="price-amount">{formatPrice(plan.price)}</span>
                    {!isFreePrice(plan.price) && (
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
                    {isSelecting
                      ? 'Processing...'
                      : isFree
                        ? (isCurrent ? 'Stay on Free plan' : `Select ${plan.name}`)
                        : (isCurrent ? 'Renew this plan' : `Buy ${plan.name}`)}
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
