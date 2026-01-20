import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icon';
import { executeCommand } from '../services/api';
import { CommandResult } from '../types';

interface CommandPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPanel: React.FC<CommandPanelProps> = ({ isOpen, onClose }) => {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const commonCommands = [
    'db.adminCommand({ ping: 1 })',
    'db.serverStatus()',
    'db.stats()',
    'db.listDatabases()',
    'db.listCollections()',
    'db.collectionName.find().limit(10)',
    'db.collectionName.findOne()',
    'db.collectionName.countDocuments()',
    'db.collectionName.aggregate([{ $group: { _id: null, count: { $sum: 1 } } }])',
    'db.collectionName.createIndex({ field: 1 })',
    'db.collectionName.drop()',
    'db.runCommand({ collStats: "collectionName" })',
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleExecute = async () => {
    if (!command.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const startTime = performance.now();
      const res = await executeCommand(command);
      const endTime = performance.now();
      
      setResult({
        ...res,
        executionTime: Math.round(endTime - startTime)
      });
      
      // Add to history
      setHistory(prev => {
        const newHistory = [command, ...prev].slice(0, 20);
        setHistoryIndex(-1);
        return newHistory;
      });
    } catch (error) {
      setResult({
        success: false,
        error: (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    } else if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      if (newIndex >= 0) {
        setCommand(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown' && history.length > 0) {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      if (newIndex >= 0) {
        setCommand(history[newIndex]);
      } else {
        setCommand('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple auto-completion
      const suggestions = commonCommands.filter(cmd => 
        cmd.toLowerCase().startsWith(command.toLowerCase())
      );
      if (suggestions.length > 0) {
        setCommand(suggestions[0]);
      }
    }
  };

  const insertCommand = (cmd: string) => {
    setCommand(cmd);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const formatResult = () => {
    if (!result) return null;
    
    if (result.success && result.data) {
      return JSON.stringify(result.data, null, 2);
    }
    
    return result.error || 'No data returned';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-4xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icons.Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">MongoDB Command Runner</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Command Input */}
        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Command
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1"
              >
                <Icons.Code className="w-3 h-3" />
                Examples
              </button>
              <button
                onClick={() => setCommand('')}
                className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"
              >
                <Icons.Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
          
          <div className="relative">
            <textarea
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter MongoDB command (e.g., db.collectionName.find())"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-sm leading-relaxed resize-none"
              rows={4}
            />
            <div className="absolute bottom-2 right-2 text-xs text-slate-500">
              Press Enter to execute, Tab for auto-complete
            </div>
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="mt-3 bg-slate-950 border border-slate-700 rounded-lg p-2 max-h-40 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-2">Common commands:</p>
              <div className="flex flex-wrap gap-1">
                {commonCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertCommand(cmd)}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 rounded transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={loading || !command.trim()}
            className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Icons.Refresh className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Icons.Play className="w-4 h-4 fill-current" />
                Execute Command
              </>
            )}
          </button>
        </div>

        {/* Result */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Result
            </label>
            {result?.executionTime && (
              <span className="text-xs text-slate-400">
                Executed in {result.executionTime}ms
              </span>
            )}
          </div>
          
          <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 overflow-auto">
            {result ? (
              <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                <span className={result.success ? 'text-emerald-400' : 'text-red-400'}>
                  {formatResult()}
                </span>
              </pre>
            ) : (
              <div className="text-slate-500 text-sm italic">
                Execute a command to see results here...
              </div>
            )}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-700 bg-slate-900/50">
            <p className="text-xs text-slate-500 mb-2">Recent commands:</p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {history.slice(0, 10).map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => setCommand(cmd)}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors truncate max-w-[200px]"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPanel;
