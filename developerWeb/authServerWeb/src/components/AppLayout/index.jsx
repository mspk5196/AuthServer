import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../Navbar';
import PrivateRoute from '../PrivateRoute';
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

const AppLayout = () => {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/plans"
            element={
              <PrivateRoute>
                <Plans />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AppLayout;
