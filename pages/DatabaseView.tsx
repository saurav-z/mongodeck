import React, { useEffect, useState, useMemo } from 'react';
import {
  getCollections,
  createCollection,
  dropDatabase,
  bulkCollectionsAction
} from '../services/api';
import { Icons } from '../components/Icon';

interface DatabaseViewProps {
  dbName: string;
  onNavigateCollection: (db: string, col: string) => void;
  onBack: () => void;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({
  dbName,
  onNavigateCollection,
  onBack
}) => {
  const [collections, setCollections] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newColName, setNewColName] = useState('');

  const allSelected = selected.length === collections.length && collections.length > 0;
  const partiallySelected = selected.length > 0 && !allSelected;

  const fetchCols = async () => {
    try {
      setLoading(true);
      const cols = await getCollections(dbName);
      setCollections(cols);
      setSelected([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCols();
  }, [dbName]);

  const toggleSelect = (name: string) => {
    setSelected(prev =>
      prev.includes(name)
        ? prev.filter(x => x !== name)
        : [...prev, name]
    );
  };

  const handleCreate = async () => {
    if (!newColName.trim()) return;
    await createCollection(dbName, newColName.trim());
    setNewColName('');
    setShowCreateModal(false);
    fetchCols();
  };

  const handleDropDb = async () => {
    if (!confirm(`Drop database "${dbName}"? This cannot be undone.`)) return;
    await dropDatabase(dbName);
    onBack();
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Loading collections…</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <button onClick={onBack} className="hover:text-emerald-400">
          Dashboard
        </button>
        <Icons.ChevronRight className="w-3 h-3" />
        <span className="text-slate-100 font-medium">{dbName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Icons.Database className="text-emerald-500" />
            {dbName}
          </h1>
          <p className="text-slate-400 mt-1">
            {collections.length} collection{collections.length !== 1 && 's'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {collections.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => {
                  if (el) el.indeterminate = partiallySelected;
                }}
                onChange={e =>
                  setSelected(
                    e.target.checked ? collections.map(c => c.name) : []
                  )
                }
              />
              Select all
            </label>
          )}

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  if (!confirm(`Truncate ${selected.length} collections?`)) return;
                  await bulkCollectionsAction(dbName, 'truncate', selected);
                  fetchCols();
                }}
                className="px-3 py-1 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-sm"
              >
                Truncate
              </button>

              <button
                onClick={async () => {
                  if (!confirm(`Drop ${selected.length} collections?`)) return;
                  await bulkCollectionsAction(dbName, 'drop', selected);
                  fetchCols();
                }}
                className="px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm"
              >
                Drop
              </button>
            </div>
          )}

          <button
            onClick={handleDropDb}
            className="px-4 py-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium flex items-center gap-2"
          >
            <Icons.Trash2 className="w-4 h-4" />
            Drop DB
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-md bg-emerald-500 text-slate-900 hover:bg-emerald-400 text-sm font-bold flex items-center gap-2"
          >
            <Icons.Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Empty State */}
      {collections.length === 0 && (
        <div className="text-center text-slate-400 py-20">
          No collections yet. Create one to get started.
        </div>
      )}

      {/* Collections Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map(col => {
          const isSelected = selected.includes(col.name);

          return (
            <div
              key={col.name}
              className={`relative rounded-xl border p-5 transition
                ${isSelected
                  ? 'border-emerald-500/50 ring-2 ring-emerald-500/20'
                  : 'border-slate-700 hover:border-emerald-500/40'}
                bg-slate-800/50`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(col.name)}
                onClick={e => e.stopPropagation()}
                className="absolute left-4 top-4 w-4 h-4"
              />

              {/* Clickable content */}
              <button
                onClick={() => onNavigateCollection(dbName, col.name)}
                className="w-full text-left"
              >
                <div className="flex justify-between mb-4">
                  <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400">
                    <Icons.Table className="w-6 h-6" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-200 mb-1">
                  {col.name}
                </h3>

                <div className="flex gap-4 text-xs text-slate-500 mt-4">
                  <span className="flex items-center gap-1">
                    <Icons.List className="w-3 h-3" />
                    {col.docs.length} docs
                  </span>
                  <span className="flex items-center gap-1">
                    <Icons.Server className="w-3 h-3" />
                    ~{JSON.stringify(col.docs).length} bytes
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-100 mb-4">
              Create Collection
            </h3>

            <input
              autoFocus
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              placeholder="Collection name"
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-slate-200 mb-6 focus:ring-1 focus:ring-emerald-500"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-emerald-500 text-slate-900 font-bold rounded-md hover:bg-emerald-400"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseView;
