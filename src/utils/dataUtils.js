// src/utils/dataUtils.js
export const aggregateByTimeWindow = (data, windowSizeMinutes = 10) => {
  if (!data || data.length === 0) {
    return [];
  }

  // Trier les données par timestamp pour s'assurer qu'elles sont dans l'ordre chronologique
  const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const aggregatedData = [];
  let currentWindowStart = new Date(sortedData[0].timestamp);
  // Aligner le début de la première fenêtre pour correspondre à une minute multiple de la taille de la fenêtre
  currentWindowStart.setMinutes(
    Math.floor(currentWindowStart.getMinutes() / windowSizeMinutes) * windowSizeMinutes
  );
  currentWindowStart.setSeconds(0);
  currentWindowStart.setMilliseconds(0);

  let currentWindowData = [];
  let dataIndex = 0;

  while (dataIndex < sortedData.length) {
    const currentDataPoint = sortedData[dataIndex];
    const dataTimestamp = new Date(currentDataPoint.timestamp);
    
    // Vérifier si le point de données appartient à la fenêtre actuelle
    const windowEnd = new Date(currentWindowStart);
    windowEnd.setMinutes(windowEnd.getMinutes() + windowSizeMinutes);
    
    if (dataTimestamp < windowEnd) {
      // Le point de données appartient à la fenêtre actuelle
      currentWindowData.push(currentDataPoint);
      dataIndex++;
    } else {
      // La fenêtre est terminée, calculer la moyenne et passer à la suivante
      if (currentWindowData.length > 0) {
        const aggregatedPoint = aggregateWindowData(currentWindowData, windowSizeMinutes);
        aggregatedData.push(aggregatedPoint);
      }
      
      // Passer à la fenêtre suivante
      currentWindowStart = new Date(dataTimestamp);
      currentWindowStart.setMinutes(
        Math.floor(currentWindowStart.getMinutes() / windowSizeMinutes) * windowSizeMinutes
      );
      currentWindowStart.setSeconds(0);
      currentWindowStart.setMilliseconds(0);
      
      currentWindowData = [];
    }
  }

  // Traiter la dernière fenêtre
  if (currentWindowData.length > 0) {
    const aggregatedPoint = aggregateWindowData(currentWindowData, windowSizeMinutes);
    aggregatedData.push(aggregatedPoint);
  }

  return aggregatedData;
};

const aggregateWindowData = (windowData, windowSizeMinutes) => {
  // Calculer la moyenne pour les différentes propriétés numériques
  const aggregated = {
    timestamp: new Date(windowData[0].timestamp),
    // Aligner le timestamp au début de la fenêtre
    timestamp: new Date(
      Math.floor(new Date(windowData[0].timestamp).getTime() / (windowSizeMinutes * 60 * 1000)) * (windowSizeMinutes * 60 * 1000)
    )
  };

  // Calculer les moyennes pour les propriétés numériques
  const numericProperties = ['papp', 'iinst', 'hchc', 'hchp', 'ptec'];
  const sums = {};
  const counts = {};

  windowData.forEach(dataPoint => {
    Object.keys(dataPoint).forEach(key => {
      if (typeof dataPoint[key] === 'number') {
        sums[key] = (sums[key] || 0) + dataPoint[key];
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });

  // Calculer les moyennes
  Object.keys(sums).forEach(key => {
    aggregated[key] = sums[key] / counts[key];
  });

  // Pour les propriétés non numériques, utiliser la plus récente dans la fenêtre
  windowData.forEach(dataPoint => {
    Object.keys(dataPoint).forEach(key => {
      if (typeof dataPoint[key] !== 'number' && !(key in aggregated)) {
        aggregated[key] = dataPoint[key];
      }
    });
  });

  return aggregated;
};