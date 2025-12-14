import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [stats, setStats] = useState({ totalApps: 0, monthApiCalls: 0 });

  useEffect(() => {
    checkDeveloperPlan();
  }, []);

  const checkDeveloperPlan = async () => {
    try {
      setLoadingPlan(true);
      const response = await api.get('/developer/my-plan');
      
      setHasPlan(response.data.hasPlan);
      setCurrentPlan(response.data.plan);

      if (response.data.hasPlan) {
        await fetchDashboardStats();
      }
    } catch (error) {
      console.error('Failed to check plan:', error);
      setHasPlan(false);
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/developer/dashboard/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const handlePlanSelected = async (planData) => {
    setHasPlan(true);
    setCurrentPlan(planData.plan || planData);

    // After selecting/upgrading a plan, immediately refresh stats
    try {
      await fetchDashboardStats();
    } catch (err) {
      console.error('Failed to refresh stats after plan change:', err);
    }
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
            <Link to="/policies" className="btn btn-outline btn-large" style={{ marginLeft: '1rem' }}>
              View Policies
            </Link>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
              If cPanel shows a blank page or session error, your session may have expired.
              Close it and click <strong>Open cPanel</strong> again after logging in.
            </p>
          </div>

          <div className="demo-project-card" style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Demo Client Project</h3>
            <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#4b5563' }}>
              Try our open-source demo client that already integrates with this
              authentication platform. Use it as a reference or starter for your own apps.
            </p>
            <a
              href="https://github.com/MSPK-APPS/auth-client-demo.git"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-small"
            >
              View Demo Client on GitHub
            </a>
          </div>

          {cpanelError && (
            <div className="alert alert-error">
              {cpanelError}
            </div>
          )}

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Apps</h3>
              <p className="stat-value">{stats.totalApps || 0}</p>
              <p className="stat-label">Total Applications</p>
            </div>

            <div className="stat-card">
              <h3>API Calls</h3>
              <p className="stat-value">{stats.monthApiCalls?.toLocaleString?.() || stats.monthApiCalls || 0}</p>
              <p className="stat-label">This Month</p>
            </div>

            <div className="stat-card">
              <h3>Plan Status</h3>
              <p className="stat-value">{currentPlan?.is_active ? 'Active' : 'Inactive'}</p>
              <p className="stat-label">Current Status</p>
            </div>
          </div>

          <footer className="dashboard-footer">
            <div className="footer-links">
              <Link to="/policies">Policies</Link>
              <span>•</span>
              <Link to="/terms">Terms</Link>
              <span>•</span>
              <Link to="/privacy">Privacy</Link>
              <span>•</span>
              <Link to="/refund">Refund</Link>
              <span>•</span>
              <Link to="/contact">Contact</Link>
            </div>
            <p className="footer-copyright">
              &copy; {new Date().getFullYear()} MSPK Apps. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
