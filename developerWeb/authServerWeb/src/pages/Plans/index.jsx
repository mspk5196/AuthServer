import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import PlanSelection from '../../components/PlanSelection';
import { Loader2 } from 'lucide-react';

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
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-slate-500">Loading plan subscription…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Subscription Plans &amp; Quotas
        </h1>
        <p className="mt-1 text-sm text-slate-600 font-medium">
          Upgrade your plan, increase monthly API limits, or renew active subscriptions.
        </p>
      </div>

      <PlanSelection onPlanSelected={handlePlanSelected} currentPlanId={currentPlanId} />
    </div>
  );
};

export default Plans;

