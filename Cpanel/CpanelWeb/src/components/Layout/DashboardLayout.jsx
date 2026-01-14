import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { developer, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionExpiry, setSessionExpiry] = useState(null);

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : 'D';
  };

  // Initialize session expiry time (15 minutes from now)
  useEffect(() => {
    const storedExpiry = localStorage.getItem('cpanel_session_expiry');
    if (!storedExpiry) {
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
      localStorage.setItem('cpanel_session_expiry', expiryTime.toISOString());
      setSessionExpiry(expiryTime);
    } else {
      setSessionExpiry(new Date(storedExpiry));
    }
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if session expired
  useEffect(() => {
    if (sessionExpiry && currentTime >= sessionExpiry) {
      logout();
    }
  }, [currentTime, sessionExpiry, logout]);

  // Format time remaining
  const getTimeRemaining = () => {
    if (!sessionExpiry) return '15:00';
    const diff = sessionExpiry - currentTime;
    if (diff <= 0) return '00:00';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format current time in IST
  const getISTTime = () => {
    return currentTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get warning class based on time remaining
  const getTimerClass = () => {
    if (!sessionExpiry) return '';
    const diff = sessionExpiry - currentTime;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 2) return 'timer-critical';
    if (minutes < 5) return 'timer-warning';
    return '';
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <a href="/" className="sidebar-logo">
            <img src="/logo.png" alt="MSPK™ Apps" style={{ height: '32px', width: '32px', borderRadius: '8px' }} />
            <span style={{ marginLeft: '0.5rem' }}>cPanel</span>
          </a>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main</div>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Home
            </NavLink>
            <NavLink to="/apps" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Apps
            </NavLink>
            <NavLink to="/groups" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="8" cy="8" r="3" />
                <circle cx="16" cy="16" r="3" />
                <path d="M11 9.5l3 3" />
              </svg>
              Groups
            </NavLink>
            <NavLink to="/documentation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Documentation
            </NavLink>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Account</div>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3" />
              </svg>
              Settings
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="session-timer">
            <div className="timer-row">
              <svg className="timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div className="timer-info">
                <div className="timer-label">Session Expires</div>
                <div className={`timer-value ${getTimerClass()}`}>{getTimeRemaining()}</div>
              </div>
            </div>
            <div className="timer-row">
              <svg className="timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div className="timer-info">
                <div className="timer-label">IST</div>
                <div className="timer-date">{getISTTime()}</div>
              </div>
            </div>
          </div>
          <div className="user-info">
            <div className="user-avatar">
              {developer ? getInitials(developer.name, developer.email) : 'D'}
            </div>
            <div className="user-details">
              <div className="user-name">{developer?.name || developer?.username || 'Developer'}</div>
              <div className="user-email">{developer?.email || ''}</div>
            </div>
            <button
              className="logout-btn"
              onClick={logout}
              title="Logout"
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
