import React from 'react';
import { Sun, Moon, Zap, DollarSign, AlertTriangle, Activity, Settings, Calendar, BarChart2, Wrench } from 'lucide-react';
import { useAppStore } from '../context/AppContext';

const Navigation = ({ currentPage, setCurrentPage }) => {
  const { theme, toggleTheme } = useAppStore();

  const pages = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'historique', label: 'Historique', icon: Calendar },
    { id: 'cout', label: 'Coûts', icon: DollarSign },
    { id: 'alertes', label: 'Alertes', icon: AlertTriangle },
    { id: 'analyse', label: 'Analyse', icon: BarChart2 },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
    { id: 'diagnostic', label: 'Diagnostic', icon: Wrench }
  ];

  return (
    <nav className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Zap className="text-blue-500" size={28} />
            <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Linky Monitor
            </h1>
          </div>

          <div className="hidden md:flex gap-1">
            {pages.map(page => {
              const Icon = page.icon;
              return (
                <button
                  key={page.id}
                  onClick={() => setCurrentPage(page.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    currentPage === page.id
                      ? 'bg-blue-500 text-white'
                      : theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden lg:inline">{page.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-700'}`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="md:hidden flex overflow-x-auto pb-2 gap-2">
          {pages.map(page => {
            const Icon = page.icon;
            return (
              <button
                key={page.id}
                onClick={() => setCurrentPage(page.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg whitespace-nowrap text-sm ${
                  currentPage === page.id
                    ? 'bg-blue-500 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Icon size={16} />
                {page.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;