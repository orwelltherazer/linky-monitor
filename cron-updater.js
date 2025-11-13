#!/usr/bin/env node

// Cacher les logs de dotenv
const originalWrite = process.stdout.write;
process.stdout.write = function(string, encoding, fd) {
  if (string.includes('[dotenv@')) {
    return false;
  }
  return originalWrite.call(process.stdout, string, encoding, fd);
};

import dotenv from 'dotenv';
dotenv.config();

import DatabaseService from './server/database.js';

class CronDataUpdater {
  constructor() {
    this.isRunning = false;
    this.lastUpdate = null;
  }

  // Fonction pour convertir un timestamp UTC en fonction du fuseau horaire
  convertTimestampToTimezone(timestamp, timezone = 'Europe/Paris') {
    try {
      const date = new Date(timestamp);
      
      const year = parseInt(date.toLocaleString('en-US', { timeZone: timezone, year: 'numeric' }));
      const month = parseInt(date.toLocaleString('en-US', { timeZone: timezone, month: '2-digit' })) - 1;
      const day = parseInt(date.toLocaleString('en-US', { timeZone: timezone, day: '2-digit' }));
      const hour = parseInt(date.toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }));
      const minute = parseInt(date.toLocaleString('en-US', { timeZone: timezone, minute: '2-digit' }));
      const second = parseInt(date.toLocaleString('en-US', { timeZone: timezone, second: '2-digit' }));
      
      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      console.warn('Erreur de conversion de fuseau horaire, utilisation de la date originale:', error);
      return new Date(timestamp);
    }
  }

  // Fonction pour formater une date en fonction du fuseau horaire
  formatDate(dateString) {
    const date = this.convertTimestampToTimezone(dateString);
    return date.toISOString().split('T')[0];
  }

  async updateData() {
    if (this.isRunning) {
      console.log(`[${new Date().toISOString()}] SKIP: Mise à jour déjà en cours`);
      return;
    }

    this.isRunning = true;
    console.log(`[${new Date().toISOString()}] START: Mise à jour des données`);

    try {
      // Initialiser la base de données
      await DatabaseService.init();
      
      // Récupérer l'URL de l'API depuis les paramètres
      let apiUrl = await DatabaseService.getSetting('apiUrl');
      
      if (!apiUrl) {
        console.log(`[${new Date().toISOString()}] CONFIG: URL API non configurée`);
        return;
      }

      // Ajouter un paramètre pour récupérer plus de points (100 derniers pour couvrir 5 min)
      const separator = apiUrl.includes('?') ? '&' : '?';
      apiUrl = `${apiUrl}${separator}results=100`;

      // Récupérer la configuration des champs
      const fieldPapp = await DatabaseService.getSetting('fieldPapp') || 'field1';
      const fieldIinst = await DatabaseService.getSetting('fieldIinst') || 'field2';
      const fieldPtec = await DatabaseService.getSetting('fieldPtec') || 'field3';
      const fieldHchc = await DatabaseService.getSetting('fieldHchc') || 'field4';
      const fieldHchp = await DatabaseService.getSetting('fieldHchp') || 'field5';

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Erreur HTTP! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.feeds && data.feeds.length > 0) {
        // Récupérer les données des 5 dernières minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        // Filtrer les feeds des 5 dernières minutes
        const recentFeeds = data.feeds.filter(feed => {
          const feedTime = new Date(feed.created_at);
          return feedTime >= fiveMinutesAgo;
        });

        if (recentFeeds.length === 0) {
          // Si aucune donnée récente, prendre la dernière comme fallback
          recentFeeds.push(data.feeds[data.feeds.length - 1]);
        }

        console.log(`[${new Date().toISOString()}] FETCH: ${recentFeeds.length} points des 5 dernières minutes`);

        // Convertir et sauvegarder toutes les données récentes
        let savedCount = 0;
        for (const feed of recentFeeds) {
          const adjustedTimestamp = this.convertTimestampToTimezone(feed.created_at);
          const actualData = {
            timestamp: adjustedTimestamp.toISOString(),
            papp: parseFloat(feed[fieldPapp]) || 0,
            iinst: parseFloat(feed[fieldIinst]) || 0,
            ptec: feed[fieldPtec] || 'HC',
            hchc: parseFloat(feed[fieldHchc]) || 0,
            hchp: parseFloat(feed[fieldHchp]) || 0,
            day: this.formatDate(feed.created_at),
            originalTimestamp: feed.created_at
          };

          // Sauvegarder dans la base de données
          await DatabaseService.saveConsumptionData(actualData);
          savedCount++;

          // Vérifier les seuils d'alerte
          const seuilPuissance = await DatabaseService.getSetting('seuilPuissance') || 5000;
          if (actualData.papp > seuilPuissance) {
            console.log(`[${new Date().toISOString()}] ALERT: ${actualData.papp}W > ${seuilPuissance}W`);
          }
        }

        this.lastUpdate = new Date();
        console.log(`[${new Date().toISOString()}] OK: ${savedCount} points sauvegardés`);
      } else {
        console.log(`[${new Date().toISOString()}] EMPTY: Aucune donnée ThingSpeak`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR: ${error.message}`);
      process.exit(1);
    } finally {
      this.isRunning = false;
      await DatabaseService.close();
    }
  }

  async updateHistoricalData() {
    if (this.isRunning) {
      console.log(`[${new Date().toISOString()}] SKIP: Historique déjà en cours`);
      return;
    }

    this.isRunning = true;
    console.log(`[${new Date().toISOString()}] START: Mise à jour historique`);

    try {
      // Initialiser la base de données
      await DatabaseService.init();
      
      // Récupérer l'URL de l'API depuis les paramètres
      const apiUrl = await DatabaseService.getSetting('apiUrl');
      
      if (!apiUrl) {
        console.log(`[${new Date().toISOString()}] CONFIG: URL API non configurée`);
        return;
      }

      // Récupérer la configuration des champs
      const fieldPapp = await DatabaseService.getSetting('fieldPapp') || 'field1';
      const fieldIinst = await DatabaseService.getSetting('fieldIinst') || 'field2';
      const fieldPtec = await DatabaseService.getSetting('fieldPtec') || 'field3';
      const fieldHchc = await DatabaseService.getSetting('fieldHchc') || 'field4';
      const fieldHchp = await DatabaseService.getSetting('fieldHchp') || 'field5';

      // Charger jusqu'à 8000 derniers points de données
      const separator = apiUrl.includes('?') ? '&' : '?';
      const fullUrl = `${apiUrl}${separator}results=8000`;
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`Erreur HTTP! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.feeds && data.feeds.length > 0) {
        console.log(`[${new Date().toISOString()}] FETCH: ${data.feeds.length} points`);

        // Convertir les données ThingSpeak au format de l'application
        const convertedData = data.feeds.map(feed => {
          const adjustedTimestamp = this.convertTimestampToTimezone(feed.created_at);
          return {
            timestamp: adjustedTimestamp.toISOString(),
            papp: parseFloat(feed[fieldPapp]) || 0,
            iinst: parseFloat(feed[fieldIinst]) || 0,
            ptec: feed[fieldPtec] || 'HC',
            hchc: parseFloat(feed[fieldHchc]) || 0,
            hchp: parseFloat(feed[fieldHchp]) || 0,
            day: this.formatDate(feed.created_at),
            originalTimestamp: feed.created_at
          };
        });

        // Supprimer les doublons éventuels et trier par date
        const uniqueData = convertedData.filter((item, index, self) => 
          index === self.findIndex(t => t.timestamp === item.timestamp)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Sauvegarder toutes les données dans la base locale
        for (let i = 0; i < uniqueData.length; i++) {
          const record = uniqueData[i];
          await DatabaseService.saveConsumptionData(record);
          
          if (i % 500 === 0 && i > 0) {
            console.log(`[${new Date().toISOString()}] SAVE: ${i}/${uniqueData.length}`);
          }
        }

        this.lastUpdate = new Date();
        console.log(`[${new Date().toISOString()}] DONE: ${uniqueData.length} points sauvegardés`);
      } else {
        console.log(`[${new Date().toISOString()}] EMPTY: Aucune donnée historique`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR: ${error.message}`);
      process.exit(1);
    } finally {
      this.isRunning = false;
      await DatabaseService.close();
    }
  }
}

// Gestion des arguments en ligne de commande
const updater = new CronDataUpdater();
const command = process.argv[2];

switch (command) {
  case 'update':
    updater.updateData();
    break;
  case 'historical':
    updater.updateHistoricalData();
    break;
  default:
    console.log('Usage:');
    console.log('  node cron-updater.js update       - Mettre à jour les données récentes');
    console.log('  node cron-updater.js historical  - Mettre à jour l\'historique complet');
    process.exit(1);
}