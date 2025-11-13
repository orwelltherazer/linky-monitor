import React from 'react';
import { CheckCircle, XCircle, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { useAppStore } from '../context/AppContext';
import LoadHistoricalData from '../components/LoadHistoricalData';
import ApiService from '../services/ApiService';

const Diagnostic = () => {
  const { theme, currentData, historicalData, alerts, addAlert } = useAppStore();
  const [isResetting, setIsResetting] = React.useState(false);
  const [dbRecords, setDbRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loadingDb, setLoadingDb] = React.useState(false);
  
  const statusModul = currentData ? 'online' : 'offline';
  const derniereMaj = currentData ? new Date(currentData.timestamp).toLocaleString('fr-FR') : 'N/A';
  const nbDonnees = historicalData.length;
  const nbAlertes = alerts.length;

  const loadDbRecords = async (page = 1) => {
    setLoadingDb(true);
    try {
      const result = await ApiService.getPaginatedData(page, pagination.limit);
      setDbRecords(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Erreur lors du chargement des enregistrements:', error);
      addAlert({
        type: 'error',
        message: 'Erreur lors du chargement des enregistrements: ' + error.message,
        severity: 'medium'
      });
    } finally {
      setLoadingDb(false);
    }
  };

  const resetDatabase = async () => {
    if (!confirm('⚠️ Attention ! Cette action va supprimer TOUTES les données de consommation et les paramètres. Cette action est irréversible.\n\nÊtes-vous sûr de vouloir continuer ?')) {
      return;
    }
    
    setIsResetting(true);
    
    try {
      // Appeler l'API pour réinitialiser la base de données
      const response = await fetch('/api/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la réinitialisation de la base de données');
      }
      
      addAlert({
        type: 'success',
        message: 'Base de données réinitialisée avec succès',
        severity: 'low'
      });
      
      // Recharger la page pour réinitialiser l'état
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      addAlert({
        type: 'error',
        message: 'Erreur lors de la réinitialisation: ' + error.message,
        severity: 'critical'
      });
    } finally {
      setIsResetting(false);
    }
  };

  React.useEffect(() => {
    loadDbRecords();
  }, []);

  const cardClass = `${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`;

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-6">État du module</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <div className="font-semibold text-green-800">Module Linky</div>
              <div className="text-sm text-green-600">Statut: {statusModul}</div>
            </div>
            {statusModul === 'online' ? (
              <CheckCircle className="text-green-500" size={32} />
            ) : (
              <XCircle className="text-red-500" size={32} />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-sm text-gray-500">Dernière mise à jour</div>
              <div className="font-semibold mt-1">{derniereMaj}</div>
            </div>

            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-sm text-gray-500">Données en mémoire</div>
              <div className="font-semibold mt-1">{nbDonnees} entrées</div>
            </div>

            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-sm text-gray-500">Alertes actives</div>
              <div className="font-semibold mt-1">{nbAlertes}</div>
            </div>

            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-sm text-gray-500">Taux de rafraîchissement</div>
              <div className="font-semibold mt-1">30 secondes</div>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Journaux système</h2>
        <div className={`p-4 rounded-lg font-mono text-sm ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} max-h-64 overflow-y-auto`}>
          <div className="text-green-500">[{new Date().toLocaleTimeString()}] ✓ Module connecté</div>
          <div className="text-blue-500">[{new Date().toLocaleTimeString()}] → Récupération des données...</div>
          <div className="text-green-500">[{new Date().toLocaleTimeString()}] ✓ Données reçues</div>
          <div className="text-gray-500">[{new Date().toLocaleTimeString()}] ℹ Mise à jour graphiques</div>
          <div className="text-green-500">[{new Date().toLocaleTimeString()}] ✓ Système opérationnel</div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Informations système</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Version application</span>
            <span className="font-semibold">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Build</span>
            <span className="font-semibold">2025.11.11</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Environnement</span>
            <span className="font-semibold">Production</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Navigateur</span>
            <span className="font-semibold">{navigator.userAgent.split(' ').pop()}</span>
          </div>
        </div>
      </div>
      
      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">
          <Database className="inline mr-2" size={20} />
          Enregistrements en base de données
        </h2>
        
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Total: {pagination.total} enregistrements
          </div>
          <button
            onClick={() => loadDbRecords(pagination.page)}
            disabled={loadingDb}
            className={`px-3 py-1 rounded text-sm ${
              loadingDb 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loadingDb ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>

        <div className={`rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}>
                <tr>
                  <th className="px-4 py-2 text-left">Timestamp</th>
                  <th className="px-4 py-2 text-left">Puissance (W)</th>
                  <th className="px-4 py-2 text-left">Index HC</th>
                  <th className="px-4 py-2 text-left">Index HP</th>
                  <th className="px-4 py-2 text-left">Période</th>
                </tr>
              </thead>
              <tbody>
                {dbRecords.map((record, index) => (
                  <tr key={record.timestamp} className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                    <td className="px-4 py-2 font-mono text-xs">
                      {new Date(record.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-2">{record.papp || '-'}</td>
                    <td className="px-4 py-2">{record.hchc || '-'}</td>
                    <td className="px-4 py-2">{record.hchp || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.ptec === '1' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                          : record.ptec === '2'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {record.ptec === '1' ? 'HC' : record.ptec === '2' ? 'HP' : record.ptec || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {dbRecords.length === 0 && !loadingDb && (
              <div className="text-center py-8 text-gray-500">
                Aucun enregistrement trouvé
              </div>
            )}
            
            {loadingDb && (
              <div className="text-center py-8 text-gray-500">
                Chargement des enregistrements...
              </div>
            )}
          </div>
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {pagination.page} sur {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadDbRecords(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className={`p-2 rounded ${
                  pagination.page <= 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => loadDbRecords(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className={`p-2 rounded ${
                  pagination.page >= pagination.totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Gestion des données</h2>
        <LoadHistoricalData />
        
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle className="inline mr-2" size={20} />
            Actions dangereuses
          </h3>
          <button
            onClick={resetDatabase}
            disabled={isResetting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isResetting 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
            }`}
          >
            <Trash2 size={16} />
            {isResetting ? 'Réinitialisation...' : 'Réinitialiser la base de données'}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Supprime toutes les données de consommation et les paramètres. Action irréversible.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Diagnostic;