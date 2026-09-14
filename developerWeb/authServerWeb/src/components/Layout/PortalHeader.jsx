import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { Menu, ExternalLink, Loader2, Sparkles } from 'lucide-react';

export default function PortalHeader({ onToggleSidebar, title }) {
  const { developer } = useAuth();
  const [openingCpanel, setOpeningCpanel] = useState(false);
  const [cpanelError, setCpanelError] = useState('');

  const handleOpenCpanel = async () => {
    setCpanelError('');
    setOpeningCpanel(true);
    try {
      const res = await api.post('/cpanel/cpanel-ticket', {});
      const url = res?.data?.url || res?.url;
      if (!url) throw new Error('No cPanel URL returned');
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (e) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Open cPanel failed:', err);
      setCpanelError(err?.message || 'Failed to open cPanel.');
      setTimeout(() => setCpanelError(''), 5000);
    } finally {
      setOpeningCpanel(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-slate-900 sm:text-lg">
            {title || 'Developer Portal'}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
            <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
            Developer Space
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {cpanelError && (
          <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md max-w-xs truncate font-medium">
            {cpanelError}
          </span>
        )}

        {/* Open cPanel Quick Action Button */}
        <button
          onClick={handleOpenCpanel}
          disabled={openingCpanel}
          className="relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer"
          title="Launch App Configuration Control Panel"
        >
          {openingCpanel ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Opening cPanel…
            </>
          ) : (
            <>
              Open cPanel
              <ExternalLink className="h-3.5 w-3.5" />
            </>
          )}
        </button>

        {/* User initials indicator */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-xs font-black text-indigo-700 shadow-xs">
          {(developer?.name || developer?.username || 'U').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
