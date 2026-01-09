import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import './Legal.scss';

const Privacy = () => {
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const response = await api.get('/developer/policies');
        const policies = response.data?.policies || [];
        const privacyPolicy = policies.find((p) => p.key === 'privacy');
        if (privacyPolicy) {
          setContent({ title: privacyPolicy.title, body: privacyPolicy.content });
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
        setError('Failed to load policies from server. Showing default privacy policy.');
      }
    };

    fetchPolicies();
  }, []);

  return (
    <div className="legal-page">
      <div className="container">
        <h1>{content?.title || 'Privacy Policy'}</h1>

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
              We collect only the minimum information required to operate the MSPK™ Auth Platform,
              such as your developer account details and basic usage metrics.
            </p>
            <h2>Data We Collect</h2>
            <p>
              This includes your name, username, email address, profile photo (if provided), and
              application identifiers. User data from your applications is processed solely for
              authentication and security purposes.
            </p>
            <h2>Data Sharing</h2>
            <p>
              We do not sell or share your data with any third persons, companies, or organisations
              for marketing or unrelated purposes. We may share limited data with trusted
              infrastructure providers (such as email and payment gateways) strictly to operate
              the service.
            </p>
            <h2>Security</h2>
            <p>
              We apply industry-standard security practices, including encryption in transit
              and restricted access to production systems.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Privacy;
