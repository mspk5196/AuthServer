import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import Badge from '../../components/UI/Badge';
import { Check, Loader2, Sparkles, ArrowRight } from 'lucide-react';

const buildFallbackFeatures = (f) => {
  if (!f) return [];
  const unlimited = (v) => v === 0 || v === '0' || v === null || v === undefined;
  const fmt = (v, label) => unlimited(Number(v)) ? `Unlimited ${label}` : `Up to ${v} ${label}`;
  const lines = [];
  if (f.max_apps != null)           lines.push(fmt(f.max_apps, 'apps'));
  if (f.max_api_calls != null)      lines.push(unlimited(Number(f.max_api_calls)) ? 'Unlimited API calls/month' : `${Number(f.max_api_calls).toLocaleString()} API calls/month`);
  if (f.max_app_groups != null)     lines.push(fmt(f.max_app_groups, 'app groups'));
  if (f.max_apps_per_group != null) lines.push(fmt(f.max_apps_per_group, 'apps per group'));
  if (f.google_login)               lines.push('Google login');
  if (f.support)                    lines.push(`${f.support} support`);
  return lines;
};

const Pricing = () => {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/developer/plans');
        const plans = response.data?.data?.plans || response.data?.plans || [];

        const byLabel = {};
        for (const plan of plans) {
          const label = plan.duration_label || 'Standard';
          if (!byLabel[label]) byLabel[label] = [];
          byLabel[label].push(plan);
        }
        setGrouped(byLabel);
      } catch (err) {
        console.error('Failed to fetch plans:', err);
        setError('Failed to load plans. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const formatPrice = (price) => {
    const n = Number(price);
    if (!price || n === 0) return 'Free';
    return `₹${n.toFixed(2)}`;
  };

  const isUnlimited = (plan) =>
    (plan.duration_days === 0 || plan.duration_days === null || plan.duration_days === '0');

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Transparent Pricing</span>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-5xl tracking-tight">
          Simple, scalable pricing for every app
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Start building for free with essential developer quotas, and upgrade seamlessly as your user base scales.
        </p>
      </div>

      {error && (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 text-center">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-500">Loading pricing plans…</p>
          </div>
        </div>
      ) : (
        <div className="mt-14 space-y-16">
          {Object.entries(grouped).map(([label, plans]) => (
            <div key={label}>
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-8">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{label} Plans</h2>
                <Badge variant="primary" size="sm">Available in India</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan) => {
                  const isFree = !plan.price || Number(plan.price) === 0;
                  const unlimited = isUnlimited(plan);
                  const items = Array.isArray(plan.features_desc) && plan.features_desc.length
                    ? plan.features_desc
                    : buildFallbackFeatures(plan.features);

                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-col justify-between rounded-3xl border p-8 transition-all duration-200 ${
                        !isFree
                          ? 'border-indigo-300 bg-gradient-to-b from-indigo-50/70 to-white shadow-lg ring-1 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                          {unlimited && (
                            <Badge variant="success" size="sm">Lifetime</Badge>
                          )}
                        </div>

                        {plan.description && (
                          <p className="mt-2 text-xs text-slate-500 leading-relaxed font-medium">{plan.description}</p>
                        )}

                        <div className="mt-6 flex items-baseline gap-1">
                          <span className="text-4xl font-black text-slate-900">
                            {formatPrice(plan.price)}
                          </span>
                          {!isFree && (
                            <span className="text-xs text-slate-500 font-semibold">
                              / {unlimited ? 'lifetime' : plan.duration_label || plan.duration_days + ' days'}
                            </span>
                          )}
                        </div>

                        <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                          <ul className="space-y-3">
                            {items.map((feat, i) => (
                              <li key={i} className="flex items-start gap-3 text-xs text-slate-700 font-medium">
                                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-8 pt-4">
                        <Link
                          to="/register"
                          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                            isFree
                              ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                              : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400'
                          }`}
                        >
                          {isFree ? 'Get Started Free' : `Choose ${plan.name}`}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 max-w-2xl mx-auto shadow-xs font-medium">
        <p>
          All payments are securely processed through Razorpay in Indian Rupees (INR).
          For custom enterprise quotas or high-volume discounts, please contact developer support.
        </p>
      </div>
    </div>
  );
};

export default Pricing;
