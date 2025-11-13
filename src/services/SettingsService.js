// src/services/SettingsService.js
import DatabaseService from './DatabaseService.js';

class SettingsService {
  constructor() {
    this.dbService = DatabaseService;
  }

  async saveSettings(settings) {
    try {
      console.log('Sauvegarde des paramètres:', settings);
      
      // Sauvegarder chaque paramètre comme une entrée distincte
      for (const [key, value] of Object.entries(settings)) {
        console.log(`Sauvegarde du paramètre ${key}:`, value);
        await this.dbService.saveSetting(key, value);
      }
      
      console.log('Tous les paramètres ont été sauvegardés');
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      throw error;
    }
  }

  async loadSettings() {
    try {
      console.log('Chargement des paramètres...');
      
      // Charger les paramètres connus
      const settingKeys = [
        'prixHC',
        'prixHP',
        'seuilPuissance',
        'seuilJournalier',
        'budgetMensuel',
        'apiUrl',
        'fieldPapp',
        'fieldIinst',
        'fieldPtec',
        'fieldHchc',
        'fieldHchp',
        'timezone'
      ];

      const settings = {};
      for (const key of settingKeys) {
        try {
          const value = await this.dbService.getSetting(key);
          if (value !== null) {
            console.log(`Paramètre ${key} chargé:`, value);
            settings[key] = value;
          }
        } catch (error) {
          console.warn(`Impossible de charger le paramètre ${key}:`, error);
        }
      }

      console.log('Paramètres chargés:', settings);
      return settings;
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      throw error;
    }
  }

  async loadSetting(key) {
    try {
      return await this.dbService.getSetting(key);
    } catch (error) {
      console.error(`Erreur lors du chargement du paramètre ${key}:`, error);
      return null;
    }
  }

  async saveSetting(key, value) {
    try {
      return await this.dbService.saveSetting(key, value);
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde du paramètre ${key}:`, error);
      throw error;
    }
  }
}

export default new SettingsService();