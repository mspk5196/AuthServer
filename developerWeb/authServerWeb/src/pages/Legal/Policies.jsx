import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import './Legal.scss';

const keyToPath = (key) => {
  switch (key) {
    case 'terms':
      return '/terms';
    case 'privacy':
      return '/privacy';
    case 'refund':
      return '/refund';
    default:
      // Fallback: send to generic policies page filtered by key in future
      return '/terms';
  }
};

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
        <p className="policy-intro" style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
          Select a policy below to view its full details on the dedicated page.
        </p>

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
          <div className="policy-selector-grid">
            {policies.map((policy) => {
              const path = keyToPath(policy.key);
              return (
                <div key={policy.id} className="policy-card">
                  <h2>{policy.title}</h2>
                  <p className="policy-key">Key: {policy.key}</p>
                  <p className="policy-version">Version: {policy.version}</p>
                  <Link to={path} className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
                    View Policy
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Policies;
