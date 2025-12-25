import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import PlanFeatures from '../../components/PlanFeatures/PlanFeatures';
import './Pricing.scss';

const Pricing = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      
      try {
        const response = await api.get('/developer/plans');
        setPlans(response.data.plans || []);
        
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
    if (!price || price === 0) return 'Free';
    return `₹${parseFloat(price).toFixed(2)}`;
  };

  const formatDuration = (days) => {
    if (!days) return 'Lifetime';
    if (days === 30) return 'per month';
    if (days === 365) return 'per year';
    return `for ${days} days`;
  };

  return (
    <div className="pricing-page">
      <div className="container">
        <header className="pricing-header">
          <h1>Pricing</h1>
          <p>Choose the plan that fits your application. Start free and upgrade when you grow.</p>
        </header>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : (
          <div className="pricing-grid">
            {(plans || []).map((plan) => {
              const isFree = !plan.price || plan.price === 0;

              return (
                <div key={plan.id} className={`pricing-card ${isFree ? 'pricing-card-free' : ''}`}>
                  <div className="pricing-card-header">
                    <h2>{plan.name}</h2>
                    <p className="pricing-tagline">{plan.description}</p>
                    <div className="pricing-amount">
                      <span className="amount">{formatPrice(plan.price)}</span>
                      {plan.price > 0 && (
                        <span className="duration">{formatDuration(plan.duration_days)}</span>
                      )}
                    </div>
                  </div>

                  <div className="pricing-card-body">
                    <PlanFeatures features={plan.features} listClassName="feature-list" />
                  </div>

                  <div className="pricing-card-footer">
                    <Link to="/register" className={`btn ${isFree ? 'btn-primary' : 'btn-secondary'} btn-block`}>
                      {isFree ? 'Get Started Free' : 'Start with this plan'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
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
