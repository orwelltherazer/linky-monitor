import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, BarChart, Bar } from 'recharts';
import { useAppStore } from '../context/AppContext';
import { formatDateInTimezone } from '../utils/dateUtils';

const Cout = () => {
  const { theme, config, currentData, historicalData, loadHistoricalData } = useAppStore();
  const [periode, setPeriode] = useState('jour');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [chartData, setChartData] = useState([]);

  // Fonction pour naviguer entre les dates
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (direction === 'next') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  // Fonction pour formater une date au format YYYY-MM-DD
  const formatDate = (date) => {
    return new Date(date).toISOString().split('T')[0];
  };

  // Calculer la plage de dates par défaut
  useEffect(() => {
    const today = new Date();
    const startDate = new Date(today);
    
    if (periode === 'jour') {
      startDate.setDate(today.getDate() - 1);
    } else if (periode === 'periode') {
      startDate.setDate(today.getDate() - 7); // Par défaut : dernière semaine
    }
    
    setDateRange({
      start: formatDate(startDate),
      end: formatDate(today)
    });
  }, [periode, formatDate(new Date())]);

  // Charger les données pour la période ou la date sélectionnée
  useEffect(() => {
    const loadRangeData = async () => {
      try {
        let data;
        
        if (periode === 'jour') {
          // Pour aujourd'hui : de 0h à maintenant
          // Pour les autres jours : de 0h à 24h
          let dateObj = selectedDate;
          if (!(selectedDate instanceof Date)) {
            dateObj = new Date(selectedDate);
          }
          
          const isToday = dateObj.toDateString() === new Date().toDateString();
          
          // Début de la journée à 0h
          const startDate = new Date(dateObj);
          startDate.setHours(0, 0, 0, 0);
          
          // Fin : maintenant si c'est aujourd'hui, sinon 24h
          const endDate = new Date(dateObj);
          if (isToday) {
            endDate.setHours(23, 59, 59, 999);
          } else {
            endDate.setHours(23, 59, 59, 999);
            endDate.setDate(endDate.getDate() + 1);
          }
          
          const start = startDate.toISOString();
          const end = endDate.toISOString();
          
          data = await loadHistoricalData(start, end);
        } else {
          // Charger les données pour la plage de dates (de 0h à 24h chaque jour)
          if (dateRange.start && dateRange.end) {
            const startDate = new Date(dateRange.start);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            
            data = await loadHistoricalData(startDate.toISOString(), endDate.toISOString());
          }
        }
        
        // Traiter les données retournées directement
        if (data) {
          console.log('Traitement des données Cout:', data.length, 'points');
          processChartData(data);
        } else {
          setChartData([]);
        }
      } catch (error) {
        console.error('Erreur de chargement des données:', error);
        setChartData([]);
      }
    };
    
    loadRangeData();
  }, [dateRange.start, dateRange.end, selectedDate?.toDateString(), periode]);

  // Fonction pour traiter les données pour les graphiques
  const processChartData = (data) => {
    console.log('processChartData début');
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    let processedData = [];
    
    try {
      if (periode === 'jour') {
        console.log('Traitement mode jour');
        // Échantillonner les données : un point toutes les 10 minutes
        const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const sampledData = [];
        let lastSampleTime = null;
        
        for (const d of sortedData) {
          const dataTime = new Date(d.timestamp);
          
          // Si c'est le premier point ou si 10 minutes se sont écoulées
          if (!lastSampleTime || (dataTime - lastSampleTime) >= 10 * 60 * 1000) {
            sampledData.push(d);
            lastSampleTime = dataTime;
          }
        }
        
        console.log('Échantillonnage terminé:', sampledData.length, 'points');
        
        // Créer 24 périodes horaires avec les derniers index de chaque heure
        const hourlyIndex = {};
        
        // Pour chaque donnée échantillonnée, garder le dernier index de chaque heure
        sampledData.forEach(d => {
          const hour = new Date(d.timestamp).getHours();
          
          // Garder la dernière valeur connue pour chaque heure
          hourlyIndex[hour] = {
            hc: d.hchc,
            hp: d.hchp,
            ptec: d.ptec
          };
        });
        
        console.log('Index horaire créé:', Object.keys(hourlyIndex).length, 'heures');
      
      // Calculer les coûts pour chaque heure
      processedData = [];
      let previousHC = null;
      let previousHP = null;
      
      for (let i = 0; i < 24; i++) {
        if (hourlyIndex[i]) {
          const currentHC = hourlyIndex[i].hc;
          const currentHP = hourlyIndex[i].hp;
          const ptec = hourlyIndex[i].ptec;
          
          // Calculer seulement si les index existent et sont valides
          if (currentHC !== null && currentHP !== null && previousHC !== null && previousHP !== null) {
            // Consommation de l'heure = index actuel - index précédent
            const hcConsumption = parseFloat((currentHC - previousHC).toFixed(2));
            const hpConsumption = parseFloat((currentHP - previousHP).toFixed(2));
            
            // S'assurer que les consommations sont positives
            const positiveHCConsumption = Math.max(0, hcConsumption);
            const positiveHPConsumption = Math.max(0, hpConsumption);
            
            // Déterminer si c'est HC ou HP pour cette heure
            const isHC = ptec == 1; // 1 = HC, 2 = HP
            
            let coutHC = 0;
            let coutHP = 0;
            
            if (isHC) {
              coutHC = positiveHCConsumption * config.prixHC;
            } else {
              coutHP = positiveHPConsumption * config.prixHP;
            }
            
            const coutTotal = coutHC + coutHP;
            
            processedData.push({
              label: `${i}h`,
              coutHC: coutHC,
              coutHP: coutHP,
              coutTotal: coutTotal
            });
          }
          
          // Mettre à jour les références pour l'heure suivante
          previousHC = currentHC;
          previousHP = currentHP;
        }
      }
    } else if (periode === 'periode') {
      // Échantillonner les données : un point toutes les 30 minutes pour les périodes
      const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const sampledData = [];
      let lastSampleTime = null;
      
      for (const d of sortedData) {
        const dataTime = new Date(d.timestamp);
        
        // Si c'est le premier point ou si 30 minutes se sont écoulées
        if (!lastSampleTime || (dataTime - lastSampleTime) >= 30 * 60 * 1000) {
          sampledData.push(d);
          lastSampleTime = dataTime;
        }
      }
      
      // Données quotidiennes pour la période personnalisée
      const dailyData = {};
      sampledData.forEach(d => {
        const day = formatDateInTimezone(d.originalTimestamp || d.timestamp, config.timezone);
        if (!dailyData[day]) dailyData[day] = [];
        dailyData[day].push(d);
      });
      
      processedData = Object.entries(dailyData).map(([originalDay, values]) => {
        if (values.length < 2) return { label: originalDay, coutHC: 0, coutHP: 0, coutTotal: 0 };
        
        // Pour chaque jour, calculer la consommation de 0h à 24h
        const sortedValues = [...values].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const firstData = sortedValues[0]; // Première mesure (proche de 0h)
        const lastData = sortedValues[sortedValues.length - 1]; // Dernière mesure (proche de 24h)
        
        // Calculer seulement si les index existent
        let hcConsumption = 0;
        let hpConsumption = 0;
        
        if (firstData.hchc && lastData.hchc) {
          hcConsumption = parseFloat((lastData.hchc - firstData.hchc).toFixed(2));
        }
        if (firstData.hchp && lastData.hchp) {
          hpConsumption = parseFloat((lastData.hchp - firstData.hchp).toFixed(2));
        }
        
        const coutHC = hcConsumption * config.prixHC;
        const coutHP = hpConsumption * config.prixHP;
        const coutTotal = coutHC + coutHP;
        
        return {
          label: new Date(originalDay).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit'
          }),
          coutHC: coutHC,
          coutHP: coutHP,
          coutTotal: coutTotal
        };
      }).sort((a, b) => new Date(a.label) - new Date(b.label));
    }
    
      console.log('processedData final:', processedData.length, 'points');
      setChartData(processedData);
    } catch (error) {
      console.error('Erreur dans processChartData:', error);
      setChartData([]);
    }
  };

  // Calculer les totaux pour la période actuelle
  const coutTotalHC = chartData.reduce((sum, d) => sum + d.coutHC, 0);
  const coutTotalHP = chartData.reduce((sum, d) => sum + d.coutHP, 0);
  const coutTotal = coutTotalHC + coutTotalHP;
  const budgetRestant = (config.budgetMensuel - coutTotal).toFixed(2);

  const pieData = [
    { name: 'Heures Creuses', value: coutTotalHC, color: '#3b82f6' },
    { name: 'Heures Pleines', value: coutTotalHP, color: '#f97316' }
  ];

  const cardClass = `${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`;

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">Analyse des coûts</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex gap-2">
              {['jour', 'periode'].map(p => (
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
                  {p === 'jour' ? 'Jour' : 'Période'}
                </button>
              ))}
            </div>
            
            {periode === 'jour' ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateDate('prev')}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <span className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                
                <button 
                  onClick={() => navigateDate('next')}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className={`px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <span className="text-gray-500">au</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className={`px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={cardClass}>
            <div className="text-sm text-gray-500 mb-2">Coût Heures Creuses</div>
            <div className="text-3xl font-bold text-blue-500">{coutTotalHC.toFixed(2)} €</div>
            <div className="text-sm text-gray-500 mt-2">{config.prixHC} €/kWh</div>
          </div>

          <div className={cardClass}>
            <div className="text-sm text-gray-500 mb-2">Coût Heures Pleines</div>
            <div className="text-3xl font-bold text-orange-500">{coutTotalHP.toFixed(2)} €</div>
            <div className="text-sm text-gray-500 mt-2">{config.prixHP} €/kWh</div>
          </div>

          <div className={cardClass}>
            <div className="text-sm text-gray-500 mb-2">Coût Total</div>
            <div className="text-3xl font-bold text-green-500">{coutTotal.toFixed(2)} €</div>
            <div className="text-sm text-gray-500 mt-2">
              {periode === 'jour' 
                ? (selectedDate.toDateString() === new Date().toDateString() ? "Aujourd'hui" : "Jour sélectionné")
                : "Période sélectionnée"
              }
            </div>
          </div>
        </div>

        {chartData.length > 0 && (
          <>
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Coûts par heure</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="label" 
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                  />
                  <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value) => `${value.toFixed(2)}€`}
                  />
                  <Legend />
                  <Bar dataKey="coutHC" name="Coût HC (€)" fill="#3b82f6" />
                  <Bar dataKey="coutHP" name="Coût HP (€)" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Répartition HC/HP</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f97316" />
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div className={cardClass}>
          <h2 className="text-xl font-semibold mb-4">Suivi budgétaire</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Budget mensuel</span>
                <span className="font-bold">{config.budgetMensuel} €</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all ${(coutTotal / config.budgetMensuel) > 0.9 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min((coutTotal / config.budgetMensuel) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Consommé: {coutTotal.toFixed(2)} €</span>
                <span>Restant: {budgetRestant} €</span>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${budgetRestant > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`font-semibold ${budgetRestant > 0 ? 'text-green-800' : 'text-red-800'}`}>
                {budgetRestant > 0 ? `Budget respecté - Reste ${budgetRestant}€` : `Budget dépassé de ${Math.abs(budgetRestant)}€`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cout;