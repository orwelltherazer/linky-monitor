import React, { useState, useEffect, createContext, useContext } from 'react';
import ApiService from '../services/ApiService';

const AppContext = createContext();

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [currentData, setCurrentData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [config, setConfig] = useState({
    prixHC: 0.1821,
    prixHP: 0.2460,
    seuilPuissance: 5000,
    seuilJournalier: 30,
    budgetMensuel: 150,
    apiUrl: '', // URL non configurée par défaut
    fieldPapp: 'field1',    // Champ pour la puissance apparente
    fieldIinst: 'field2',   // Champ pour l'intensité instantanée
    fieldPtec: 'field3',    // Champ pour la période tarifaire (HC/HP)
    fieldHchc: 'field4',    // Champ pour l'index heures creuses
    fieldHchp: 'field5',    // Champ pour l'index heures pleines
    timezone: 'Europe/Paris'  // Fuseau horaire par défaut
  });
  const [alerts, setAlerts] = useState([]);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const updateConfig = async (newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    
    // Sauvegarder les paramètres via l'API
    try {
      for (const [key, value] of Object.entries(newConfig)) {
        await ApiService.saveSetting(key, value);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      addAlert({
        type: 'error',
        message: 'Erreur de sauvegarde des paramètres: ' + error.message,
        severity: 'critical'
      });
    }
  };

  const addAlert = (alert) => {
    const newAlert = { ...alert, id: Date.now(), timestamp: new Date().toISOString() };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  // Fonction pour convertir un timestamp UTC en fonction du fuseau horaire
  const convertTimestampToTimezone = (timestamp, timezone = config.timezone) => {
    try {
      const date = new Date(timestamp);
      
      // Obtenir les composants de la date dans le fuseau cible
      const year = parseInt(date.toLocaleString('en-US', { timeZone: timezone, year: 'numeric' }));
      const month = parseInt(date.toLocaleString('en-US', { timeZone: timezone, month: '2-digit' })) - 1;
      const day = parseInt(date.toLocaleString('en-US', { timeZone: timezone, day: '2-digit' }));
      const hour = parseInt(date.toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }));
      const minute = parseInt(date.toLocaleString('en-US', { timeZone: timezone, minute: '2-digit' }));
      const second = parseInt(date.toLocaleString('en-US', { timeZone: timezone, second: '2-digit' }));
      
      // Créer une nouvelle date avec les composants dans le fuseau cible
      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      console.warn('Erreur de conversion de fuseau horaire, utilisation de la date originale:', error);
      return new Date(timestamp); // Retourne la date originale en cas d'erreur
    }
  };

  // Fonction pour formater une date en fonction du fuseau horaire
  const formatDate = (dateString) => {
    const date = convertTimestampToTimezone(dateString);
    return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
  };
  
  // Fonction pour formater une date complète avec heure
  const formatDateTime = (dateString) => {
    const date = convertTimestampToTimezone(dateString);
    return date.toLocaleString('fr-FR', {
      timeZone: config.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const fetchData = async () => {
    try {
      const response = await fetch(config.apiUrl);
      if (!response.ok) {
        throw new Error(`Erreur HTTP! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.feeds && data.feeds.length > 0) {
        // Prendre le dernier feed (le plus récent)
        const lastFeed = data.feeds[data.feeds.length - 1];

        // Adapter les données de ThingSpeak au format attendu par l'application
        const adjustedTimestamp = convertTimestampToTimezone(lastFeed.created_at);
        const actualData = {
          timestamp: adjustedTimestamp.toISOString(),
          papp: parseFloat(lastFeed[config.fieldPapp]) || 0, // Utilisation du champ configuré pour la puissance
          iinst: parseFloat(lastFeed[config.fieldIinst]) || 0, // Utilisation du champ configuré pour l'intensité
          ptec: lastFeed[config.fieldPtec] || 'HC', // Utilisation du champ configuré pour la période tarifaire
          hchc: parseFloat(lastFeed[config.fieldHchc]) || 0, // Utilisation du champ configuré pour l'index HC
          hchp: parseFloat(lastFeed[config.fieldHchp]) || 0, // Utilisation du champ configuré pour l'index HP
          day: formatDate(lastFeed.created_at), // Ajout du jour pour les requêtes
          originalTimestamp: lastFeed.created_at // Conserver le timestamp original pour référence
        };

        setCurrentData(actualData);

        // Sauvegarder via l'API MySQL
        await ApiService.saveConsumptionData(actualData);

        // Charger l'historique mis à jour depuis l'API
        const dbData = await ApiService.getAllData();
        setHistoricalData(dbData);

        if (actualData.papp > config.seuilPuissance) {
          addAlert({
            type: 'warning',
            message: `Puissance élevée: ${actualData.papp}W (seuil: ${config.seuilPuissance}W)`,
            severity: 'high'
          });
        }
      } else {
        throw new Error('Aucune donnée disponible dans le flux ThingSpeak');
      }
    } catch (error) {
      console.error('Erreur fetch:', error);
      addAlert({
        type: 'error',
        message: 'Erreur de connexion à l\'API: ' + error.message,
        severity: 'critical'
      });

 // Ne plus utiliser de données simulées en cas d'erreur
      // Cela évite de polluer la base de données avec des fausses données
      console.warn('API non configurée ou inaccessible - aucune donnée sauvegardée');
      
      // Ne mettre à jour que currentData pour l'affichage, sans sauvegarder en base
      setCurrentData(null);
    }
  };
  
  // Fonction pour charger l'historique complet depuis ThingSpeak
  const loadHistoricalDataFromApi = async () => {
    try {
      console.log('Début du chargement historique');
      setIsLoading(true);
      
      // Vérifier la configuration de l'URL
      console.log('URL de l\'API:', config.apiUrl);
      console.log('Champs configurés:', {
        papp: config.fieldPapp,
        iinst: config.fieldIinst,
        ptec: config.fieldPtec,
        hchc: config.fieldHchc,
        hchp: config.fieldHchp
      });
      
      // Charger jusqu'à 8000 derniers points de données (maximum autorisé par ThingSpeak)
      // Vérifier si l'URL contient déjà des paramètres pour utiliser le bon séparateur
      const separator = config.apiUrl.includes('?') ? '&' : '?';
      const fullUrl = `${config.apiUrl}${separator}results=8000`;
      console.log('URL complète pour la requête:', fullUrl);
      
      const response = await fetch(fullUrl);
      console.log('Réponse reçue, status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Données reçues de l\'API:', data);
      
      if (data.feeds && data.feeds.length > 0) {
        console.log(`Données reçues: ${data.feeds.length} points`);
        
        // Convertir les données ThingSpeak au format de l'application
        const convertedData = data.feeds.map(feed => {
          const adjustedTimestamp = convertTimestampToTimezone(feed.created_at);
          return {
            timestamp: adjustedTimestamp.toISOString(),
            papp: parseFloat(feed[config.fieldPapp]) || 0,
            iinst: parseFloat(feed[config.fieldIinst]) || 0,
            ptec: feed[config.fieldPtec] || 'HC',
            hchc: parseFloat(feed[config.fieldHchc]) || 0,
            hchp: parseFloat(feed[config.fieldHchp]) || 0,
            day: formatDate(feed.created_at),
            originalTimestamp: feed.created_at // Conserver le timestamp original pour référence
          };
        });

        // Supprimer les doublons éventuels et trier par date
        const uniqueData = convertedData.filter((item, index, self) => 
          index === self.findIndex(t => t.timestamp === item.timestamp)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log(`Données converties et uniques: ${uniqueData.length} points`);
        
        // Sauvegarder toutes les données dans la base locale
        for (let i = 0; i < uniqueData.length; i++) {
          const record = uniqueData[i];
          await ApiService.saveConsumptionData(record);
          
          // Afficher une progression tous les 100 enregistrements
          if (i % 100 === 0) {
            console.log(`Sauvegarde en cours: ${i}/${uniqueData.length} points`);
          }
        }
        
        console.log('Toutes les données sauvegardées dans la base locale');

        // Mettre à jour l'historique avec les données complètes
        setHistoricalData(uniqueData);

        // Mettre à jour la donnée actuelle avec le dernier point
        const latestData = uniqueData[uniqueData.length - 1];
        if (latestData) {
          setCurrentData(latestData);
        }

        console.log(`Chargement historique terminé: ${uniqueData.length} points chargés`);
        addAlert({
          type: 'success',
          message: `Historique chargé: ${uniqueData.length} points`,
          severity: 'low'
        });
      } else {
        throw new Error('Aucune donnée historique disponible dans le flux ThingSpeak');
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      console.error('Stack trace:', error.stack);
      addAlert({
        type: 'error',
        message: 'Erreur de chargement de l\'historique: ' + error.message,
        severity: 'critical'
      });
    } finally {
      console.log('Fin du chargement historique, setIsLoading(false)');
      setIsLoading(false);
    }
  };

  // Initialiser la base de données
  useEffect(() => {
    const initDb = async () => {
      try {
        // Plus besoin d'initialiser la base de données locale, on utilise l'API
        
        // S'assurer que le store de paramètres existe (plus nécessaire avec l'API)
        // await DatabaseService.ensureSettingsStore();
        
        // Charger les paramètres sauvegardés depuis l'API
        const savedSettings = {};
        try {
          // Charger les paramètres un par un depuis l'API
          const settingKeys = ['apiUrl', 'seuilPuissance', 'fieldPapp', 'fieldIinst', 'fieldPtec', 'fieldHchc', 'fieldHchp'];
          for (const key of settingKeys) {
            const value = await ApiService.getSetting(key);
            if (value !== null) {
              savedSettings[key] = value;
            }
          }
        } catch (error) {
          console.log('Pas de paramètres sauvegardés dans l\'API');
        }
        
        // Mettre à jour la configuration avec les paramètres sauvegardés
        if (Object.keys(savedSettings).length > 0) {
          setConfig(prev => ({ ...prev, ...savedSettings }));
        }

        setDbInitialized(true);

        // Charger les données sauvegardées
        const savedData = await ApiService.getAllData();
        setHistoricalData(savedData);
        console.log(`Données chargées depuis l'API: ${savedData.length} enregistrements`);
        console.log(`Paramètres chargés depuis l'API: ${Object.keys(savedSettings).length} paramètres`);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'API:', error);
        addAlert({
          type: 'error',
          message: 'Erreur de base de données: ' + error.message,
          severity: 'critical'
        });
      } finally {
        setIsLoading(false);
      }
    };

    initDb();
  }, []);

  // Charger les données périodiquement
  useEffect(() => {
    if (dbInitialized) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // Toutes les 30 secondes
      return () => clearInterval(interval);
    }
  }, [config.apiUrl, dbInitialized]);

  // Charger les données au démarrage si la base est initialisée
  useEffect(() => {
    if (dbInitialized && !isLoading) {
      const loadData = async () => {
        const savedData = await ApiService.getAllData();
        setHistoricalData(savedData);
      };
      loadData();
    }
  }, [dbInitialized, isLoading]);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      currentData, historicalData,
      config, updateConfig,
      alerts, addAlert,
      isLoading,
      loadHistoricalData: async (startDate, endDate) => {
        setIsLoading(true);
        try {
          const data = await ApiService.getConsumptionDataByDateRange(startDate, endDate);
          setHistoricalData(data);
          return data;
        } catch (error) {
          console.error('Erreur lors du chargement des données historiques:', error);
          addAlert({
            type: 'error',
            message: 'Erreur de chargement des données historiques: ' + error.message,
            severity: 'critical'
          });
          throw error;
        } finally {
          setIsLoading(false);
        }
      },
      loadHistoricalDataByDay: async (date) => {
        setIsLoading(true);
        try {
          const data = await ApiService.getConsumptionDataByDay(date);
          setHistoricalData(data);
          return data;
        } catch (error) {
          console.error('Erreur lors du chargement des données journalières:', error);
          addAlert({
            type: 'error',
            message: 'Erreur de chargement des données journalières: ' + error.message,
            severity: 'critical'
          });
          throw error;
        } finally {
          setIsLoading(false);
        }
      },
      loadHistoricalDataFromApi
    }}>
      {children}
    </AppContext.Provider>
  );
};