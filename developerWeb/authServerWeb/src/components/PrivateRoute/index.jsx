import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

const PrivateRoute = ({ children, requireVerification = false }) => {
  const { developer, loading, initialized } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (!initialized || loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // Check JWT token validity
  if (!authService.isAuthenticated()) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is authenticated
  if (!developer) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check email verification if required
  if (requireVerification && !developer.is_verified) {
    return (
      <div className="container" style={{ marginTop: '2rem' }}>
        <div className="alert alert-warning">
          <strong>Email Verification Required</strong>
          <p>Please verify your email address to access this feature.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
