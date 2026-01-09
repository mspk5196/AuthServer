import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { developer, logout } = useAuth();

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : 'D';
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
