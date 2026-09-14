import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { CheckCircle2, XCircle, ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react';

const VerifyAppEmail = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [appId, setAppId] = useState(null);

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/apps/verify-app-email/${token}`);
      
      if (response.success) {
        setSuccess(true);
        setAppId(response.appId);
      } else {
        setError(response.message || 'Failed to verify email');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred while verifying your email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        {loading ? (
          <div className="py-8 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <h2 className="text-lg font-semibold text-slate-800">Verifying Support Email...</h2>
            <p className="text-sm text-slate-500">Please wait while we confirm your application support address.</p>
          </div>
        ) : success ? (
          <div className="space-y-5 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Email Verified!</h1>
              <p className="text-sm text-slate-600">
                Your application support email address has been successfully verified.
              </p>
              <p className="text-xs text-slate-400">
                Your application API credentials are fully active and ready to use in production.
              </p>
            </div>

            <div className="pt-4">
              <Link
                to={appId ? `/apps/${appId}` : '/apps'}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to {appId ? 'App Overview' : 'My Applications'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-rose-100">
              <XCircle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verification Failed</h1>
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 font-medium">
                {error}
              </p>
              <p className="text-xs text-slate-400">
                The verification link may have expired or is invalid. You can request a new verification link from your application details page.
              </p>
            </div>

            <div className="pt-4">
              <Link
                to="/apps"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Applications
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyAppEmail;
