// src/components/LoadHistoricalData.jsx
import React from 'react';
import { useAppStore } from '../context/AppContext';

const LoadHistoricalData = () => {
  const { loadHistoricalDataFromApi, isLoading, addAlert } = useAppStore();

  const handleLoadHistoricalData = async () => {
    console.log('Bouton de chargement historique cliqué');
    if (!window.confirm('Êtes-vous sûr de vouloir charger toutes les données historiques depuis ThingSpeak ? Cela peut prendre quelques minutes.')) {
      console.log('Utilisateur a annulé le chargement');
      return;
    }
    
    console.log('Lancement du chargement historique...');
    
    try {
      await loadHistoricalDataFromApi();
      console.log('Chargement historique terminé avec succès');
      addAlert({
        type: 'success',
        message: 'Historique chargé avec succès depuis ThingSpeak',
        severity: 'low'
      });
    } catch (error) {
      console.error('Erreur lors du chargement historique:', error);
      addAlert({
        type: 'error',
        message: 'Erreur de chargement de l\'historique: ' + error.message,
        severity: 'critical'
      });
    }
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-3">Chargement historique</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        Charger toutes les données historiques disponibles depuis votre canal ThingSpeak vers la base de données locale
      </p>
      <button
        onClick={handleLoadHistoricalData}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg font-medium transition ${
          isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isLoading ? 'Chargement...' : 'Charger historique complet'}
      </button>
    </div>
  );
};

export default LoadHistoricalData;