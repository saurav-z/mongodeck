import React, { useEffect, useState, useRef } from 'react';
import { getServerStatus, getDatabases, exportDatabase, exportCollection, importCollection } from '../services/api';
import { ServerStatus, Database, DbExportConfig, CollectionExportConfig } from '../types';
import { Icons } from '../components/Icon';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  onNavigateDb: (name: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateDb }) => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [dbs, setDbs] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [selectedCol, setSelectedCol] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'bson'>('json');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportDb = async (dbName: string) => {
    setExporting(true);
    try {
      const blob = await exportDatabase({ dbName, format: exportFormat });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dbName}_${Date.now()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCollection = async (dbName: string, colName: string) => {
    setExporting(true);
    try {
      const blob = await exportCollection({ dbName, colName, format: exportFormat as 'json' | 'csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dbName}_${colName}_${Date.now()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportCollection = async (dbName: string, colName: string, file: File) => {
    setExporting(true);
    try {
      await importCollection(dbName, colName, file);
      alert('Import successful!');
      // Refresh databases
      const updatedDbs = await getDatabases();
      setDbs(updatedDbs);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const openExportModal = (dbName: string, colName?: string) => {
    setSelectedDb(dbName);
    setSelectedCol(colName || '');
    setShowExportModal(true);
  };

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
                <Icons.ChevronRight className="w-5 h-5 text-slate-600" />
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-100">Export {selectedCol ? 'Collection' : 'Database'}</h3>
              <button onClick={() => setShowExportModal(false)}><Icons.Close className="text-slate-400 hover:text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">
                  {selectedCol
                    ? `Exporting collection "${selectedCol}" from database "${selectedDb}"`
                    : `Exporting database "${selectedDb}"`
                  }
                </p>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Format</label>
                <select
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="json">JSON</option>
                  {!selectedCol && <option value="bson">BSON</option>}
                  {selectedCol && <option value="csv">CSV</option>}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (selectedCol) {
                      await handleExportCollection(selectedDb, selectedCol);
                    } else {
                      await handleExportDb(selectedDb);
                    }
                    setShowExportModal(false);
                  }}
                  disabled={exporting}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-slate-900 font-bold rounded-lg hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <>
                      <Icons.Refresh className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Icons.Download className="w-4 h-4" />
                      Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;