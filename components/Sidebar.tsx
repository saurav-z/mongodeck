import React from 'react';
import { Icons } from './Icon';

interface SidebarProps {
  databases: any[];
  currentDb: string | null;
  onSelectDb: (name: string) => void;
  onLogout: () => void;
  navigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ databases, currentDb, onSelectDb, onLogout, navigate, isOpen, onClose }) => {
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

          <div className="px-4 mt-6 mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Databases</span>
            <button className="hover:text-emerald-400"><Icons.Plus className="w-3 h-3" /></button>
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