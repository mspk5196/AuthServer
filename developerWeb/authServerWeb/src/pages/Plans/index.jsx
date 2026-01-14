import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import PlanSelection from '../../components/PlanSelection';
import './Plans.scss';

const Plans = () => {
  const navigate = useNavigate();
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const response = await api.get('/developer/my-plan');
        if (response.data.hasPlan && response.data.plan?.plan_id) {
          setCurrentPlanId(response.data.plan.plan_id);
        }
      } catch (error) {
        console.error('Failed to load current plan for plans page:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPlan();
  }, []);

  const handlePlanSelected = () => {
    // After successful selection/upgrade/renew, go back to settings or dashboard
    navigate('/settings');
  };

  if (loading) {
    return (
      <div className="plans-page">
        <div className="container">
          <div className="loading">Loading current plan...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="plans-page">
      <div className="container">
        <div className="plans-header">
          <h1>Manage Your Plan</h1>
          <p>
            Upgrade from the free plan, switch to a different plan, or renew your existing paid plan.
            Free plans do not require payment; paid plans will redirect you to Razorpay checkout.
          </p>
        </div>
        <PlanSelection onPlanSelected={handlePlanSelected} currentPlanId={currentPlanId} />
      </div>
    </div>
  );
};

export default Plans;
