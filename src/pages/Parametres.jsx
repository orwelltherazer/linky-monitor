import React, { useState } from 'react';
import { useAppStore } from '../context/AppContext';

const Parametres = () => {
  const { theme, config, updateConfig } = useAppStore();
  const [formData, setFormData] = useState({
    ...config,
    fieldPapp: config.fieldPapp || 'field1',  // Puissance apparente
    fieldIinst: config.fieldIinst || 'field2',  // Intensité instantanée
    fieldPtec: config.fieldPtec || 'field3',  // Période tarifaire (HC/HP)
    fieldHchc: config.fieldHchc || 'field4',  // Index heures creuses
    fieldHchp: config.fieldHchp || 'field5',   // Index heures pleines
    timezone: config.timezone || 'Europe/Paris'  // Fuseau horaire
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateConfig(formData);
    alert('Paramètres enregistrés avec succès !');
  };

  const cardClass = `${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`;

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-6">Configuration générale</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Prix kWh Heures Creuses (€)</label>
            <input
              type="number"
              step="0.0001"
              value={formData.prixHC}
              onChange={(e) => handleChange('prixHC', parseFloat(e.target.value))}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Prix kWh Heures Pleines (€)</label>
            <input
              type="number"
              step="0.0001"
              value={formData.prixHP}
              onChange={(e) => handleChange('prixHP', parseFloat(e.target.value))}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Budget mensuel (€)</label>
            <input
              type="number"
              value={formData.budgetMensuel}
              onChange={(e) => handleChange('budgetMensuel', parseFloat(e.target.value))}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL de l'API</label>
            <input
              type="text"
              value={formData.apiUrl}
              onChange={(e) => handleChange('apiUrl', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="https://api.thingspeak.com/channels/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fuseau horaire</label>
            <select
              value={formData.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
              <option value="Europe/London">Europe/London (GMT+0)</option>
              <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Champ Puissance (field)</label>
              <input
                type="text"
                value={formData.fieldPapp}
                onChange={(e) => handleChange('fieldPapp', e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="field1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Champ Intensité (field)</label>
              <input
                type="text"
                value={formData.fieldIinst}
                onChange={(e) => handleChange('fieldIinst', e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="field2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Champ Période (field)</label>
              <input
                type="text"
                value={formData.fieldPtec}
                onChange={(e) => handleChange('fieldPtec', e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="field3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Champ HC (field)</label>
              <input
                type="text"
                value={formData.fieldHchc}
                onChange={(e) => handleChange('fieldHchc', e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="field4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Champ HP (field)</label>
              <input
                type="text"
                value={formData.fieldHchp}
                onChange={(e) => handleChange('fieldHchp', e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="field5"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Enregistrer les paramètres
          </button>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Seuils d'alerte</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Seuil de puissance (W)</label>
            <input
              type="number"
              value={formData.seuilPuissance}
              onChange={(e) => handleChange('seuilPuissance', parseInt(e.target.value))}
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
              value={formData.seuilJournalier}
              onChange={(e) => handleChange('seuilJournalier', parseInt(e.target.value))}
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
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">À propos</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Dernière mise à jour:</strong> Novembre 2025</p>
          <p><strong>Développé avec:</strong> React + Vite + TailwindCSS + Recharts</p>
        </div>
      </div>
    </div>
  );
};

export default Parametres;