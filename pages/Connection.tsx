import React, { useState } from 'react';
import { Icons } from '../components/Icon';
import { ConnectionConfig } from '../types';
import { connect } from '../services/api';

interface ConnectionProps {
  onConnect: (config: ConnectionConfig) => void;
}

const Connection: React.FC<ConnectionProps> = ({ onConnect }) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'uri'>('standard');
  const [formData, setFormData] = useState<ConnectionConfig>({
    mode: 'standard',
    name: 'Local Connection',
    host: 'localhost',
    port: '27017',
    username: '',
    password: '',
    authDatabase: 'admin'
  });
  const [uri, setUri] = useState('mongodb://localhost:27017');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const config: ConnectionConfig = activeTab === 'uri' ? {
      ...formData,
      mode: 'uri',
      uri,
      name: 'Remote URI Connection'
    } : {
      ...formData,
      mode: 'standard'
    };

    try {
        await connect(config);
        onConnect(config);
    } catch (err: any) {
        setError(err.message || "Failed to connect. Ensure your backend is running.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      
      {/* Brand Header */}
      <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mx-auto mb-4 rotate-3">
             <Icons.Database className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">MongoDeck</h1>
          <p className="text-slate-400 text-sm mt-2">Professional MongoDB Management</p>
      </div>

      <div className="w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 border border-slate-800 overflow-hidden relative">
        {/* Loading Overlay */}
        {loading && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-emerald-400">
                <Icons.Refresh className="w-8 h-8 animate-spin mb-2" />
                <span className="font-medium animate-pulse">Connecting...</span>
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button 
            onClick={() => setActiveTab('standard')}
            className={`flex-1 py-4 text-sm font-medium transition-all relative flex items-center justify-center gap-2 ${activeTab === 'standard' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
            <Icons.Settings className="w-4 h-4" />
            Standard
            {activeTab === 'standard' && <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('uri')}
            className={`flex-1 py-4 text-sm font-medium transition-all relative flex items-center justify-center gap-2 ${activeTab === 'uri' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
            <Icons.Code className="w-4 h-4" />
            URI String
            {activeTab === 'uri' && <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-start gap-2">
                <Icons.Close className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
            </div>
          )}

          {activeTab === 'standard' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="group">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Display Name</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                  placeholder="e.g. Local Dev"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Host</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                    value={formData.host}
                    onChange={e => setFormData({...formData, host: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Port</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                    value={formData.port}
                    onChange={e => setFormData({...formData, port: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                      value={formData.username}
                      placeholder="Optional"
                      onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                    <input 
                      type="password" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                      value={formData.password}
                      placeholder="Optional"
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                 </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Auth Database</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
                  value={formData.authDatabase}
                  placeholder="admin"
                  onChange={e => setFormData({...formData, authDatabase: e.target.value})}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
               <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Connection String</label>
                <textarea 
                  required
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all font-mono text-sm leading-relaxed"
                  placeholder="mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority"
                  value={uri}
                  onChange={e => setUri(e.target.value)}
                />
                <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500 bg-slate-950/50 p-2 rounded border border-slate-800">
                    <Icons.Settings className="w-3 h-3 mt-0.5" />
                    <p>Paste your full connection URI here. This overrides standard settings.</p>
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
          >
             <Icons.Play className="w-5 h-5 fill-current" />
             Connect to Deck
          </button>
        </form>
      </div>
    </div>
  );
};

export default Connection;