import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import './Legal.scss';

const Terms = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        const response = await api.get('/developer/policies');
        const policies = response.data?.policies || [];
        const termsPolicy = policies.find((p) => p.key === 'terms');
        if (termsPolicy) {
          setContent({ title: termsPolicy.title, body: termsPolicy.content });
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
        setError('Failed to load policies from server. Showing default terms.');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  return (
    <div className="legal-page">
      <div className="container">
        <h1>{content?.title || 'Terms & Conditions'}</h1>

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
              These terms describe how you may use the MSPK Auth Platform and related services.
              By creating a developer account or using the APIs, you agree to these terms.
            </p>
            <h2>Use of Service</h2>
            <p>
              You are responsible for any applications and users that integrate with this service.
              You must not use the service for unlawful activities or in ways that violate data
              protection laws in your region.
            </p>
            <h2>Payments</h2>
            <p>
              Paid plans are billed through Razorpay. All charges are in INR. You are responsible
              for any applicable taxes and ensuring valid payment details during checkout.
            </p>
            <h2>Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of the service after
              changes means you accept the revised terms.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Terms;
