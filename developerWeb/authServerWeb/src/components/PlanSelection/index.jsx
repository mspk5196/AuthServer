import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import paymentService from '../../services/paymentService';
import './PlanSelection.scss';

/** Build feature lines from features_desc (preferred) or features JSONB fallback */
const getDisplayFeatures = (plan) => {
  const desc = plan.features_desc;
  if (Array.isArray(desc) && desc.length) return desc;

  const f = plan.features;
  if (!f) return [];
  const unlimited = (v) => v === 0 || v === '0' || Number(v) === 0;
  const fmt = (v, singular, plural) => {
    if (unlimited(v)) return `Unlimited ${plural || singular}`;
    return `Up to ${v} ${Number(v) === 1 ? singular : (plural || singular)}`;
  };
  const lines = [];
  if (f.max_apps != null)           lines.push(fmt(f.max_apps, 'app', 'apps'));
  if (f.max_api_calls != null)      lines.push(unlimited(f.max_api_calls) ? 'Unlimited API calls/month' : `${Number(f.max_api_calls).toLocaleString()} API calls/month`);
  if (f.max_app_groups != null)     lines.push(fmt(f.max_app_groups, 'app group', 'app groups'));
  if (f.max_apps_per_group != null) lines.push(fmt(f.max_apps_per_group, 'app per group', 'apps per group'));
  if (f.google_login)               lines.push('Google login');
  if (f.support)                    lines.push(`${f.support} support`);
  return lines;
};

const filterEligiblePlans = (planList, currPlanId) => {
  if (!currPlanId) return planList;
  const current = planList.find((p) => p.id === currPlanId);
  if (!current) return planList;
  const currentPrice = Number(current.price || 0);
  // Show higher-priced plans (upgrades) AND the current plan itself (for renewals)
  return planList.filter((p) => p.id === currPlanId || Number(p.price || 0) > currentPrice);
};

const PlanSelection = ({ onPlanSelected, currentPlanId }) => {
  const [plans, setPlans] = useState([]);
  const [displayedPlans, setDisplayedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();

    // Check for any pending payment order from mobile app-switch / reload
    const pending = paymentService.getPendingPayment();
    if (pending?.orderId) {
      paymentService.checkOrderStatus(pending.orderId)
        .then((res) => {
          if (res.status === 'paid' || res.data?.status === 'paid') {
            paymentService.clearPendingPayment();
            if (onPlanSelected) {
              onPlanSelected(res.data);
            }
          }
        })
        .catch((e) => {
          console.warn('Pending payment verification failed on mount:', e);
        });
    }
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // v2 filters admin plans server-side
      const response = await api.get('/developer/plans');
      const fetched = response.data?.data?.plans || response.data?.plans || [];
      setPlans(fetched);
      setDisplayedPlans(filterEligiblePlans(fetched, currentPlanId));
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
    setDisplayedPlans(filterEligiblePlans(plans, currentPlanId));
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
            // If already verified through checkOrderStatus
            if (razorpayResponse?.registration || razorpayResponse?.alreadyProcessed) {
              onPlanSelected(razorpayResponse);
              return;
            }

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
        },
        () => {
          // User closed/cancelled the Razorpay checkout
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

  const formatDuration = (plan) => {
    const days = plan.duration_days;
    if (days === 0 || days === null || days === undefined) return 'Unlimited';
    return plan.duration_label || `${days} days`;
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
            const features = getDisplayFeatures(plan);

            const isSelecting = selecting && selectedPlanId === plan.id;
            const isFree = isFreePrice(plan.price);
            const isCurrent = currentPlanId && currentPlanId === plan.id;
            const isUnlimited = plan.duration_days === 0 || plan.duration_days === null;

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
                      <span className="price-duration">/ {formatDuration(plan)}</span>
                    )}
                  </div>
                  {isUnlimited && (
                    <span className="badge-unlimited">Unlimited Duration</span>
                  )}
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
            You can upgrade or renew your plan at any time from your dashboard settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanSelection;
