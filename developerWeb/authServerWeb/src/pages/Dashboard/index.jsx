import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import PlanSelection from '../../components/PlanSelection';
import './Dashboard.scss';

const Dashboard = () => {
  const { developer, updateDeveloper } = useAuth();
  const [openingCpanel, setOpeningCpanel] = useState(false);
  const [cpanelError, setCpanelError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  useEffect(() => {
    checkDeveloperPlan();
  }, []);

  const checkDeveloperPlan = async () => {
    try {
      setLoadingPlan(true);
      const response = await api.get('/developer/my-plan');
      
      setHasPlan(response.data.hasPlan);
      setCurrentPlan(response.data.plan);
    } catch (error) {
      console.error('Failed to check plan:', error);
      setHasPlan(false);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handlePlanSelected = (planData) => {
    setHasPlan(true);
    setCurrentPlan(planData.plan);
  };

  const handleOpenCpanel = async () => {
    setCpanelError('');
    setOpeningCpanel(true);
    try {
      const res = await api.post('/cpanel/cpanel-ticket', {});
      const url = res?.data?.url || res?.url;
      if (!url) throw new Error('No cPanel URL returned');
      window.location.href = url;
    } catch (err) {
      console.error('Open cPanel failed:', err);
      setCpanelError(err?.message || 'Failed to open cPanel. Please try again.');
    } finally {
      setOpeningCpanel(false);
    }
  };

  if (loadingPlan) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <div className="loading-spinner">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show plan selection if no plan
  if (!hasPlan) {
    return <PlanSelection onPlanSelected={handlePlanSelected} />;
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-content">
          <h1>Developer Dashboard</h1>
          
          <div className="welcome-section">
            <h2>Welcome back, {developer?.name || developer?.username}!</h2>
            <p>Your current plan: <strong>{currentPlan?.plan_name || 'Unknown'}</strong></p>
          </div>

          <div className="quick-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={handleOpenCpanel}
              disabled={openingCpanel}
            >
              {openingCpanel ? 'Opening cPanel…' : 'Open cPanel'}
            </button>
          </div>

          {cpanelError && (
            <div className="alert alert-error">
              {cpanelError}
            </div>
          )}

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Apps</h3>
              <p className="stat-value">0</p>
              <p className="stat-label">Total Applications</p>
            </div>

            <div className="stat-card">
              <h3>API Calls</h3>
              <p className="stat-value">0</p>
              <p className="stat-label">This Month</p>
            </div>

            <div className="stat-card">
              <h3>Plan Status</h3>
              <p className="stat-value">{currentPlan?.is_active ? 'Active' : 'Inactive'}</p>
              <p className="stat-label">Current Status</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
