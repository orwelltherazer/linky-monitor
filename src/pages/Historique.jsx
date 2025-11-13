import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { useAppStore } from '../context/AppContext';
import { formatTimeInTimezone, formatDateInTimezone } from '../utils/dateUtils';

const Historique = () => {
  const { theme, historicalData, loadHistoricalData, isLoading, config, loadHistoricalDataByDay } = useAppStore();
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

  // Charger les données pour le jour sélectionné
  useEffect(() => {
    if (periode === 'jour') {
      // S'assurer que selectedDate est un objet Date avant d'appeler toISOString()
      let dateObj = selectedDate;
      if (!(selectedDate instanceof Date)) {
        dateObj = new Date(selectedDate);
      }
      const dateString = dateObj.toISOString().split('T')[0];
      const loadDayData = async () => {
        try {
          // Si nous avons la fonction loadHistoricalDataByDay, utilisons-la
          if (loadHistoricalDataByDay) {
            await loadHistoricalDataByDay(dateString);
          } else {
            // Sinon, charger les données pour ce jour en particulier
            const startDate = new Date(selectedDate);
            const endDate = new Date(selectedDate);
            endDate.setDate(endDate.getDate() + 1);
            
            const start = startDate.toISOString().split('T')[0];
            const end = endDate.toISOString().split('T')[0];
            
            await loadHistoricalData(start, end);
          }
        } catch (error) {
          console.error('Erreur de chargement des données quotidiennes:', error);
        }
      };
      
      loadDayData();
    }
  }, [selectedDate, periode]);

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
  }, [periode]);

  // Charger les données pour la période ou la date sélectionnée
  useEffect(() => {
    const loadRangeData = async () => {
      try {
        let data;
        
        if (periode === 'jour') {
          // Charger les données pour la date sélectionnée
          // S'assurer que selectedDate est un objet Date avant d'appeler toISOString()
          let dateObj = selectedDate;
          if (!(selectedDate instanceof Date)) {
            dateObj = new Date(selectedDate);
          }
          const dateString = dateObj.toISOString().split('T')[0];
          if (loadHistoricalDataByDay) {
            data = await loadHistoricalDataByDay(dateString);
          } else {
            // Charger les données pour la plage de 24h
            const startDate = new Date(selectedDate);
            const endDate = new Date(selectedDate);
            endDate.setDate(endDate.getDate() + 1);
            
            const start = startDate.toISOString();
            const end = endDate.toISOString();
            
            data = await loadHistoricalData(start, end);
          }
        } else {
          // Charger les données pour la plage de dates
          if (dateRange.start && dateRange.end) {
            data = await loadHistoricalData(dateRange.start, dateRange.end);
          }
        }
        
        if (data) {
          processChartData(data);
        }
      } catch (error) {
        console.error('Erreur de chargement des données:', error);
      }
    };
    
    loadRangeData();
  }, [dateRange.start, dateRange.end, selectedDate, periode]);

  // Fonction pour traiter les données pour les graphiques
  const processChartData = (data) => {
    console.log('processChartData - data reçue:', data?.length, 'points');
    if (data && data.length > 0) {
      console.log('Premier point:', data[0]);
      console.log('Dernier point:', data[data.length - 1]);
    }
    
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    let processedData = [];
    
    switch (periode) {
      case 'jour':
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
        
        // Calculer la consommation cumulative depuis le début de la journée
        if (sampledData.length > 0) {
          const firstData = sampledData[0];
          const firstHC = firstData.hchc || 0;
          const firstHP = firstData.hchp || 0;
          
          processedData = sampledData.map((d) => {
            // Calculer la consommation seulement si les index existent
            let hcConsumption = 0;
            let hpConsumption = 0;
            
            if (d.hchc && firstData.hchc) {
              hcConsumption = parseFloat((d.hchc - firstHC).toFixed(2));
            }
            if (d.hchp && firstData.hchp) {
              hpConsumption = parseFloat((d.hchp - firstHP).toFixed(2));
            }
            
            const totalConso = hcConsumption + hpConsumption;
            
            return {
              label: new Date(d.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: config.timezone
              }),
              puissance: d.papp || 0, // Puissance en W (0-6000W)
              consoHC: hcConsumption,
              consoHP: hpConsumption,
              consoTotal: totalConso,
              periode: d.ptec == 2 ? 1 : 0 // Convertir 1=HC->0, 2=HP->1
            };
          });
        }
        break;
        
      case 'periode':
        // Échantillonner les données : un point toutes les 10 minutes
        const sortedDataPeriode = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const sampledDataPeriode = [];
        let lastSampleTimePeriode = null;
        
        for (const d of sortedDataPeriode) {
          const dataTime = new Date(d.timestamp);
          
          // Si c'est le premier point ou si 10 minutes se sont écoulées
          if (!lastSampleTimePeriode || (dataTime - lastSampleTimePeriode) >= 10 * 60 * 1000) {
            sampledDataPeriode.push(d);
            lastSampleTimePeriode = dataTime;
          }
        }
        
        // Calculer la consommation cumulative depuis le début de la période
        if (sampledDataPeriode.length > 0) {
          const firstData = sampledDataPeriode[0];
          const firstHC = firstData.hchc || 0;
          const firstHP = firstData.hchp || 0;
          
          processedData = sampledDataPeriode.map((d) => {
            // Calculer la consommation seulement si les index existent
            let hcConsumption = 0;
            let hpConsumption = 0;
            
            if (d.hchc && firstData.hchc) {
              hcConsumption = parseFloat((d.hchc - firstHC).toFixed(2));
            }
            if (d.hchp && firstData.hchp) {
              hpConsumption = parseFloat((d.hchp - firstHP).toFixed(2));
            }
            
            const totalConso = hcConsumption + hpConsumption;
            
            return {
              label: new Date(d.timestamp).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: config.timezone
              }),
              puissance: d.papp || 0, // Puissance en W (0-6000W)
              consoHC: hcConsumption,
              consoHP: hpConsumption,
              consoTotal: totalConso,
              periode: d.ptec == 2 ? 1 : 0 // Convertir 1=HC->0, 2=HP->1
            };
          });
        }
        break;
        
      default:
        processedData = [];
    }
    
    console.log('processedData:', processedData.length, 'points');
    if (processedData.length > 0) {
      console.log('Premier point traité:', processedData[0]);
      console.log('Dernier point traité:', processedData[processedData.length - 1]);
    }
    setChartData(processedData);
  };

  const cardClass = `${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg p-6`;

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">Historique de consommation</h2>
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

         {isLoading ? (
           <div className="flex justify-center items-center h-64">
             <div className="text-lg">Chargement des données...</div>
           </div>
         ) : (
           <>
             <div className="mt-8">
               <h2 className="text-xl font-semibold mb-4">Puissance soutirée (W)</h2>
               <ResponsiveContainer width="100%" height={400}>
                 <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                   <XAxis 
                     dataKey="label" 
                     stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                     interval="preserveStartEnd"
                   />
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
                   <Line type="monotone" dataKey="puissance" name="Puissance (W)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                   <Brush 
                     dataKey="label" 
                     height={30} 
                     stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                     fill={theme === 'dark' ? '#374151' : '#e5e7eb'}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>

             <div className="mt-8">
               <h2 className="text-xl font-semibold mb-4">Consommation cumulative</h2>
               <ResponsiveContainer width="100%" height={400}>
                 <AreaChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                   <XAxis 
                     dataKey="label" 
                     stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                     interval="preserveStartEnd"
                   />
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
                   <Area type="monotone" dataKey="consoHP" name="Consommation HP (kWh)" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                   <Area type="monotone" dataKey="consoHC" name="Consommation HC (kWh)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>

             <div className="mt-8">
               <h2 className="text-xl font-semibold mb-4">Périodes tarifaires</h2>
               <ResponsiveContainer width="100%" height={200}>
                 <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                   <XAxis 
                     dataKey="label" 
                     stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                     interval="preserveStartEnd"
                   />
                   <YAxis 
                     stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} 
                     domain={[0, 1]}
                     ticks={[0, 1]}
                     tickFormatter={(value) => value === 0 ? 'HC' : 'HP'}
                   />
                   <Tooltip
                     contentStyle={{
                       backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                       border: 'none',
                       borderRadius: '8px',
                       boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                     }}
                     formatter={(value) => value === 0 ? 'Heures Creuses (1)' : 'Heures Pleines (2)'}
                   />
                   <Legend />
                   <Line 
                     type="stepAfter" 
                     dataKey="periode" 
                     name="Période tarifaire" 
                     stroke="#8b5cf6" 
                     strokeWidth={2} 
                     dot={false}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>

             <div className="mt-8">
               <h2 className="text-xl font-semibold mb-4">Répartition HC/HP</h2>
               <ResponsiveContainer width="100%" height={300}>
                 <PieChart>
                   <Pie
                     data={[
                       { name: 'Heures Creuses', value: chartData.length > 0 ? chartData[chartData.length - 1].consoHC : 0 },
                       { name: 'Heures Pleines', value: chartData.length > 0 ? chartData[chartData.length - 1].consoHP : 0 }
                     ]}
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
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </>
         )}
      </div>

      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4">Statistiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-blue-800 dark:text-blue-200">Total points</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{historicalData.length || 0}</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-sm text-green-800 dark:text-green-200">Puissance moyenne</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {historicalData.length > 0 
                ? Math.round(historicalData.reduce((sum, d) => sum + d.papp, 0) / historicalData.length) + ' W' 
                : '0 W'}
            </div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-sm text-purple-800 dark:text-purple-200">Période historique</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {historicalData.length > 0 
                ? new Date(Math.min(...historicalData.map(d => new Date(d.timestamp).getTime()))).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) 
                : 'N/A'} 
              - 
              {historicalData.length > 0 
                ? new Date(Math.max(...historicalData.map(d => new Date(d.timestamp).getTime()))).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) 
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Historique;