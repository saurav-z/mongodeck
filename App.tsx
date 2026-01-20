import React, { useState, useEffect } from 'react';
import Connection from './pages/Connection';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DatabaseView from './pages/DatabaseView';
import CollectionView from './pages/CollectionView';
import ImportExport from './pages/ImportExport';
import CommandPanel from './components/CommandPanel';
import { getDatabases, connect } from './services/api';
import { ConnectionConfig } from './types';
import { Icons } from './components/Icon';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentDb, setCurrentDb] = useState<string | null>(null);
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [databases, setDatabases] = useState<any[]>([]);
  const [savedConfig, setSavedConfig] = useState<ConnectionConfig | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'import-export'>('dashboard');
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Command Panel State
  const [showCommandPanel, setShowCommandPanel] = useState(false);

  // Check for saved connection on mount
  useEffect(() => {
    const saved = localStorage.getItem('mongodeck_saved_connection');
    if (saved) {
      try {
        const config: ConnectionConfig = JSON.parse(saved);
        setSavedConfig(config);
        // Auto-connect
        handleConnect(config);
      } catch (e) {
        console.error('Failed to parse saved connection:', e);
      }
    }
  }, []);

  // Check for saved connection on mount
  useEffect(() => {
    const saved = localStorage.getItem('mongodeck_saved_connection');
    if (saved) {
      try {
        const config: ConnectionConfig = JSON.parse(saved);
        setSavedConfig(config);
        // Auto-connect
        handleConnect(config);
      } catch (e) {
        console.error('Failed to parse saved connection:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      // Poll for DB list updates
      const interval = setInterval(() => {
        getDatabases().then(setDatabases).catch(console.error);
      }, 5000);
      getDatabases().then(setDatabases).catch(console.error);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  // Keyboard shortcut for command panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isConnected) {
          setShowCommandPanel(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected]);

  const handleConnect = async (config: ConnectionConfig) => {
    try {
      await connect(config);
      setIsConnected(true);
      // Save connection for persistent login
      localStorage.setItem('mongodeck_saved_connection', JSON.stringify(config));
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    setIsConnected(false);
    setCurrentDb(null);
    setCurrentCollection(null);
    setDatabases([]);
    setSavedConfig(null);
    // Clear saved connection
    localStorage.removeItem('mongodeck_saved_connection');
  };

  const navigateToDb = (name: string) => {
    setCurrentDb(name);
    setCurrentCollection(null);
  };

  const navigateToCollection = (db: string, col: string) => {
    setCurrentDb(db);
    setCurrentCollection(col);
  };

  const navigateHome = () => {
      setCurrentDb(null);
      setCurrentCollection(null);
    setCurrentView('dashboard');
  };

  const navigateToImportExport = () => {
    setCurrentDb(null);
    setCurrentCollection(null);
    setCurrentView('import-export');
  };

  if (!isConnected) {
    return <Connection onConnect={handleConnect} />;
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      <Sidebar 
        databases={databases}
        currentDb={currentDb}
        onSelectDb={navigateToDb}
        onLogout={handleLogout}
        navigate={navigateHome}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenCommandPanel={() => setShowCommandPanel(true)}
        onOpenImportExport={navigateToImportExport}
      />
      
      <main className="flex-1 overflow-auto bg-slate-900 relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-20">
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 mr-2 text-slate-400">
                <Icons.List className="w-6 h-6" />
             </button>
             <span className="font-bold text-lg text-slate-100">MongoDeck</span>
        </div>



        <div className="flex-1 overflow-auto">
          {currentView === 'import-export' ? (
            <ImportExport onBack={navigateHome} />
          ) : !currentDb ? (
            <Dashboard onNavigateDb={navigateToDb} />
            ) : currentDb && !currentCollection ? (
            <DatabaseView 
              dbName={currentDb} 
              onNavigateCollection={navigateToCollection}
              onBack={navigateHome}
            />
              ) : currentDb && currentCollection ? (
            <CollectionView 
              dbName={currentDb}
              colName={currentCollection}
              onBack={() => setCurrentCollection(null)}
            />
          ) : null}
        </div>
      </main>

      <CommandPanel
        isOpen={showCommandPanel}
        onClose={() => setShowCommandPanel(false)}
      />
    </div>
  );
}

export default App;