import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.scss';

const Navbar = () => {
  const { isAuthenticated, developer, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="navbar-brand">
          <span className="logo">
            <img
              src="/logo.png"
              alt="MSPK™ Apps"
              style={{ height: '40px', width: '40px', borderRadius: '8px' }}
            />
          </span>
          <span className="brand-name">Auth Platform</span>
        </Link>

        {isAuthenticated ? (
          <div className="navbar-menu">
            <Link 
              to="/dashboard" 
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/settings" 
              className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
            >
              Settings
            </Link>
            <Link 
              to="/policies" 
              className={`nav-link ${isActive('/policies') ? 'active' : ''}`}
            >
              Policies
            </Link>
            <div className="navbar-user">
              <span className="user-name">Hello, {developer?.name}</span>
              <button onClick={handleLogout} className="btn btn-sm btn-outline">
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="navbar-menu">
            <Link 
              to="/pricing" 
              className={`nav-link ${isActive('/pricing') ? 'active' : ''}`}
            >
              Pricing
            </Link>
            <Link 
              to="/docs" 
              className={`nav-link ${isActive('/docs') ? 'active' : ''}`}
            >
              Documentation
            </Link>
            <Link 
              to="/policies" 
              className={`nav-link ${isActive('/policies') ? 'active' : ''}`}
            >
              Policies
            </Link>
            <Link to="/login" className="nav-link">
              Login
            </Link>
            <Link to="/register" className="btn btn-sm btn-primary">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
