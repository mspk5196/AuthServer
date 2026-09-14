export default function StatCard({ title, value, label, icon: Icon, trend, color = 'indigo' }) {
  const colorMap = {
    indigo: 'from-indigo-500/15 to-indigo-500/5 text-indigo-600 border-indigo-200',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 border-emerald-200',
    purple: 'from-purple-500/15 to-purple-500/5 text-purple-600 border-purple-200',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 border-amber-200',
  };

  const activeColor = colorMap[color] || colorMap.indigo;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-gradient-to-br ${activeColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-3xl font-black tracking-tight text-slate-900">{value}</h3>
        {label && <p className="mt-1 text-xs text-slate-500 font-medium">{label}</p>}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
