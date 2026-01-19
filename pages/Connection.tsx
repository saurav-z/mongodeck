import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icon';
import { ConnectionConfig, SavedConnection } from '../types';
import { connect } from '../services/api';
import {
  saveEncryptedConnections,
  loadEncryptedConnections,
  migrateLegacyConnections
} from '../services/encryption';

interface ConnectionProps {
  onConnect: (config: ConnectionConfig) => void;
}

const Connection: React.FC<ConnectionProps> = ({ onConnect }) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'uri' | 'saved'>('standard');
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
  const [uriDisplayName, setUriDisplayName] = useState('');
  const [rememberConnection, setRememberConnection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);

  useEffect(() => {
    // Migrate legacy connections on first load
    migrateLegacyConnections();

    // Load encrypted connections
    try {
      const connections = loadEncryptedConnections();
      setSavedConnections(connections);
    } catch (e) {
      console.error("Failed to load encrypted connections", e);
    }
  }, []);

  useEffect(() => {
    // Save encrypted connections when they change
    try {
      saveEncryptedConnections(savedConnections);
    } catch (e) {
      console.error("Failed to save encrypted connections", e);
    }
  }, [savedConnections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const config: ConnectionConfig = activeTab === 'uri' ? {
      ...formData,
      mode: 'uri',
      uri,
      name: uriDisplayName || 'Remote URI Connection'
    } : {
      ...formData,
      mode: 'standard'
    };

    try {
        await connect(config);

      // Auto-save if remember checkbox is checked
      if (rememberConnection) {
        const connectionName = activeTab === 'uri' ? (uriDisplayName || 'Remote URI Connection') : formData.name;
        handleSaveConnectionInternal(connectionName, config);
      }

        onConnect(config);
    } catch (err: any) {
        setError(err.message || "Failed to connect. Ensure your backend is running.");
    } finally {
        setLoading(false);
    }
  };

  const handleSaveConnectionInternal = (name: string, config: ConnectionConfig) => {
    if (!name) return;

    const now = new Date().toISOString();
    const connection: SavedConnection = {
      name,
      config,
      createdAt: now,
      updatedAt: now
    };

    // Check if a connection with this name already exists
    const existingIndex = savedConnections.findIndex(conn => conn.name === name);
    if (existingIndex > -1) {
      // Update existing connection
      const updatedConnections = [...savedConnections];
      updatedConnections[existingIndex] = { ...connection, createdAt: updatedConnections[existingIndex].createdAt };
      setSavedConnections(updatedConnections);
    } else {
      // Add new connection
      setSavedConnections([...savedConnections, connection]);
    }
  };

  const handleLoadConnection = (savedConn: SavedConnection) => {
    setError(null);
    if (savedConn.config.mode === 'uri') {
      setActiveTab('uri');
      setUri(savedConn.config.uri || '');
      setUriDisplayName(savedConn.name);
      // Also update formData.name in case user switches to standard tab after loading URI
      setFormData(prev => ({ ...prev, name: savedConn.name, mode: 'uri' }));
    } else {
      setActiveTab('standard');
      setFormData(savedConn.config);
    }
  };

  const handleDeleteConnection = (name: string) => {
    if (confirm(`Are you sure you want to delete connection \"${name}\"?`)) {
      setSavedConnections(savedConnections.filter(conn => conn.name !== name));
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
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-4 text-sm font-medium transition-all relative flex items-center justify-center gap-2 ${activeTab === 'saved' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
            <Icons.Link className="w-4 h-4" />
            Saved
            {activeTab === 'saved' && <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-start gap-2">
                <Icons.Close className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
            </div>
          )}

          {activeTab === 'saved' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center py-8">
                <Icons.Link className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-100 mb-2">Saved Connections</h3>
                <p className="text-slate-500 text-sm">
                  {savedConnections.length === 0
                    ? 'No saved connections yet. Connect with "Remember" checked to save.'
                    : `You have ${savedConnections.length} saved connection${savedConnections.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {savedConnections.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {savedConnections.map((savedConn, index) => (
                    <div
                      key={savedConn.name + index}
                      className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-medium truncate">{savedConn.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${savedConn.config.mode === 'uri'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-blue-500/10 text-blue-400'
                            }`}>
                            {savedConn.config.mode === 'uri' ? 'URI' : 'Standard'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {savedConn.config.mode === 'uri'
                            ? (savedConn.config.uri?.substring(0, 50) || '') + (savedConn.config.uri?.length > 50 ? '...' : '')
                            : `${savedConn.config.host}:${savedConn.config.port}`}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          type="button"
                          onClick={() => handleLoadConnection(savedConn)}
                          className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded-md hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                        >
                          <Icons.Play className="w-3 h-3" />
                          Connect
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConnection(savedConn.name)}
                          className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
                          title="Delete connection"
                        >
                          <Icons.Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'standard' ? (
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Display Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                      placeholder="e.g. Production Cluster"
                      value={uriDisplayName}
                      onChange={e => setUriDisplayName(e.target.value)}
                    />
                  </div>

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

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="remember-connection"
              checked={rememberConnection}
              onChange={e => setRememberConnection(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="remember-connection" className="text-sm text-slate-400 cursor-pointer">
              Remember this connection (encrypted)
            </label>
          </div>

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