import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import './Legal.scss';

const Policies = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/developer/policies');
        const list = response.data?.policies || [];
        setPolicies(list);
      } catch (err) {
        console.error('Failed to load policies:', err);
        setError('Failed to load policies from server.');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  return (
    <div className="legal-page">
      <div className="container">
        <h1>Platform Policies</h1>

        {error && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading policies...</p>
        ) : policies.length === 0 ? (
          <p>No active policies are configured yet. Please check back later.</p>
        ) : (
          <div className="legal-content">
            {policies.map((policy) => (
              <section key={policy.id} style={{ marginBottom: '2rem' }}>
                <h2>{policy.title}</h2>
                {policy.content ? (
                  <div
                    className="policy-body"
                    dangerouslySetInnerHTML={{ __html: policy.content }}
                  />
                ) : (
                  <p>No content has been published for this policy yet.</p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Policies;
