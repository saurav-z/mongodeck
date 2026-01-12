import React, { useState, useEffect } from 'react';
import Connection from './pages/Connection';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DatabaseView from './pages/DatabaseView';
import CollectionView from './pages/CollectionView';
import { getDatabases } from './services/api';
import { ConnectionConfig } from './types';
import { Icons } from './components/Icon';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentDb, setCurrentDb] = useState<string | null>(null);
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [databases, setDatabases] = useState<any[]>([]);
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const handleConnect = (config: ConnectionConfig) => {
    setIsConnected(true);
  };

  const handleLogout = () => {
    setIsConnected(false);
    setCurrentDb(null);
    setCurrentCollection(null);
    setDatabases([]);
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
          {!currentDb && (
            <Dashboard onNavigateDb={navigateToDb} />
          )}
          
          {currentDb && !currentCollection && (
            <DatabaseView 
              dbName={currentDb} 
              onNavigateCollection={navigateToCollection}
              onBack={navigateHome}
            />
          )}

          {currentDb && currentCollection && (
            <CollectionView 
              dbName={currentDb}
              colName={currentCollection}
              onBack={() => setCurrentCollection(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;