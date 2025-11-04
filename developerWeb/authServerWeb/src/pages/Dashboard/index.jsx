import { useState } from 'react';
import { api } from '../../utils/api';
import './Dashboard.scss';

const Dashboard = () => {
  const [openingCpanel, setOpeningCpanel] = useState(false);
  const [cpanelError, setCpanelError] = useState('');

  const handleOpenCpanel = async () => {
    setCpanelError('');
    setOpeningCpanel(true);
    try {
      const res = await api.post('/cpanel/cpanel-ticket', {});
      const url = res?.data?.url || res?.url; // support either shape
      if (!url) throw new Error('No cPanel URL returned');
      window.location.href = url;
    } catch (err) {
      console.error('Open cPanel failed:', err);
      setCpanelError(err?.message || 'Failed to open cPanel. Please try again.');
    } finally {
      setOpeningCpanel(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={handleOpenCpanel}
            disabled={openingCpanel}
          >
            {openingCpanel ? 'Opening cPanel…' : 'Open cPanel'}
          </button>
          {cpanelError && (
            <div className="alert alert-error" style={{ maxWidth: 480 }}>
              {cpanelError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
