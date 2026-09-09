import { useEffect, useState } from 'react';
import { Lock, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

const Privacy = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        const response = await api.get('/developer/policies');
        const policies = response.data?.policies || [];
        const privacyPolicy = policies.find((p) => p.key === 'privacy');
        if (privacyPolicy) {
          setContent({ title: privacyPolicy.title, body: privacyPolicy.content });
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
        setError('Failed to load policies from server. Showing default privacy policy.');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6 px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          Data Protection
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {content?.title || 'Privacy Policy'}
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm font-medium">
          How we handle, secure, and respect your data and developer credentials.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm font-medium">Loading privacy policy...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6 text-slate-700 text-sm leading-relaxed">
          {content?.body ? (
            <div
              className="prose max-w-none prose-headings:text-slate-900 prose-a:text-emerald-600 prose-strong:text-slate-900 font-medium"
              dangerouslySetInnerHTML={{ __html: content.body }}
            />
          ) : (
            <>
              <p className="text-base text-slate-800 font-medium">
                We collect only the essential information necessary to provide and secure authentication services across your applications.
              </p>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  1. Information We Collect
                </h2>
                <p>
                  This includes developer account details (name, email address, profile avatar), application identifiers (Client IDs, secrets), and basic authentication telemetry. User data passing through tokens is processed strictly for signature verification and session lifecycle management.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">2. No Third-Party Data Selling</h2>
                <p>
                  We never sell, rent, or trade your personal information or user session data to third parties. We share data only with necessary infrastructure providers (such as encrypted transactional email delivery and Razorpay payment gateway) to perform core functions.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">3. Cryptographic Security Standards</h2>
                <p>
                  All credentials and tokens are transmitted over TLS/HTTPS with industry standard hashing (Argon2 / BCrypt / SHA-256) and AES payload encryption where applicable.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Privacy;
