import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
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

// Main App Component with Routing
function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<any[]>([]);
  const [savedConfig, setSavedConfig] = useState<ConnectionConfig | null>(null);
  
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
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
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
      setIsLoading(false);
      // Save connection for persistent login
      localStorage.setItem('mongodeck_saved_connection', JSON.stringify(config));
    } catch (error) {
      console.error('Connection failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const handleLogout = () => {
    setIsConnected(false);
    setDatabases([]);
    setSavedConfig(null);
    // Clear saved connection
    localStorage.removeItem('mongodeck_saved_connection');
  };

  // Show loading spinner while checking for saved connection
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-emerald-400 text-xl font-bold">MongoDeck</div>
          <div className="text-slate-500 text-sm mt-2">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return <Connection onConnect={handleConnect} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
        <SidebarWithRouting
          databases={databases}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenCommandPanel={() => setShowCommandPanel(true)}
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
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/db/:dbName" element={<DatabasePage />} />
              <Route path="/db/:dbName/:colName" element={<CollectionPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        <CommandPanel
          isOpen={showCommandPanel}
          onClose={() => setShowCommandPanel(false)}
        />
      </div>
    </Router>
  );
}

// Sidebar Component with Routing
interface SidebarWithRoutingProps {
  databases: any[];
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenCommandPanel: () => void;
}

const SidebarWithRouting: React.FC<SidebarWithRoutingProps> = ({ databases, onLogout, isOpen, onClose, onOpenCommandPanel }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentDb = () => {
    const match = location.pathname.match(/^\/db\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const currentDb = getCurrentDb();

  const handleNavigateHome = () => {
    navigate('/');
    onClose();
  };

  const handleNavigateImportExport = () => {
    navigate('/import-export');
    onClose();
  };

  const handleSelectDb = (dbName: string) => {
    navigate(`/db/${dbName}`);
    onClose();
  };

  return (
    <Sidebar
      databases={databases}
      currentDb={currentDb}
      onSelectDb={handleSelectDb}
      onLogout={onLogout}
      navigate={handleNavigateHome}
      isOpen={isOpen}
      onClose={onClose}
      onOpenCommandPanel={onOpenCommandPanel}
      onOpenImportExport={handleNavigateImportExport}
    />
  );
};

// Page Components
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  return <Dashboard onNavigateDb={(dbName) => navigate(`/db/${dbName}`)} />;
};

const ImportExportPage: React.FC = () => {
  const navigate = useNavigate();
  return <ImportExport onBack={() => navigate('/')} />;
};

const DatabasePage: React.FC = () => {
  const navigate = useNavigate();
  const { dbName } = useParams<{ dbName: string }>();

  if (!dbName) {
    return <Navigate to="/" replace />;
  }

  return (
    <DatabaseView
      dbName={dbName}
      onNavigateCollection={(db, col) => navigate(`/db/${db}/${col}`)}
      onBack={() => navigate('/')}
    />
  );
};

const CollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { dbName, colName } = useParams<{ dbName: string; colName: string }>();

  if (!dbName || !colName) {
    return <Navigate to="/" replace />;
  }

  return (
    <CollectionView
      dbName={dbName}
      colName={colName}
      onBack={() => navigate(`/db/${dbName}`)}
    />
  );
};

export default App;