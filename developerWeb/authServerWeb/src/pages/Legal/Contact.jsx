import { Mail, Clock, MessageSquare, Headphones, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Contact = () => {
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@mspkapps.com';

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8 px-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Headphones className="w-3.5 h-3.5 text-indigo-600" />
          Developer Support
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Contact Us</h1>
        <p className="text-slate-600 text-sm max-w-md mx-auto font-medium">
          Need help with SDK integration, enterprise accounts, or custom auth server quotas? We're here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Support Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Email Support</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              For billing, technical queries, or custom plan inquiries.
            </p>
          </div>
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            <span>{supportEmail}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Response Time Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Turnaround Time</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Engineering support hours: Mon–Fri (IST).
            </p>
          </div>
          <p className="text-sm font-bold text-purple-700">
            Typically 1–2 business days
          </p>
        </div>
      </div>

      {/* Quick Links Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Have feedback or spotted a bug?</h3>
            <p className="text-xs text-slate-500 font-medium">Use our feedback submission form directly in the portal.</p>
          </div>
        </div>
        <Link
          to="/feedback"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
        >
          Open Feedback Form
        </Link>
      </div>
    </div>
  );
};

export default Contact;
