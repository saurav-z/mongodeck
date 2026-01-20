import React, { useState, useEffect } from 'react';
import { Icons } from './Icon';
import { SavedConnection } from '../types';
import { loadEncryptedConnections } from '../services/encryption';

interface SidebarProps {
  databases: any[];
  currentDb: string | null;
  onSelectDb: (name: string) => void;
  onLogout: () => void;
  navigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenCommandPanel: () => void;
  onOpenImportExport: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ databases, currentDb, onSelectDb, onLogout, navigate, isOpen, onClose, onOpenCommandPanel, onOpenImportExport }) => {
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [showSavedConnections, setShowSavedConnections] = useState(false);

  useEffect(() => {
    try {
      const connections = loadEncryptedConnections();
      setSavedConnections(connections);
    } catch (error) {
      console.error('Failed to load saved connections:', error);
    }
  }, []);

  const handleConnectToSaved = (conn: SavedConnection) => {
    // This would need to trigger a connection in the parent component
    // For now, we'll just show the connection details
    alert(`Connect to: ${conn.name}\n${conn.config.mode === 'uri' ? conn.config.uri : `${conn.config.host}:${conn.config.port}`}`);
  };

  const handleDeleteSaved = (name: string) => {
    if (confirm(`Delete saved connection "${name}"?`)) {
      // This would need to update the saved connections
      // For now, we'll just show a message
      alert(`Would delete: ${name}`);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { navigate('/'); onClose(); }}>
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow shadow-emerald-500/20">
                    <Icons.Database className="text-slate-900 w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-slate-100 tracking-tight">MongoDeck</span>
            </div>
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                <Icons.Close className="w-5 h-5" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Main
          </div>
          <button 
            onClick={() => { navigate('/'); onClose(); }}
            className="w-full px-4 py-2 text-left text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 flex items-center gap-3 transition-colors"
          >
            <Icons.Dashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => { onOpenCommandPanel(); onClose(); }}
            className="w-full px-4 py-2 text-left text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 flex items-center gap-3 transition-colors"
          >
            <Icons.Terminal className="w-4 h-4" />
            <span>Console (Ctrl+K)</span>
          </button>
          <button
            onClick={() => { navigate('/import-export'); onClose(); }}
            className="w-full px-4 py-2 text-left text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 flex items-center gap-3 transition-colors"
          >
            <Icons.Download className="w-4 h-4" />
            <span>Import/Export</span>
          </button>

          <div className="px-4 mt-6 mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Databases</span>
          </div>
          
          <div className="space-y-0.5">
            {databases.map((db) => (
              <button
                key={db.name}
                onClick={() => { onSelectDb(db.name); onClose(); }}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                  currentDb === db.name 
                    ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icons.Database className="w-4 h-4" />
                <span className="truncate">{db.name}</span>
              </button>
            ))}
            {databases.length === 0 && (
                <div className="px-4 text-xs text-slate-600 italic">No accessible databases found.</div>
            )}
          </div>

          {/* Saved Connections Section */}
          {savedConnections.length > 0 && (
            <>
              <div className="px-4 mt-6 mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Saved Connections</span>
                <button
                  onClick={() => setShowSavedConnections(!showSavedConnections)}
                  className="hover:text-emerald-400 transition-colors"
                >
                  <Icons.ChevronDown className={`w-3 h-3 transition-transform ${showSavedConnections ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showSavedConnections && (
                <div className="space-y-0.5">
                  {savedConnections.map((conn) => (
                    <div
                      key={conn.name}
                      className="group flex items-center justify-between px-4 py-2 hover:bg-slate-800/50 transition-colors"
                    >
                      <button
                        onClick={() => { handleConnectToSaved(conn); onClose(); }}
                        className="flex-1 text-left flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        <Icons.Link className="w-3 h-3" />
                        <span className="truncate text-sm">{conn.name}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(conn.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                        title="Delete"
                      >
                        <Icons.Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-sm font-medium"
          >
            <Icons.LogOut className="w-4 h-4" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;