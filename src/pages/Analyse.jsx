import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingDown, TrendingUp, CheckCircle, AlertTriangle, Zap, Clock } from 'lucide-react';
import { useAppStore } from '../context/AppContext';
import { formatDateInTimezone } from '../utils/dateUtils';

const Analyse = () => {
  console.log('Analyse - render début');
  const { theme, historicalData, loadHistoricalData, config } = useAppStore();
  const [periode, setPeriode] = useState('semaine');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [analyseData, setAnalyseData] = useState({
    profilHoraire: [],
    tendances: {},
    statistiques: {},
    periodesPointe: [],
    evolutionJournaliere: []
  });
  
  console.log('Analyse - state initialisé');

  // Calculer la plage de dates par défaut
  useEffect(() => {
    const today = new Date();
    const startDate = new Date(today);
    
    if (periode === 'jour') {
      startDate.setDate(today.getDate() - 1);
    } else if (periode === 'semaine') {
      startDate.setDate(today.getDate() - 7);
    } else if (periode === 'mois') {
      startDate.setMonth(today.getMonth() - 1);
    }
    
    setDateRange({
      start: startDate.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    });
  }, [periode]);

  // Charger les données pour la période sélectionnée
  useEffect(() => {
    const loadData = async () => {
      if (dateRange.start && dateRange.end) {
        try {
          const startDate = new Date(dateRange.start);
          startDate.setHours(0, 0, 0, 0);
          
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          
          await loadHistoricalData(startDate.toISOString(), endDate.toISOString());
        } catch (error) {
          console.error('Erreur de chargement des données:', error);
        }
      }
    };
    
    loadData();
  }, [dateRange.start, dateRange.end]);

  // Analyser les données quand elles changent
  useEffect(() => {
    console.log('Analyse - historicalData:', historicalData?.length, 'points');
    if (historicalData && historicalData.length > 0) {
      console.log('Analyse - début analyse');
      analyserDonnees(historicalData);
    } else {
      console.log('Analyse - pas de données');
    }
  }, [historicalData, periode]);

  const analyserDonnees = (data) => {
    console.log('analyserDonnees - début avec', data.length, 'points');
    
    try {
      // Échantillonner les données pour accélérer les calculs
      const sampledData = [];
      const sampleInterval = periode === 'jour' ? 5 * 60 * 1000 : 30 * 60 * 1000; // 5min ou 30min
      let lastSampleTime = null;
      
      const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      for (const d of sortedData) {
        const dataTime = new Date(d.timestamp);
        if (!lastSampleTime || (dataTime - lastSampleTime) >= sampleInterval) {
          sampledData.push(d);
          lastSampleTime = dataTime;
        }
      }
      
      console.log('Échantillonnage terminé:', sampledData.length, 'points (sur', data.length, ')');
      
      // Calculer le profil horaire moyen sur les données échantillonnées
      const profilHoraire = Array.from({ length: 24 }, (_, h) => {
        const hourData = sampledData.filter(d => new Date(d.timestamp).getHours() === h);
        const avg = hourData.length > 0 
          ? hourData.reduce((sum, d) => sum + (d.papp || 0), 0) / hourData.length 
          : 0;
        const max = hourData.length > 0 
          ? Math.max(...hourData.map(d => d.papp || 0))
          : 0;
        return {
          heure: `${h}h`,
          puissance: Math.round(avg),
          max: Math.round(max)
        };
      });
      
      console.log('profilHoraire calculé:', profilHoraire.length, 'heures');

    // Calculer les statistiques générales
    const puissances = data.map(d => d.papp || 0);
    const statistiques = {
      puissanceMoyenne: Math.round(puissances.reduce((a, b) => a + b, 0) / puissances.length),
      puissanceMax: Math.max(...puissances),
      puissanceMin: Math.min(...puissances),
      totalPoints: data.length,
      consoTotale: calculerConsommationTotale(data)
    };

    // Identifier les périodes de pointe
    const periodesPointe = identifierPeriodesPointe(profilHoraire);

    // Calculer les tendances
    const tendances = calculerTendances(data);

    // Évolution journalière
    const evolutionJournaliere = calculerEvolutionJournaliere(data);

    const result = {
      profilHoraire,
      tendances,
      statistiques,
      periodesPointe,
      evolutionJournaliere
    };
    
    console.log('Résultat analyse:', result);
    setAnalyseData(result);
  } catch (error) {
    console.error('Erreur dans analyserDonnees:', error);
  }
  };

  const calculerConsommationTotale = (data) => {
    if (data.length < 2) return 0;
    
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const first = sortedData[0];
    const last = sortedData[sortedData.length - 1];
    
    let hcConso = 0;
    let hpConso = 0;
    
    if (first.hchc && last.hchc) {
      hcConso = (last.hchc - first.hchc) / 1000; // Convertir en kWh
    }
    if (first.hchp && last.hchp) {
      hpConso = (last.hchp - first.hchp) / 1000; // Convertir en kWh
    }
    
    return Math.round((hcConso + hpConso) * 100) / 100;
  };

  const identifierPeriodesPointe = (profilHoraire) => {
    const sortedByPuissance = [...profilHoraire].sort((a, b) => b.puissance - a.puissance);
    const topHours = sortedByPuissance.slice(0, 3).map(h => parseInt(h.heure));
    const bottomHours = sortedByPuissance.slice(-3).map(h => parseInt(h.heure));
    
    return {
      pointe: topHours.sort((a, b) => a - b),
      creuse: bottomHours.sort((a, b) => a - b)
    };
  };

  const calculerTendances = (data) => {
    // Échantillonner les données pour les tendances
    const sampledData = [];
    const sampleInterval = 60 * 60 * 1000; // 1 heure
    let lastSampleTime = null;
    
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    for (const d of sortedData) {
      const dataTime = new Date(d.timestamp);
      if (!lastSampleTime || (dataTime - lastSampleTime) >= sampleInterval) {
        sampledData.push(d);
        lastSampleTime = dataTime;
      }
    }
    
    // Regrouper par jour
    const dailyData = {};
    sampledData.forEach(d => {
      const day = formatDateInTimezone(d.timestamp, config.timezone);
      if (!dailyData[day]) {
        dailyData[day] = [];
      }
      dailyData[day].push(d);
    });

    const days = Object.keys(dailyData).sort();
    if (days.length < 2) {
      return { variation: 0, optimisationHC: 0 };
    }

    // Comparer la première et la dernière moitié
    const midPoint = Math.floor(days.length / 2);
    const firstHalf = days.slice(0, midPoint);
    const secondHalf = days.slice(midPoint);

    const avgFirst = firstHalf.reduce((sum, day) => {
      const dayAvg = dailyData[day].reduce((s, d) => s + (d.papp || 0), 0) / dailyData[day].length;
      return sum + dayAvg;
    }, 0) / firstHalf.length;

    const avgSecond = secondHalf.reduce((sum, day) => {
      const dayAvg = dailyData[day].reduce((s, d) => s + (d.papp || 0), 0) / dailyData[day].length;
      return sum + dayAvg;
    }, 0) / secondHalf.length;

    const variation = ((avgSecond - avgFirst) / avgFirst) * 100;

    // Calculer l'optimisation HC/HP
    let totalHC = 0, totalHP = 0;
    Object.values(dailyData).forEach(dayData => {
      dayData.forEach(d => {
        if (d.ptec == 1) totalHC++;
        else if (d.ptec == 2) totalHP++;
      });
    });

    const optimisationHC = totalHC / (totalHC + totalHP) * 100;

    return {
      variation: Math.round(variation * 10) / 10,
      optimisationHC: Math.round(optimisationHC)
    };
  };

  const calculerEvolutionJournaliere = (data) => {
    // Échantillonner les données pour l'évolution
    const sampledData = [];
    const sampleInterval = 2 * 60 * 60 * 1000; // 2 heures
    let lastSampleTime = null;
    
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    for (const d of sortedData) {
      const dataTime = new Date(d.timestamp);
      if (!lastSampleTime || (dataTime - lastSampleTime) >= sampleInterval) {
        sampledData.push(d);
        lastSampleTime = dataTime;
      }
    }
    
    const dailyData = {};
    sampledData.forEach(d => {
      const day = formatDateInTimezone(d.timestamp, config.timezone);
      if (!dailyData[day]) {
        dailyData[day] = { sum: 0, count: 0, max: 0 };
      }
      const puissance = d.papp || 0;
      dailyData[day].sum += puissance;
      dailyData[day].count++;
      dailyData[day].max = Math.max(dailyData[day].max, puissance);
    });

    return Object.entries(dailyData).map(([date, stats]) => ({
      date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      moyenne: Math.round(stats.sum / stats.count),
      max: stats.max
    })).slice(-30); // 30 derniers jours maximum
  };

  const cardClass = `${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`;

  const formatPeriodeHeures = (heures) => {
    if (!heures || heures.length === 0) return 'N/A';
    if (heures.length === 1) return `${heures[0]}h`;
    if (heures.length === 2) return `${heures[0]}h - ${heures[1]}h`;
    return `${heures[0]}h - ${heures[heures.length - 1]}h`;
  };

  console.log('Analyse - avant return, analyseData:', analyseData);
  
  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">Analyse de consommation</h2>
          <div className="flex gap-2">
            {['jour', 'semaine', 'mois'].map(p => (
              <button
                key={p}
                onClick={() => setPeriode(p)}
                className={`px-4 py-2 rounded-lg transition ${
                  periode === p
                    ? 'bg-blue-500 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {p === 'jour' ? 'Jour' : p === 'semaine' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Zap size={16} />
              <span className="text-sm">Puissance moyenne</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {analyseData.statistiques.puissanceMoyenne || 0} W
            </div>
          </div>

          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
              <AlertTriangle size={16} />
              <span className="text-sm">Puissance max</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {analyseData.statistiques.puissanceMax || 0} W
            </div>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <Clock size={16} />
              <span className="text-sm">Consommation totale</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {analyseData.statistiques.consoTotale || 0} kWh
            </div>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <TrendingDown size={16} />
              <span className="text-sm">Points analysés</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {analyseData.statistiques.totalPoints || 0}
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Profil de consommation horaire</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analyseData.profilHoraire}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
            <XAxis dataKey="heure" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
            <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                border: 'none',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="puissance" fill="#8b5cf6" name="Puissance moyenne (W)" />
            <Bar dataKey="max" fill="#f97316" name="Puissance max (W)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cardClass}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={20} />
            Périodes de pointe
          </h3>
          <div className="text-3xl font-bold text-orange-500">
            {formatPeriodeHeures(analyseData.periodesPointe.pointe)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Heures avec la consommation la plus élevée
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="text-blue-500" size={20} />
            Périodes creuses
          </h3>
          <div className="text-3xl font-bold text-blue-500">
            {formatPeriodeHeures(analyseData.periodesPointe.creuse)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Heures avec la consommation la plus faible
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Tendances</h2>
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-4 rounded-lg ${
            analyseData.tendances.variation < 0 
              ? 'bg-green-50' 
              : analyseData.tendances.variation > 0 
              ? 'bg-red-50' 
              : 'bg-gray-50'
          }`}>
            <div>
              <div className="font-semibold flex items-center gap-2">
                {analyseData.tendances.variation < 0 ? (
                  <>
                    <TrendingDown className="text-green-500" size={20} />
                    <span className="text-green-800">Consommation en baisse</span>
                  </>
                ) : analyseData.tendances.variation > 0 ? (
                  <>
                    <TrendingUp className="text-red-500" size={20} />
                    <span className="text-red-800">Consommation en hausse</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-800">Consommation stable</span>
                  </>
                )}
              </div>
              <div className={`text-sm mt-1 ${
                analyseData.tendances.variation < 0 
                  ? 'text-green-600' 
                  : analyseData.tendances.variation > 0 
                  ? 'text-red-600' 
                  : 'text-gray-600'
              }`}>
                {analyseData.tendances.variation > 0 ? '+' : ''}{analyseData.tendances.variation}% par rapport à la période précédente
              </div>
            </div>
          </div>
          
          <div className={`flex items-center justify-between p-4 rounded-lg ${
            analyseData.tendances.optimisationHC > 50 
              ? 'bg-blue-50' 
              : 'bg-orange-50'
          }`}>
            <div>
              <div className="font-semibold flex items-center gap-2">
                <CheckCircle className={analyseData.tendances.optimisationHC > 50 ? 'text-blue-500' : 'text-orange-500'} size={20} />
                <span className={analyseData.tendances.optimisationHC > 50 ? 'text-blue-800' : 'text-orange-800'}>
                  Heures creuses {analyseData.tendances.optimisationHC > 50 ? 'bien' : 'peu'} optimisées
                </span>
              </div>
              <div className={`text-sm mt-1 ${
                analyseData.tendances.optimisationHC > 50 
                  ? 'text-blue-600' 
                  : 'text-orange-600'
              }`}>
                {analyseData.tendances.optimisationHC}% de la consommation en HC 
                {analyseData.tendances.optimisationHC < 50 && ' (objectif: >50%)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {analyseData.evolutionJournaliere.length > 0 && (
        <div className={cardClass}>
          <h2 className="text-xl font-semibold mb-4">Évolution journalière</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyseData.evolutionJournaliere}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                  border: 'none',
                  borderRadius: '8px'
                }}
              />
              <Area type="monotone" dataKey="max" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.6} name="Puissance max (W)" />
              <Area type="monotone" dataKey="moyenne" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Puissance moyenne (W)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Analyse;