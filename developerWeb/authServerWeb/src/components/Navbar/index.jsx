import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import './Navbar.scss';

const Navbar = () => {
  const { isAuthenticated, developer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="navbar-brand">
          <span className="logo"><img src="https://mspkapps.in/logo.svg" alt="Logo" style={{height:'50px',width:'50px', borderRadius:'50px'}}/></span>
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
