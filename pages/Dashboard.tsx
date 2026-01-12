import React, { useEffect, useState } from 'react';
import { getServerStatus, getDatabases } from '../services/api';
import { ServerStatus, Database } from '../types';
import { Icons } from '../components/Icon';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  onNavigateDb: (name: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateDb }) => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [dbs, setDbs] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getServerStatus(), getDatabases()])
      .then(([s, d]) => {
        setStatus(s);
        setDbs(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-slate-400 animate-pulse">Loading server status...</div>;

  const data = dbs.map(db => ({
    name: db.name,
    value: db.collections.reduce((acc, col) => acc + col.docs.length, 0) || 1
  }));

  const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Server Dashboard</h1>
        <p className="text-slate-400 mt-2">Overview of your MongoDB instance</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <Icons.Server className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Version</p>
              <p className="text-xl font-bold text-slate-100">{status?.version}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Icons.Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Databases</p>
              <p className="text-xl font-bold text-slate-100">{dbs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
              <Icons.Refresh className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Connections</p>
              <p className="text-xl font-bold text-slate-100">{status?.connections}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg text-orange-400">
              <Icons.Terminal className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Memory</p>
              <p className="text-xl font-bold text-slate-100">{status?.memoryUsage} MB</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database List */}
        <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-100">Databases</h2>
            <button className="text-emerald-400 text-sm font-medium hover:text-emerald-300 flex items-center gap-1">
              <Icons.Plus className="w-4 h-4" /> New Database
            </button>
          </div>
          <div className="divide-y divide-slate-700">
            {dbs.map(db => (
              <div 
                key={db.name} 
                className="p-4 hover:bg-slate-700/30 transition-colors flex items-center justify-between group cursor-pointer"
                onClick={() => onNavigateDb(db.name)}
              >
                <div className="flex items-center gap-3">
                  <Icons.Database className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  <div>
                    <p className="font-medium text-slate-200">{db.name}</p>
                    <p className="text-xs text-slate-500">{db.collections.length} collections</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icons.ChevronRight className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Storage Distribution</h2>
          <div className="flex-1 min-h-[200px]">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-slate-500 mt-2">
            Document count per database
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;