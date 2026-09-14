import { useEffect, useState } from 'react';
import { FileText, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

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
    <div className="max-w-3xl mx-auto py-8 space-y-6 px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          Agreement
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {content?.title || 'Terms & Conditions'}
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm font-medium">
          Please read these terms carefully before utilizing MSPK™ Auth Platform services.
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
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm font-medium">Loading terms...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6 text-slate-700 text-sm leading-relaxed">
          {content?.body ? (
            <div
              className="prose max-w-none prose-headings:text-slate-900 prose-a:text-indigo-600 prose-strong:text-slate-900 font-medium"
              dangerouslySetInnerHTML={{ __html: content.body }}
            />
          ) : (
            <>
              <p className="text-base text-slate-800 font-medium">
                These terms describe how you may use the MSPK™ Auth Platform and related services.
                By creating a developer account or using our APIs, you agree to comply with these terms.
              </p>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  1. Use of Service
                </h2>
                <p>
                  You are responsible for any applications and end-users that integrate with this authentication service.
                  You must not use the platform for unlawful activities, abuse rate limits, or violate data
                  protection regulations in your operating jurisdiction.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">2. Payments &amp; Subscriptions</h2>
                <p>
                  Paid developer tiers are securely processed through Razorpay. All listed charges are in INR unless explicitly specified. You are responsible
                  for maintaining valid billing credentials and applicable local taxes.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">3. Platform Changes &amp; SLA</h2>
                <p>
                  We continuously improve our platform. We may update these terms from time to time. Continued use of our SDKs and APIs after
                  updates constitutes acceptance of the modified terms.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Terms;
