import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, DollarSign, BarChart2, TrendingDown } from 'lucide-react';
import { useAppStore } from '../context/AppContext';

const Dashboard = () => {
  const { theme, currentData, historicalData } = useAppStore();

  if (!currentData) {
    return <div className="p-8 text-center">Chargement des données...</div>;
  }

  // Filtrer les données pour les dernières 24 heures
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  // Filtrer les données pour la période d'hier (24-48h avant)
  const fortyEightHoursAgo = new Date();
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

  const last24h = historicalData.filter(d => new Date(d.timestamp) >= twentyFourHoursAgo);
  const yesterday24h = historicalData.filter(d => {
    const date = new Date(d.timestamp);
    return date >= fortyEightHoursAgo && date < twentyFourHoursAgo;
  });
  
  // Échantillonner les données : un point toutes les 15 minutes
  const sampledData = [];
  if (last24h.length > 0) {
    const sortedData = [...last24h].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    let lastSampleTime = null;
    
    for (const data of sortedData) {
      const dataTime = new Date(data.timestamp);
      
      // Si c'est le premier point ou si 15 minutes se sont écoulées
      if (!lastSampleTime || (dataTime - lastSampleTime) >= 15 * 60 * 1000) {
        sampledData.push(data);
        lastSampleTime = dataTime;
      }
    }
  }

  // Calculer la consommation des dernières 24h en utilisant les différences d'index
  let conso24hHC = 0;
  let conso24hHP = 0;
  
  if (last24h.length > 0) {
    // Trier les données par timestamp pour s'assurer qu'on a les bonnes valeurs de début et de fin
    const sorted24hData = [...last24h].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstData = sorted24hData[0];
    const lastData = sorted24hData[sorted24hData.length - 1];
    
    // Calculer la consommation comme la différence entre les index de début et de fin
    // Les index semblent déjà être en kWh, pas besoin de diviser par 1000
    conso24hHC = parseFloat((lastData.hchc - firstData.hchc).toFixed(2));
    conso24hHP = parseFloat((lastData.hchp - firstData.hchp).toFixed(2));
  }
  
  // Calculer la consommation d'hier
  let consoHierHC = 0;
  let consoHierHP = 0;
  
  if (yesterday24h.length > 0) {
    const sortedYesterdayData = [...yesterday24h].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstYesterdayData = sortedYesterdayData[0];
    const lastYesterdayData = sortedYesterdayData[sortedYesterdayData.length - 1];
    
    consoHierHC = parseFloat((lastYesterdayData.hchc - firstYesterdayData.hchc).toFixed(2));
    consoHierHP = parseFloat((lastYesterdayData.hchp - firstYesterdayData.hchp).toFixed(2));
  }
  
  const consoDuJour = (conso24hHC + conso24hHP).toFixed(2);
  const consoHier = (consoHierHC + consoHierHP).toFixed(2);
  const coutEstime = (conso24hHP * 0.2460 + conso24hHC * 0.1821).toFixed(2); // Utilisation des tarifs par défaut
  
  // Calculer la variation vs hier
  let variationVsHier = null;
  let variationText = '';
  let variationColor = 'text-gray-500';
  
  if (consoHier > 0) {
    const variation = ((parseFloat(consoDuJour) - parseFloat(consoHier)) / parseFloat(consoHier)) * 100;
    variationVsHier = variation.toFixed(1);
    
    if (variation > 0) {
      variationText = `+${variationVsHier}% vs hier`;
      variationColor = 'text-red-500';
    } else if (variation < 0) {
      variationText = `${variationVsHier}% vs hier`;
      variationColor = 'text-green-500';
    } else {
      variationText = '0% vs hier';
      variationColor = 'text-gray-500';
    }
  } else {
    variationText = 'Pas de données hier';
    variationColor = 'text-gray-500';
  }

  // Préparer les données pour le graphique avec les index HC et HP
  const prepareChartData = () => {
    if (sampledData.length === 0) return [];
    
    // Trier les données par timestamp
    const sortedData = [...sampledData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Créer la première entrée avec les valeurs de base
    const firstData = sortedData[0];
    
    // Calculer la consommation depuis le début de la période (premier point = 0)
    return sortedData.map((d) => {
      const hcConsumption = parseFloat((d.hchc - firstData.hchc).toFixed(2));
      const hpConsumption = parseFloat((d.hchp - firstData.hchp).toFixed(2));
      
      return {
        time: new Date(d.timestamp).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Europe/Paris'
        }),
        indexHc: hcConsumption, // Consommation HC depuis le début
        indexHp: hpConsumption  // Consommation HP depuis le début
      };
    });
  };

  const chartData = prepareChartData();
  
  // Debug: calculer les index max pour vérifier l'échelle
  console.log('=== DEBUG GRAPHIQUE ===');
  console.log('Nombre de données 24h:', last24h.length);
  console.log('Nombre de données échantillonnées:', sampledData.length);
  if (sampledData.length > 0) {
    console.log('Première donnée brute:', sampledData[0]);
    console.log('Dernière donnée brute:', sampledData[sampledData.length - 1]);
    console.log('hchc première:', sampledData[0].hchc, 'hchc dernière:', sampledData[sampledData.length - 1].hchc);
    console.log('hchp première:', sampledData[0].hchp, 'hchp dernière:', sampledData[sampledData.length - 1].hchp);
  }
  
  const maxHc = Math.max(...chartData.map(d => d.indexHc || 0));
  const maxHp = Math.max(...chartData.map(d => d.indexHp || 0));
  console.log('Index HC max calculé:', maxHc, 'Index HP max calculé:', maxHp);
  console.log('Première donnée graphique:', chartData[0]);
  console.log('Dernière donnée graphique:', chartData[chartData.length - 1]);
  console.log('=== FIN DEBUG ===');

  const cardClass = `${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Consommation du jour</span>
            <Activity className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold">{consoDuJour} kWh</div>
          <div className={`text-sm flex items-center mt-2 ${variationColor}`}>
            {variationVsHier !== null && variationVsHier !== 0 && (
              variationVsHier > 0 ? 
                <TrendingDown size={16} className="mr-1 rotate-180" /> : 
                <TrendingDown size={16} className="mr-1" />
            )}
            {variationText}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Coût estimé</span>
            <DollarSign className="text-green-500" size={20} />
          </div>
          <div className="text-3xl font-bold">{coutEstime} €</div>
          <div className="text-sm text-gray-500 mt-2">Aujourd'hui</div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Puissance maximale</span>
            <BarChart2 className="text-purple-500" size={20} />
          </div>
          <div className="text-3xl font-bold">
            {last24h.length > 0 ? Math.max(...last24h.map(d => d.papp || 0)).toFixed(0) : 0} W
          </div>
          <div className="text-sm text-gray-500 mt-2">Sur 24h</div>
        </div>
      </div>

      {/* Graphique montrant l'évolution des index HC et HP */}
      <div className={cardClass}>
        <h2 className="text-lg font-semibold mb-4">Consommation cumulative sur 24h</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
            <XAxis dataKey="time" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
            <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} domain={[0, 'dataMax']} />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="indexHc" name="Consommation HC (kWh)" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="indexHp" name="Consommation HP (kWh)" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cardClass}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Index Heures Creuses</h3>
          <div className="text-2xl font-bold text-blue-500">{parseFloat(currentData.hchc).toFixed(1).replace('.', ',')} kWh</div>
          <div className="text-sm text-gray-500 mt-2">Consommation HC (24h): {conso24hHC.toFixed(2)} kWh</div>
        </div>
        <div className={cardClass}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Index Heures Pleines</h3>
          <div className="text-2xl font-bold text-orange-500">{parseFloat(currentData.hchp).toFixed(1).replace('.', ',')} kWh</div>
          <div className="text-sm text-gray-500 mt-2">Consommation HP (24h): {conso24hHP.toFixed(2)} kWh</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;