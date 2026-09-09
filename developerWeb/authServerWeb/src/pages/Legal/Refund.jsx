import { useEffect, useState } from 'react';
import { RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

const Refund = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        const response = await api.get('/developer/policies');
        const policies = response.data?.policies || [];
        const refundPolicy = policies.find((p) => p.key === 'refund');
        if (refundPolicy) {
          setContent({ title: refundPolicy.title, body: refundPolicy.content });
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
        setError('Failed to load policies from server. Showing default refund policy.');
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
          <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
          Billing Policy
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {content?.title || 'Refund & Cancellation Policy'}
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm font-medium">
          Guidelines regarding subscription cancellations, renewals, and payment refunds.
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
          <p className="text-slate-500 text-sm font-medium">Loading refund policy...</p>
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
                All developer subscription payments are processed securely through Razorpay. By upgrading to a paid plan, you agree to these payment and cancellation terms.
              </p>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-indigo-600" />
                  1. Subscription Billing
                </h2>
                <p>
                  Developer plan fees are billed in advance for the selected billing cycle (monthly, quarterly, or yearly). Once a billing cycle starts and digital API quotas are provisioned, charges are non-refundable.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">2. Plan Cancellation &amp; Upgrades</h2>
                <p>
                  You can cancel or modify your subscription at any time from your account settings. If you cancel an active tier, future auto-renewals will cease immediately. For plan upgrades, payments are applied towards extending or transitioning your quota limits.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">3. Exceptional Refund Requests</h2>
                <p>
                  In rare cases involving accidental duplicate transactions or billing discrepancies, please reach out to our support desk with your payment transaction ID. Our team will review and process eligible refunds to the original payment source within 5-7 business days.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Refund;
