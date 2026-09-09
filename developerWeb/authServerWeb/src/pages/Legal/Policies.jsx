import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

const keyToPath = (key) => {
  switch (key) {
    case 'terms':
      return '/terms';
    case 'privacy':
      return '/privacy';
    case 'refund':
      return '/refund';
    default:
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
    <div className="max-w-4xl mx-auto py-8 space-y-8 px-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          Legal &amp; Compliance
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Platform Policies</h1>
        <p className="text-slate-600 text-sm max-w-lg mx-auto font-medium">
          Review our platform terms, privacy standards, and refund policies for developers and integrated applications.
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
          <p className="text-slate-500 text-sm font-medium">Loading policies...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <p className="text-slate-500 text-sm font-medium">No active policies are configured yet. Please check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {policies.map((policy) => {
            const path = keyToPath(policy.key);
            return (
              <div
                key={policy.id}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">{policy.title}</h2>
                  <div className="space-y-1 text-xs text-slate-500 mb-6 font-medium">
                    <p>Key: <span className="font-mono text-slate-700">{policy.key}</span></p>
                    <p>Version: <span className="font-mono text-slate-700">{policy.version}</span></p>
                  </div>
                </div>

                <Link
                  to={path}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-50 hover:bg-indigo-600 text-slate-800 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <span>View Full Policy</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Policies;
