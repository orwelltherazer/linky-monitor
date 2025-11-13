import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Historique from './pages/Historique';
import Cout from './pages/Cout';
import Alertes from './pages/Alertes';
import Analyse from './pages/Analyse';
import Parametres from './pages/Parametres';
import Diagnostic from './pages/Diagnostic';
import { useAppStore } from './context/AppContext';

const AppContent = ({ currentPage, setCurrentPage }) => {
  const { theme } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'historique':
        return <Historique />;
      case 'cout':
        return <Cout />;
      case 'alertes':
        return <Alertes />;
      case 'analyse':
        return <Analyse />;
      case 'parametres':
        return <Parametres />;
      case 'diagnostic':
        return <Diagnostic />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderPage()}
      </main>
    </div>
  );
};

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <AppProvider>
      <AppContent currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </AppProvider>
  );
};

export default App;