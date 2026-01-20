import React, { useEffect, useState, useRef } from 'react';
import { getDatabases, getCollections, exportDatabase, exportCollection, importCollection } from '../services/api';
import { Database } from '../types';
import { Icons } from '../components/Icon';
import { ArrowLeft, Info, AlertCircle, CheckCircle2, XCircle, Upload, Download, Database as DbIcon, Table, FileText, Settings, RefreshCw } from 'lucide-react';

interface ImportExportProps {
  onBack: () => void;
}

interface ImportOptions {
  targetDb: string;
  targetCol: string;
  importMode: 'same-name' | 'new-name' | 'overwrite' | 'skip-duplicates';
  batchSize: number;
  continueOnError: boolean;
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
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    targetDb: '',
    targetCol: '',
    importMode: 'same-name',
    batchSize: 1000,
    continueOnError: false
  });
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [successLog, setSuccessLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);

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
        setImportOptions(prev => ({ ...prev, targetDb: databases[0].name }));
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setSelectedFile(file);
      setFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'application/octet-stream'
      });
    } else {
      setSelectedFile(null);
      setFileInfo(null);
    }
  };

  const clearLogs = () => {
    setErrorLog([]);
    setSuccessLog([]);
    setProgress(null);
  };

  const handleExportDatabase = async () => {
    if (!selectedDb) return;
    setExporting(true);
    setProgress({ current: 0, total: 100, message: 'Starting export...' });
    clearLogs();

    try {
      // Database export only supports JSON and BSON formats
      const format = exportFormat === 'csv' ? 'json' : exportFormat;

      setProgress({ current: 20, total: 100, message: 'Fetching database data...' });
      const blob = await exportDatabase({ dbName: selectedDb, format: format as 'json' | 'bson' });

      setProgress({ current: 80, total: 100, message: 'Preparing download...' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDb}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress({ current: 100, total: 100, message: 'Export completed successfully!' });
      setSuccessLog([`Database "${selectedDb}" exported successfully as ${format.toUpperCase()}`]);
    } catch (error) {
      console.error('Export failed:', error);
      setErrorLog([`Export failed: ${(error as Error).message}`]);
      setProgress(null);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCollections = async () => {
    if (!selectedDb || selectedCols.length === 0) return;
    setExporting(true);
    clearLogs();

    const totalCols = selectedCols.length;
    let completed = 0;

    try {
      for (const colName of selectedCols) {
        setProgress({
          current: (completed / totalCols) * 100,
          total: 100,
          message: `Exporting ${colName} (${completed + 1}/${totalCols})...`
        });

        const blob = await exportCollection({ dbName: selectedDb, colName, format: exportFormat as 'json' | 'csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedDb}_${colName}_${Date.now()}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSuccessLog(prev => [...prev, `Exported ${colName}`]);
        completed++;

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setProgress({ current: 100, total: 100, message: `Exported ${totalCols} collection(s) successfully!` });
    } catch (error) {
      console.error('Export failed:', error);
      setErrorLog([`Export failed: ${(error as Error).message}`]);
      setProgress(null);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setErrorLog(['Please select a file to import']);
      return;
    }

    if (!importOptions.targetDb || !importOptions.targetCol) {
      setErrorLog(['Please select a database and collection for import']);
      return;
    }

    setImporting(true);
    clearLogs();

    try {
      setProgress({ current: 10, total: 100, message: 'Reading file...' });

      // Read file content
      const text = await selectedFile.text();
      let data: any[];

      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON file format');
      }

      if (!Array.isArray(data)) {
        throw new Error('File must contain an array of documents');
      }

      setProgress({ current: 30, total: 100, message: `Processing ${data.length} documents...` });

      // Handle different import modes
      let targetCol = importOptions.targetCol;

      if (importOptions.importMode === 'same-name') {
        // Use the collection name from the file if available
        // For now, we'll use the targetCol as specified
      } else if (importOptions.importMode === 'new-name') {
        // Already using the specified targetCol
      }

      // For large files, we could implement chunking here
      // For now, we'll import in batches
      const batchSize = importOptions.batchSize;
      let insertedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const progress = Math.min((i / data.length) * 100, 90);

        setProgress({
          current: progress,
          total: 100,
          message: `Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}...`
        });

        try {
          // Import the batch
          await importCollection(importOptions.targetDb, targetCol, batch);
          insertedCount += batch.length;
          setSuccessLog(prev => [...prev, `Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} documents`]);
        } catch (error) {
          errorCount += batch.length;
          setErrorLog(prev => [...prev, `Batch ${Math.floor(i / batchSize) + 1} failed: ${(error as Error).message}`]);

          if (!importOptions.continueOnError) {
            throw error;
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProgress({ current: 100, total: 100, message: 'Import completed!' });

      if (errorCount > 0) {
        setErrorLog(prev => [...prev, `Import completed with ${errorCount} errors`]);
      }

      setSuccessLog(prev => [...prev, `Successfully imported ${insertedCount} documents`]);

      // Refresh collections if we imported to the currently selected database
      if (importOptions.targetDb === selectedDb) {
        loadCollections(selectedDb);
      }

      // Clear file selection
      setSelectedFile(null);
      setFileInfo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
      setErrorLog([`Import failed: ${(error as Error).message}`]);
      setProgress(null);
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
          <p className="text-slate-400 mt-1">Manage database and collection imports and exports with large file support</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Progress Bar */}
      {(exporting || importing) && progress && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-300 font-medium">{progress.message}</span>
            <span className="text-emerald-400 font-bold">{Math.round(progress.current)}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress.current}%` }}
            />
          </div>
        </div>
      )}

      {/* Logs */}
      {(errorLog.length > 0 || successLog.length > 0) && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Results</h3>
            <button
              onClick={clearLogs}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          </div>
          {successLog.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Success
              </div>
              <ul className="space-y-1 text-sm text-slate-400">
                {successLog.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {errorLog.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                <XCircle className="w-4 h-4" />
                Errors
              </div>
              <ul className="space-y-1 text-sm text-red-300">
                {errorLog.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span>•</span>
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <DbIcon className="w-5 h-5 text-emerald-400" />
              Import Target
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Database</label>
                <select
                  value={importOptions.targetDb}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, targetDb: e.target.value }))}
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
                  value={importOptions.targetCol}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, targetCol: e.target.value }))}
                  placeholder="Collection name (will be created if doesn't exist)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Import Options */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              Import Options
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Import Mode</label>
                <select
                  value={importOptions.importMode}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, importMode: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="same-name">Same Collection Name</option>
                  <option value="new-name">Use Target Collection Name</option>
                  <option value="overwrite">Overwrite Existing</option>
                  <option value="skip-duplicates">Skip Duplicates</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Batch Size</label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={importOptions.batchSize}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 1000 }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.continueOnError}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, continueOnError: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-300">Continue on error (skip failed documents)</span>
                </label>
              </div>
            </div>
          </div>

          {/* File Selection */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Select File
            </h2>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleFileSelect(file);
                }}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-900 rounded-full">
                  <Upload className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium">Drop your file here or click to browse</p>
                  <p className="text-slate-500 text-sm mt-1">Supported format: JSON (array of documents)</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition-colors"
                >
                  Choose File
                </button>
              </div>
            </div>

            {/* File Info */}
            {fileInfo && (
              <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-slate-200 font-medium">{fileInfo.name}</p>
                      <p className="text-xs text-slate-500">{fileInfo.size} • {fileInfo.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleFileSelect(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import Button */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing || !selectedFile || !importOptions.targetDb || !importOptions.targetCol}
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Import Data
                </>
              )}
            </button>
            <button
              onClick={clearLogs}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition-colors"
            >
              Clear Logs
            </button>
          </div>

          {/* Import Info */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-400" />
              Import Information
            </h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>JSON imports will insert documents into the specified collection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>If the collection doesn't exist, it will be created automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>For JSON files, the file should contain an array of documents</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>Large imports are processed in batches to avoid memory issues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>Batch size can be adjusted based on your system resources</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExport;
