// src/services/DatabaseService.js
import ApiService from './ApiService.js';

class DatabaseService {
  constructor() {
    this.api = ApiService;
  }

  async init() {
    // Plus besoin d'initialiser IndexedDB, on vérifie juste la connexion API
    try {
      await this.api.request('/status');
      console.log('Connecté à l\'API serveur');
      return true;
    } catch (error) {
      console.error('Erreur de connexion à l\'API:', error);
      throw error;
    }
  }

  async saveConsumptionData(data) {
    return await this.api.saveConsumptionData(data);
  }

  async getConsumptionDataByDateRange(startDate, endDate) {
    return await this.api.getConsumptionDataByDateRange(startDate, endDate);
  }

  async getConsumptionDataByDay(date) {
    return await this.api.getConsumptionDataByDay(date);
  }

  async getAllData() {
    return await this.api.getAllData();
  }

  async countRecords() {
    return await this.api.countRecords();
  }

  async getPaginatedData(page = 1, limit = 20) {
    return await this.api.getPaginatedData(page, limit);
  }

  // Méthodes pour les paramètres (anciennement dans IndexedDB)
  async saveSetting(key, value) {
    return await this.api.saveSetting(key, value);
  }

  async getSetting(key) {
    return await this.api.getSetting(key);
  }

  // Méthode conservée pour compatibilité
  async ensureSettingsStore() {
    // Plus nécessaire avec l'API
    return true;
  }
}

export default new DatabaseService();