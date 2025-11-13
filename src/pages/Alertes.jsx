import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../context/AppContext';

const Alertes = () => {
  const { theme, alerts, config, updateConfig } = useAppStore();
  const [seuilPuissance, setSeuilPuissance] = useState(config.seuilPuissance);
  const [seuilJournalier, setSeuilJournalier] = useState(config.seuilJournalier);

  const handleSave = () => {
    updateConfig({ seuilPuissance, seuilJournalier });
    alert('Seuils enregistrés avec succès !');
  };

  const cardClass = `${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`;

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Configuration des seuils</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Seuil de puissance (W)</label>
            <input
              type="number"
              value={seuilPuissance}
              onChange={(e) => setSeuilPuissance(Number(e.target.value))}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <p className="text-sm text-gray-500 mt-1">
              Alerte déclenchée si la puissance dépasse ce seuil
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Seuil journalier (kWh)</label>
            <input
              type="number"
              value={seuilJournalier}
              onChange={(e) => setSeuilJournalier(Number(e.target.value))}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <p className="text-sm text-gray-500 mt-1">
              Alerte si la consommation journalière dépasse ce seuil
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Enregistrer les seuils
          </button>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Historique des alertes</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Aucune alerte</div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'high'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={
                      alert.severity === 'critical'
                        ? 'text-red-500'
                        : alert.severity === 'high'
                        ? 'text-orange-500'
                        : 'text-yellow-500'
                    }
                    size={20}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{alert.message}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Alertes;