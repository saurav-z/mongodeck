import React, { useEffect, useState, useCallback } from 'react';
import { getDocuments, insertDocument, updateDocument, deleteDocument } from '../services/api';
import { Icons } from '../components/Icon';
import JsonEditor from '../components/JsonEditor';
import { ViewMode, Document } from '../types';

interface CollectionViewProps {
  dbName: string;
  colName: string;
  onBack: () => void;
}

const LIMIT_OPTIONS = [10, 20, 50, 100];

const CollectionView: React.FC<CollectionViewProps> = ({ dbName, colName, onBack }) => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.JSON);
  
  // Query State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<any>({});
  const [queryError, setQueryError] = useState<string | null>(null);
  
  // Pagination & Sort State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState<{[key:string]: 1 | -1}>({ _id: -1 });

  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editorContent, setEditorContent] = useState<any>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const skip = (page - 1) * limit;
    const { docs: data, total } = await getDocuments(dbName, colName, activeFilter, {
        limit,
        skip,
        sort
    });
    setDocs(data);
    setTotalDocs(total);
    setLoading(false);
  }, [dbName, colName, activeFilter, page, limit, sort]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleSearch = async () => {
    setPage(1); // Reset to page 1 on search
    setQueryError(null);

    if (!searchQuery.trim()) {
        setActiveFilter({});
        return;
    }
    
    try {
        const parsed = JSON.parse(searchQuery);
        setActiveFilter(parsed);
    } catch (e) {
        setQueryError("Invalid JSON format. Please enter a valid MongoDB query object.");
    }
  };

  const handleSaveDoc = async () => {
      if(!editorContent) return;
      
      if (editingDoc) {
          await updateDocument(dbName, colName, editingDoc._id, editorContent);
      } else {
          await insertDocument(dbName, colName, editorContent);
      }
      setShowDocModal(false);
      setEditingDoc(null);
      setEditorContent(null);
      fetchDocs();
  };

  const handleDelete = async (id: string) => {
      if(confirm('Delete this document?')) {
          await deleteDocument(dbName, colName, id);
          fetchDocs();
      }
  };

  const openEdit = (doc: Document) => {
      setEditingDoc(doc);
      setEditorContent(doc);
      setShowDocModal(true);
  };

  const openCreate = () => {
      setEditingDoc(null);
      setEditorContent({});
      setShowDocModal(true);
  };

  const totalPages = Math.ceil(totalDocs / limit);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 overflow-hidden whitespace-nowrap">
            <span onClick={onBack} className="cursor-pointer hover:text-emerald-400">{dbName}</span>
            <Icons.ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="text-slate-100 font-medium truncate">{colName}</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2 truncate">
                <Icons.Table className="text-emerald-500 w-6 h-6 flex-shrink-0" />
                <span className="truncate">{colName}</span>
                <span className="text-xs md:text-sm font-normal text-slate-500 ml-2 bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap">{totalDocs} docs</span>
            </h1>
            
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 self-end md:self-auto">
                <button 
                    onClick={() => setViewMode(ViewMode.JSON)}
                    className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.JSON ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Icons.Code className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode(ViewMode.TABLE)}
                    className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.TABLE ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Icons.List className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode(ViewMode.CARD)}
                    className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.CARD ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Icons.Grid className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder='Filter Query e.g. { "status": "active" }'
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 pl-10 pr-4 py-2.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-600 text-sm font-mono"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleSearch}
                    className="flex-1 md:flex-none justify-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
                >
                    <Icons.Search className="w-4 h-4" />
                    <span>Run</span>
                </button>
                 <button 
                    onClick={openCreate}
                    className="flex-1 md:flex-none justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
                >
                    <Icons.Plus className="w-4 h-4" />
                    <span>Insert</span>
                </button>
            </div>
        </div>
        
        {queryError && (
             <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                 <Icons.Close className="w-3 h-3" />
                 {queryError}
             </div>
        )}

        {Object.keys(activeFilter).length > 0 && !queryError && (
            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 inline-block px-2 py-1 rounded whitespace-nowrap">
                    Filter: {JSON.stringify(activeFilter)}
                </div>
                <button onClick={() => {setSearchQuery(''); setActiveFilter({}); setPage(1);}} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 whitespace-nowrap">
                    <Icons.Close className="w-3 h-3" /> Clear
                </button>
            </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
                <div className="flex flex-col items-center gap-2">
                    <Icons.Refresh className="w-8 h-8 animate-spin text-emerald-500" />
                    <span>Loading...</span>
                </div>
            </div>
        ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Icons.Search className="w-12 h-12 mb-4 opacity-20" />
                <p>No documents found.</p>
                {Object.keys(activeFilter).length > 0 && (
                    <button onClick={() => {setSearchQuery(''); setActiveFilter({}); setPage(1)}} className="text-emerald-500 mt-2 hover:underline">Clear Filters</button>
                )}
            </div>
        ) : (
            <>
                {viewMode === ViewMode.JSON && (
                    <div className="space-y-4 font-mono text-sm">
                        {docs.map(doc => (
                             <div key={doc._id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 group relative hover:border-emerald-500/30 transition-colors">
                                <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(doc)} className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-emerald-500 hover:text-white"><Icons.Edit2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDelete(doc._id)} className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-red-500 hover:text-white"><Icons.Trash2 className="w-3 h-3" /></button>
                                </div>
                                <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto">
                                    {JSON.stringify(doc, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}

                {viewMode === ViewMode.TABLE && (
                     <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden w-full">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400 min-w-[600px]">
                                <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3 font-medium w-32">_id</th>
                                        <th className="px-6 py-3 font-medium">Document Preview</th>
                                        <th className="px-6 py-3 text-right w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {docs.map(doc => (
                                        <tr key={doc._id} className="hover:bg-slate-700/30">
                                            <td className="px-6 py-4 font-mono text-emerald-400 align-top">{doc._id}</td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="truncate max-w-xs md:max-w-xl text-slate-300">
                                                    {JSON.stringify(doc)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                 <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEdit(doc)} className="text-slate-400 hover:text-emerald-400"><Icons.Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(doc._id)} className="text-slate-400 hover:text-red-400"><Icons.Trash2 className="w-4 h-4" /></button>
                                                 </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                )}
                
                {viewMode === ViewMode.CARD && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {docs.map(doc => (
                            <div key={doc._id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col hover:shadow-lg hover:shadow-black/20 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-mono text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded truncate max-w-[150px]">{doc._id}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEdit(doc)}><Icons.Edit2 className="w-3 h-3 text-slate-500 hover:text-emerald-400" /></button>
                                        <button onClick={() => handleDelete(doc._id)}><Icons.Trash2 className="w-3 h-3 text-slate-500 hover:text-red-400" /></button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                     <pre className="text-xs text-slate-400 font-mono line-clamp-6 break-all whitespace-pre-wrap">
                                        {JSON.stringify(doc, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}
      </div>
      
      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center sticky bottom-0">
        <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="hidden md:inline">Show</span>
            <select 
                value={limit} 
                onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
                {LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800"
            >
                <Icons.ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <span className="text-sm text-slate-400">
                <span className="md:hidden">{page} / {totalPages || 1}</span>
                <span className="hidden md:inline">Page {page} of {totalPages || 1}</span>
            </span>
            <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-2 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800"
            >
                <Icons.ChevronRight className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-100">{editingDoc ? 'Edit Document' : 'Insert Document'}</h3>
                <button onClick={() => setShowDocModal(false)}><Icons.Close className="text-slate-400 hover:text-white" /></button>
            </div>
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
                <JsonEditor 
                    initialValue={editorContent || {}} 
                    onChange={setEditorContent} 
                    height="400px"
                />
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50 rounded-b-xl">
                <button onClick={() => setShowDocModal(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button 
                    onClick={handleSaveDoc} 
                    disabled={!editorContent}
                    className="px-6 py-2 bg-emerald-500 text-slate-900 font-bold rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {editingDoc ? 'Update' : 'Insert'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionView;