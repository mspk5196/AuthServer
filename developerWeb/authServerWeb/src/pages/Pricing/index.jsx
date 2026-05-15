import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import './Pricing.scss';

/** Render features from features_desc (array of strings) or fall back to features object */
const PlanFeatureList = ({ featuresDesc, features }) => {
  // features_desc is preferred — it's the admin-curated list
  const items = Array.isArray(featuresDesc) && featuresDesc.length
    ? featuresDesc
    : buildFallbackFeatures(features);

  if (!items.length) return null;
  return (
    <ul className="feature-list">
      {items.map((item, i) => (
        <li key={i}>
          <span className="feature-check">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
};

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
  const [grouped, setGrouped] = useState({});   // { duration_label: [plans] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/developer/plans');
        const plans = response.data?.data?.plans || response.data?.plans || [];

        // Group by duration_label (e.g. "Monthly", "90 Days", "Unlimited")
        const byLabel = {};
        for (const plan of plans) {
          const label = plan.duration_label || 'Other';
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
    <div className="pricing-page">
      <div className="container">
        <header className="pricing-header">
          <h1>Pricing</h1>
          <p>Choose the plan that fits your application. Start free and upgrade when you grow.</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          Object.entries(grouped).map(([label, plans]) => (
            <section key={label} className="pricing-section">
              <h2 className="pricing-section-title">{label}</h2>
              <div className="pricing-grid">
                {plans.map((plan) => {
                  const isFree = !plan.price || Number(plan.price) === 0;
                  const unlimited = isUnlimited(plan);
                  return (
                    <div key={plan.id} className={`pricing-card ${isFree ? 'pricing-card-free' : ''}`}>
                      <div className="pricing-card-header">
                        <h3>{plan.name}</h3>
                        {plan.description && (
                          <p className="pricing-tagline">{plan.description}</p>
                        )}
                        <div className="pricing-amount">
                          <span className="amount">{formatPrice(plan.price)}</span>
                          {!isFree && (
                            <span className="duration">
                              {unlimited ? '/ unlimited' : `/ ${plan.duration_label || plan.duration_days + ' days'}`}
                            </span>
                          )}
                        </div>
                        {unlimited && (
                          <span className="badge-unlimited">Unlimited Duration</span>
                        )}
                      </div>

                      <div className="pricing-card-body">
                        <PlanFeatureList
                          featuresDesc={plan.features_desc}
                          features={plan.features}
                        />
                      </div>

                      <div className="pricing-card-footer">
                        <Link
                          to="/register"
                          className={`btn ${isFree ? 'btn-primary' : 'btn-secondary'} btn-block`}
                        >
                          {isFree ? 'Get Started Free' : 'Get Started'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        <div className="pricing-note">
          <p>
            Payments are powered by Razorpay. For billing or refund questions, please contact us via the
            <Link to="/contact"> contact page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
