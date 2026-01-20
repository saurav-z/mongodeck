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
  const [mode, setMode] = useState<'small' | 'big'>('small');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (mode === 'big') {
      setSize({ width: 600, height: 500 });
    } else {
      setSize({ width: 400, height: 300 });
    }
  }, [mode]);

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
    
    if (result.success && result.result) {
      return JSON.stringify(result.result, null, 2);
    }

    if (result.success && result.data) {
      return JSON.stringify(result.data, null, 2);
    }
    
    return result.error || 'No data returned';
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === dragRef.current || e.target === panelRef.current) {
      setIsDragging(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = position.x;
      const startPosY = position.y;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        setPosition({
          x: Math.max(0, startPosX - deltaX),
          y: Math.max(0, startPosY - deltaY)
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'small' ? 'big' : 'small');
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 bg-slate-800 border border-slate-700 shadow-2xl rounded-xl overflow-hidden transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        right: position.x || 20,
        bottom: position.y || 20,
        width: size.width,
        height: size.height,
        maxWidth: '90vw',
        maxHeight: '90vh'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - Draggable area */}
      <div
        ref={dragRef}
        className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/50"
      >
        <div className="flex items-center gap-2">
          <Icons.Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-slate-100">MongoDB Console</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMode}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            title={mode === 'small' ? 'Expand to big mode' : 'Collapse to small mode'}
          >
            {mode === 'small' ? 'Big' : 'Small'}
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded"
          >
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Command Input */}
        <div className="p-3 border-b border-slate-700 bg-slate-900/30">
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
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-xs leading-relaxed resize-none"
              rows={mode === 'big' ? 6 : 3}
            />
            <div className="absolute bottom-1 right-2 text-[10px] text-slate-500">
              Enter to execute, Tab for auto-complete
            </div>
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="mt-2 bg-slate-950 border border-slate-700 rounded-lg p-2 max-h-32 overflow-y-auto">
              <p className="text-[10px] text-slate-500 mb-1">Common commands:</p>
              <div className="flex flex-wrap gap-1">
                {commonCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertCommand(cmd)}
                    className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 rounded transition-colors"
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
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Icons.Refresh className="w-3 h-3 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                  <Icons.Play className="w-3 h-3 fill-current" />
                  Execute
              </>
            )}
          </button>
        </div>

        {/* Result */}
        <div className="flex-1 p-3 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Result
            </label>
            {result?.executionTime && (
              <span className="text-[10px] text-slate-400">
                {result.executionTime}ms
              </span>
            )}
          </div>
          
          <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 overflow-auto">
            {result ? (
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">
                <span className={result.success ? 'text-emerald-400' : 'text-red-400'}>
                  {formatResult()}
                </span>
              </pre>
            ) : (
                <div className="text-slate-500 text-[11px] italic">
                  Execute a command to see results...
              </div>
            )}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="p-2 border-t border-slate-700 bg-slate-900/30 max-h-20 overflow-y-auto">
            <p className="text-[10px] text-slate-500 mb-1">Recent:</p>
            <div className="flex flex-wrap gap-1">
              {history.slice(0, 5).map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => setCommand(cmd)}
                  className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors truncate max-w-[150px]"
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
