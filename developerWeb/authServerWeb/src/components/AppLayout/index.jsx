import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from '../PrivateRoute';
import PublicLayout from '../Layout/PublicLayout';
import PortalLayout from '../Layout/PortalLayout';
import Home from '../../pages/Home';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import Dashboard from '../../pages/Dashboard';
import Settings from '../../pages/Settings';
import Plans from '../../pages/Plans';
import ForgotPassword from '../../pages/ForgotPassword';
import Pricing from '../../pages/Pricing';
import Terms from '../../pages/Legal/Terms';
import Privacy from '../../pages/Legal/Privacy';
import Refund from '../../pages/Legal/Refund';
import Contact from '../../pages/Legal/Contact';
import Policies from '../../pages/Legal/Policies';
import Documentation from '../../pages/Documentation/Documentation';
import Transactions from '../../pages/Transactions';
import Feedback from '../../pages/Feedback';
import Usage from '../../pages/Usage';

const AppLayout = () => {
  return (
    <Routes>
      {/* Public Pages wrapped in PublicLayout */}
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
      <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
      <Route path="/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />
      <Route path="/pricing" element={<PublicLayout><Pricing /></PublicLayout>} />
      <Route path="/docs" element={<PublicLayout><Documentation /></PublicLayout>} />
      <Route path="/policies" element={<PublicLayout><Policies /></PublicLayout>} />
      <Route path="/terms" element={<PublicLayout><Terms /></PublicLayout>} />
      <Route path="/privacy" element={<PublicLayout><Privacy /></PublicLayout>} />
      <Route path="/refund" element={<PublicLayout><Refund /></PublicLayout>} />
      <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />

      {/* Authenticated Developer Portal Pages wrapped in PortalLayout */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <PortalLayout title="Dashboard">
              <Dashboard />
            </PortalLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <PrivateRoute>
            <PortalLayout title="Plans & Quotas">
              <Plans />
            </PortalLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <PortalLayout title="Account Settings">
              <Settings />
            </PortalLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <PrivateRoute>
            <PortalLayout title="Billing & Transactions">
              <Transactions />
            </PortalLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/feedback"
        element={
          <PrivateRoute>
            <PortalLayout title="Developer Feedback">
              <Feedback />
            </PortalLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/usage"
        element={
          <PrivateRoute>
            <PortalLayout title="Usage & Analytics">
              <Usage />
            </PortalLayout>
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppLayout;
