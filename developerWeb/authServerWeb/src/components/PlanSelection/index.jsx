import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import paymentService from '../../services/paymentService';
import Badge from '../UI/Badge';
import { Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';

/** Build feature lines from features_desc (preferred) or features JSONB fallback */
const getDisplayFeatures = (plan) => {
  const desc = plan.features_desc;
  if (Array.isArray(desc) && desc.length) return desc;

  const f = plan.features;
  if (!f) return [];
  const unlimited = (v) => v === 0 || v === '0' || Number(v) === 0;
  const fmt = (v, singular, plural) => {
    if (unlimited(v)) return `Unlimited ${plural}`;
    return `Up to ${v} ${Number(v) === 1 ? singular : plural}`;
  };
  const lines = [];
  if (f.max_apps != null)           lines.push(fmt(f.max_apps, 'app', 'apps'));
  if (f.max_api_calls != null)      lines.push(unlimited(f.max_api_calls) ? 'Unlimited API calls/month' : `${Number(f.max_api_calls).toLocaleString()} API calls/month`);
  if (f.max_app_groups != null)     lines.push(fmt(f.max_app_groups, 'app group', 'app groups'));
  if (f.max_apps_per_group != null) lines.push(fmt(f.max_apps_per_group, 'app per group', 'apps per group'));
  if (f.google_login)               lines.push('Google OAuth login');
  if (f.support)                    lines.push(`${f.support} support`);
  return lines;
};

const filterEligiblePlans = (planList, currPlanId) => {
  if (!currPlanId) return planList;
  const current = planList.find((p) => p.id === currPlanId);
  if (!current) return planList;
  const currentPrice = Number(current.price || 0);
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

    const pending = paymentService.getPendingPayment();
    if (pending?.orderId) {
      paymentService.checkOrderStatus(pending.orderId)
        .then((res) => {
          if (res.status === 'paid' || res.data?.status === 'paid') {
            paymentService.clearPendingPayment();
            if (onPlanSelected) onPlanSelected(res.data);
          }
        })
        .catch((e) => {
          console.warn('Pending payment check failed on mount:', e);
        });
    }
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    if (!plans || plans.length === 0) return;
    setDisplayedPlans(filterEligiblePlans(plans, currentPlanId));
  }, [plans, currentPlanId]);

  const isFreePrice = (price) => {
    if (price === null || price === undefined) return true;
    const numeric = Number(price);
    return Number.isNaN(numeric) || numeric === 0;
  };

  const handleSelectPlan = async (planId, planPrice) => {
    try {
      setSelecting(true);
      setSelectedPlanId(planId);
      setError('');

      if (currentPlanId && currentPlanId !== planId) {
        const confirmed = window.confirm(
          'Are you sure you want to change your plan? Any downgrade or change will only take effect per our platform billing policy.'
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
        throw new Error(orderResponse.message || 'Failed to create payment order');
      }

      paymentService.initiatePayment(
        orderResponse.data,
        async (razorpayResponse) => {
          try {
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
        (err) => {
          console.error('Payment error:', err);
          setError(err.description || 'Payment failed. Please try again.');
          setSelecting(false);
          setSelectedPlanId(null);
        },
        () => {
          setSelecting(false);
          setSelectedPlanId(null);
        }
      );
    } catch (err) {
      console.error('Failed to select plan:', err);
      setError(err.response?.data?.message || err.message || 'Failed to select plan.');
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-slate-500">Loading plan tiers…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(displayedPlans || []).map((plan) => {
          const features = getDisplayFeatures(plan);
          const isSelecting = selecting && selectedPlanId === plan.id;
          const isFree = isFreePrice(plan.price);
          const isCurrent = currentPlanId && currentPlanId === plan.id;
          const isUnlimited = plan.duration_days === 0 || plan.duration_days === null;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-200 ${
                isCurrent
                  ? 'border-indigo-400 bg-gradient-to-b from-indigo-50/80 to-white shadow-lg ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">{plan.name}</h3>
                  {isCurrent && (
                    <Badge variant="primary" size="sm">
                      <Sparkles className="h-3 w-3" />
                      Current Plan
                    </Badge>
                  )}
                  {!isCurrent && isUnlimited && (
                    <Badge variant="default" size="sm">
                      Lifetime
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-slate-900">
                    {formatPrice(plan.price)}
                  </span>
                  {!isFree && (
                    <span className="text-xs text-slate-500 font-semibold">
                      / {formatDuration(plan)}
                    </span>
                  )}
                </div>

                {plan.description && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-500 font-medium">{plan.description}</p>
                )}

                <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                  <ul className="space-y-2.5">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <button
                  onClick={() => handleSelectPlan(plan.id, plan.price)}
                  disabled={selecting}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-60 cursor-pointer ${
                    isCurrent
                      ? 'border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      : isFree
                      ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400'
                  }`}
                >
                  {isSelecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : isFree ? (
                    isCurrent ? 'Current Free Plan' : `Choose ${plan.name}`
                  ) : isCurrent ? (
                    'Renew Subscription'
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanSelection;
