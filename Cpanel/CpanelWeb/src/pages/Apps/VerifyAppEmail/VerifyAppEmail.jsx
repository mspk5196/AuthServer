import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../services/api';
import './VerifyAppEmail.css';

const VerifyAppEmail = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [appId, setAppId] = useState(null);

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/apps/verify-app-email/${token}`);
      
      if (response.success) {
        setSuccess(true);
        setAppId(response.appId);
      } else {
        setError(response.message || 'Failed to verify email');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred while verifying your email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-email-container">
      <div className="verify-email-content">
        {loading ? (
          <div className="verify-loading">
            <div className="spinner"></div>
            <p>Verifying your email...</p>
          </div>
        ) : success ? (
          <div className="verify-success">
            <div className="success-icon">✅</div>
            <h1>Email Verified!</h1>
            <p>Your app support email has been successfully verified.</p>
            <p className="sub-text">Your API credentials are now active and ready to use.</p>
            <a href="/apps" className="btn-primary">
              Return to My Apps
            </a>
          </div>
        ) : (
          <div className="verify-error">
            <div className="error-icon">❌</div>
            <h1>Verification Failed</h1>
            <p>{error}</p>
            <a href="/apps" className="btn-primary">
              Return to My Apps
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyAppEmail;
