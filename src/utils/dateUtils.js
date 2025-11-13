// src/utils/dateUtils.js
export const convertTimestampToTimezone = (timestamp, timezone = 'Europe/Paris') => {
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

export const formatDateInTimezone = (timestamp, timezone = 'Europe/Paris', options = {}) => {
  const date = convertTimestampToTimezone(timestamp, timezone);
  const defaultOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  return date.toLocaleDateString('fr-FR', { ...defaultOptions, ...options });
};

export const formatDateTimeInTimezone = (timestamp, timezone = 'Europe/Paris', options = {}) => {
  const date = convertTimestampToTimezone(timestamp, timezone);
  const defaultOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleString('fr-FR', { ...defaultOptions, ...options });
};

export const formatTimeInTimezone = (timestamp, timezone = 'Europe/Paris') => {
  const date = convertTimestampToTimezone(timestamp, timezone);
  return date.toLocaleTimeString('fr-FR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};