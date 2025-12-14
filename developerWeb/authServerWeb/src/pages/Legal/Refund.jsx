import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import './Legal.scss';

const Refund = () => {
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const response = await api.get('/developer/policies');
        const policies = response.data?.policies || [];
        const refundPolicy = policies.find((p) => p.key === 'refund');
        if (refundPolicy) {
          setContent({ title: refundPolicy.title, body: refundPolicy.content });
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
        setError('Failed to load policies from server. Showing default refund policy.');
      }
    };

    fetchPolicies();
  }, []);

  return (
    <div className="legal-page">
      <div className="container">
        <h1>{content?.title || 'Refund & Cancellation Policy'}</h1>

        {error && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {content?.body ? (
          <div className="legal-content" dangerouslySetInnerHTML={{ __html: content.body }} />
        ) : (
          <>
            <p>
              All payments are processed by Razorpay on our behalf. By purchasing a plan, you
              agree to Razorpay&apos;s payment terms as well as this refund policy.
            </p>
            <h2>Subscriptions</h2>
            <p>
              Subscription charges are generally non-refundable once a billing period starts.
              If you cancel in the middle of an active plan period, no pro-rated or partial refund
              will be provided after payment has been successfully processed and the plan is active.
              In exceptional cases (for example, duplicate charges), you can contact support and
              we will review your request.
            </p>
            <h2>Cancellation</h2>
            <p>
              You can cancel your plan at any time from your account settings. Cancellation stops
              future renewals, but access may continue until the end of the current period.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Refund;
