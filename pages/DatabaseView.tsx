import React, { useEffect, useState } from 'react';
import { getCollections, createCollection, dropDatabase, bulkCollectionsAction } from '../services/api';
import { Icons } from '../components/Icon';

interface DatabaseViewProps {
  dbName: string;
  onNavigateCollection: (db: string, col: string) => void;
  onBack: () => void;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ dbName, onNavigateCollection, onBack }) => {
  const [collections, setCollections] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newColName, setNewColName] = useState('');

  const fetchCols = () => {
    setLoading(true);
    getCollections(dbName).then(cols => {
      setCollections(cols);
      setSelected([]);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchCols();
  }, [dbName]);

  const handleCreate = async () => {
    if(!newColName) return;
    await createCollection(dbName, newColName);
    setNewColName('');
    setShowCreateModal(false);
    fetchCols();
  };

  const handleDropDb = async () => {
    if(confirm(`Are you sure you want to drop database "${dbName}"? This action cannot be undone.`)) {
        await dropDatabase(dbName);
        onBack();
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading collections...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
       <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <span onClick={onBack} className="cursor-pointer hover:text-emerald-400">Dashboard</span>
        <Icons.ChevronRight className="w-3 h-3" />
        <span className="text-slate-100 font-medium">{dbName}</span>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
             <Icons.Database className="text-emerald-500" />
             {dbName}
          </h1>
          <p className="text-slate-400 mt-1">{collections.length} Collections</p>
        </div>
        <div className="flex gap-3 items-center">
          {collections.length > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <input
                type="checkbox"
                checked={selected.length === collections.length}
                onChange={(e) => {
                  if (e.target.checked) setSelected(collections.map(c => c.name));
                  else setSelected([]);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-400">Select all</span>
            </div>
          )}
          {selected.length > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-slate-300">{selected.length} selected</span>
              <button onClick={async () => {
                  if (!confirm(`Truncate ${selected.length} selected collections? This will delete all documents.`)) return;
                  try {
                    await bulkCollectionsAction(dbName, 'truncate', selected);
                    fetchCols();
                  } catch (e) { console.error(e); alert(e.message || e); }
              }} className="px-3 py-1 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-sm">Truncate Selected</button>
              <button onClick={async () => {
                  if (!confirm(`Drop ${selected.length} selected collections? This cannot be undone.`)) return;
                  try {
                    await bulkCollectionsAction(dbName, 'drop', selected);
                    fetchCols();
                  } catch (e) { console.error(e); alert(e.message || e); }
              }} className="px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm">Drop Selected</button>
            </div>
          )}
          <div className="flex gap-3">
           <button 
             onClick={handleDropDb}
             className="px-4 py-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center gap-2"
           >
             <Icons.Trash2 className="w-4 h-4" /> Drop Database
           </button>
           <button 
             onClick={() => setShowCreateModal(true)}
             className="px-4 py-2 rounded-md bg-emerald-500 text-slate-900 hover:bg-emerald-400 transition-colors text-sm font-bold flex items-center gap-2"
           >
             <Icons.Plus className="w-4 h-4" /> Create Collection
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map(col => {
          const isSelected = selected.includes(col.name);
          return (
          <div 
            key={col.name}
            onClick={() => onNavigateCollection(dbName, col.name)}
            className={`relative bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-emerald-500/50 p-6 rounded-xl cursor-pointer transition-all group ${isSelected ? 'ring-2 ring-emerald-500/30' : ''}`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                if (e.target.checked) setSelected(s => [...s, col.name]);
                else setSelected(s => s.filter(x => x !== col.name));
              }}
              className="absolute left-4 top-4 w-4 h-4 z-20"
            />
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-700/50 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-400 text-slate-400 transition-colors">
                 <Icons.Table className="w-6 h-6" />
              </div>
              <Icons.MoreVertical className="w-4 h-4 text-slate-600 hover:text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 group-hover:text-white mb-1">{col.name}</h3>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
                <span className="flex items-center gap-1">
                    <Icons.List className="w-3 h-3" />
                    {col.docs.length} Documents
                </span>
                <span className="flex items-center gap-1">
                    <Icons.Server className="w-3 h-3" />
                    ~{JSON.stringify(col.docs).length} bytes
                </span>
            </div>
          </div>
          );
        })}
      </div>

       {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Create Collection</h3>
            <input 
              type="text" 
              placeholder="Collection Name" 
              autoFocus
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none mb-6"
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-emerald-500 text-slate-900 font-bold rounded-md hover:bg-emerald-400">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default DatabaseView;