import React, { useEffect, useState, useRef } from 'react';
import { getDatabases, getCollections, exportDatabase, exportCollection, importCollection } from '../services/api';
import { Database } from '../types';
import { Icons } from '../components/Icon';
import { ArrowLeft, Info } from 'lucide-react';

interface ImportExportProps {
  onBack: () => void;
}

const ImportExport: React.FC<ImportExportProps> = ({ onBack }) => {
  const [dbs, setDbs] = useState<Database[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'bson'>('json');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importTargetDb, setImportTargetDb] = useState<string>('');
  const [importTargetCol, setImportTargetCol] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDatabases();
  }, []);

  useEffect(() => {
    if (selectedDb) {
      loadCollections(selectedDb);
    } else {
      setCollections([]);
      setSelectedCols([]);
    }
  }, [selectedDb]);

  const loadDatabases = async () => {
    try {
      const databases = await getDatabases();
      setDbs(databases);
      if (databases.length > 0) {
        setSelectedDb(databases[0].name);
        setImportTargetDb(databases[0].name);
      }
    } catch (error) {
      console.error('Failed to load databases:', error);
    }
  };

  const loadCollections = async (dbName: string) => {
    try {
      const cols = await getCollections(dbName);
      setCollections(cols);
      setSelectedCols([]);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const toggleSelectCol = (colName: string) => {
    setSelectedCols(prev =>
      prev.includes(colName)
        ? prev.filter(x => x !== colName)
        : [...prev, colName]
    );
  };

  const handleExportDatabase = async () => {
    if (!selectedDb) return;
    setExporting(true);
    try {
      // Database export only supports JSON and BSON formats
      const format = exportFormat === 'csv' ? 'json' : exportFormat;
      const blob = await exportDatabase({ dbName: selectedDb, format: format as 'json' | 'bson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDb}_${Date.now()}.${format}`;
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

  const handleExportCollections = async () => {
    if (!selectedDb || selectedCols.length === 0) return;
    setExporting(true);
    try {
      for (const colName of selectedCols) {
        const blob = await exportCollection({ dbName: selectedDb, colName, format: exportFormat as 'json' | 'csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedDb}_${colName}_${Date.now()}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    if (!importTargetDb || !importTargetCol) {
      alert('Please select a database and collection for import');
      return;
    }
    setImporting(true);
    try {
      await importCollection(importTargetDb, importTargetCol, file);
      alert('Import successful!');
      // Refresh collections if we imported to the currently selected database
      if (importTargetDb === selectedDb) {
        loadCollections(selectedDb);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed: ' + (error as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const allColsSelected = selectedCols.length === collections.length && collections.length > 0;
  const partiallySelected = selectedCols.length > 0 && !allColsSelected;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Icons.Download className="text-emerald-500" />
            Import / Export
          </h1>
          <p className="text-slate-400 mt-1">Manage database and collection imports and exports</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-900/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-4 text-sm font-medium transition-all relative flex items-center justify-center gap-2 ${activeTab === 'export' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
        >
          <Icons.Upload className="w-4 h-4" />
          Export
          {activeTab === 'export' && <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-4 text-sm font-medium transition-all relative flex items-center justify-center gap-2 ${activeTab === 'import' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
        >
          <Icons.Download className="w-4 h-4" />
          Import
          {activeTab === 'import' && <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Database Selection */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Select Database</h2>
            <select
              value={selectedDb}
              onChange={(e) => setSelectedDb(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">-- Select a database --</option>
              {dbs.map(db => (
                <option key={db.name} value={db.name}>{db.name}</option>
              ))}
            </select>
          </div>

          {/* Collection Selection */}
          {selectedDb && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">Select Collections</h2>
                {collections.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={allColsSelected}
                      ref={el => {
                        if (el) el.indeterminate = partiallySelected;
                      }}
                      onChange={e =>
                        setSelectedCols(
                          e.target.checked ? collections.map(c => c.name) : []
                        )
                      }
                    />
                    Select all
                  </label>
                )}
              </div>

              {collections.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  No collections found in this database
                </div>
              ) : (
                <div className="grid gap-3 max-h-64 overflow-y-auto pr-2">
                  {collections.map(col => (
                    <label
                      key={col.name}
                      className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-emerald-500/30 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCols.includes(col.name)}
                        onChange={() => toggleSelectCol(col.name)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="text-slate-200 font-medium">{col.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({col.docs.length} docs)</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export Options */}
          {selectedDb && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Export Options</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Format</label>
                  <select
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="json">JSON (all export types)</option>
                    <option value="csv">CSV (collections only)</option>
                    <option value="bson">BSON (database only)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleExportDatabase}
                    disabled={exporting || !selectedDb}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {exporting ? (
                      <>
                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Icons.Database className="w-4 h-4" />
                        Export Entire Database
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportCollections}
                    disabled={exporting || selectedCols.length === 0}
                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {exporting ? (
                      <>
                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Icons.Table className="w-4 h-4" />
                        Export Selected ({selectedCols.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Target Selection */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Import Target</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Database</label>
                <select
                  value={importTargetDb}
                  onChange={(e) => setImportTargetDb(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- Select database --</option>
                  {dbs.map(db => (
                    <option key={db.name} value={db.name}>{db.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Collection</label>
                <input
                  type="text"
                  value={importTargetCol}
                  onChange={(e) => setImportTargetCol(e.target.value)}
                  placeholder="Collection name (will be created if doesn't exist)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* File Selection */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Select File</h2>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.bson"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handleImport(file);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-900 rounded-full">
                  <Icons.Upload className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium">Drop your file here or click to browse</p>
                  <p className="text-slate-500 text-sm mt-1">Supported formats: JSON, BSON</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing || !importTargetDb || !importTargetCol}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {importing ? 'Importing...' : 'Choose File'}
                </button>
              </div>
            </div>
          </div>

          {/* Import Info */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-3">Import Information</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-emerald-400" />
                <span>JSON imports will insert documents into the specified collection</span>
              </li>
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-emerald-400" />
                <span>If the collection doesn't exist, it will be created automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-emerald-400" />
                <span>For JSON files, the file should contain an array of documents</span>
              </li>
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-emerald-400" />
                <span>Large imports may take some time depending on file size</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExport;
