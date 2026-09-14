import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { tokenService } from '../../services/tokenService';
import {
  Layers,
  Users,
  FolderGit2,
  Activity,
  Plus,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Clock,
  ChevronRight
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { developer } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = tokenService.get();
      const response = await api.get('/apps/dashboard', token);
      
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = () => {
    navigate('/apps');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Loading your applications and stats…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white border border-rose-200 rounded-3xl shadow-xs max-w-lg mx-auto text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Failed to Load Dashboard</h2>
        <p className="text-xs text-rose-600 font-medium">{error}</p>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const apps = dashboardData?.recentApps || [];
  const planInfo = dashboardData?.planInfo;

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold mb-3 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>Authentication Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {developer?.name || developer?.username || 'Developer'}!
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl font-medium">
              Manage client applications, configure user fields, assign app groups, and inspect authentication history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {planInfo && (
              <div className="px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 text-xs font-black backdrop-blur-xs">
                {planInfo.name} Tier
              </div>
            )}
            <button
              onClick={handleCreateApp}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-black transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Application
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Apps */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Apps
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {stats.totalApps || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Configured client applications</p>
        </div>

        {/* Total Users */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Registered Users
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-600">
            {stats.totalUsers || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Users across all applications</p>
        </div>

        {/* App Groups */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              App Groups
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-purple-700">
            {stats.groupsUsed || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Multi-app unified groups</p>
        </div>

        {/* API Calls (This Month) */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly API Calls
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-700">
            {Number(stats.monthApiCalls || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Today: {Number(stats.todayApiCalls || 0).toLocaleString()} calls
          </p>
        </div>
      </div>

      {/* Recent Applications Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Applications</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Quick access to manage credentials and users</p>
          </div>
          <button
            onClick={() => navigate('/apps')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {apps.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No applications created yet</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mt-1">
              Create your first application to generate API Keys, configure OAuth, and begin integrating user authentication.
            </p>
            <button
              onClick={handleCreateApp}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create Your First App
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {apps.slice(0, 3).map((app) => (
              <div
                key={app.id}
                onClick={() => navigate(`/apps/${app.id}`)}
                className="group p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md bg-white transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center text-sm font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {app.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        app.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {app.status || 'Active'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                    {app.description || 'No description provided'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(app.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Manage
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
