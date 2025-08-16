import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAllFlips } from '../hooks/useAllFlips';
import LoadingSpinner from '../components/LoadingSpinner';

const formatGP = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

const formatTime = (minutes) => {
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${minutes.toFixed(0)}m`;
};

export default function ProfitVelocity() {
  const { data: allFlips, loading, error, totalDays } = useAllFlips();
  const [showDates, setShowDates] = React.useState(false); // false = show days (default)

  const velocityData = useMemo(() => {
    if (!allFlips?.length) return [];

    const flipsWithDuration = allFlips.map(flip => {
      try {
        // Check for missing required fields
        if (!flip.opened_time || !flip.closed_time || flip.profit === undefined) {
          return null;
        }
        
        const openTime = new Date(flip.opened_time);
        const closeTime = new Date(flip.closed_time);
        
        // Check for invalid dates
        if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
          return null;
        }
        
        const durationMinutes = (closeTime - openTime) / (1000 * 60);
        const profit = parseFloat(flip.profit);
        
        // Skip flips with invalid duration, but allow zero profit flips
        if (durationMinutes <= 0 || isNaN(profit)) {
          return null;
        }
        
        // Convert to Chicago timezone for consistent date grouping (matches data processing logic)
        const chicagoDate = new Date(openTime.toLocaleString("en-US", {timeZone: "America/Chicago"}));
        const dateString = `${String(chicagoDate.getMonth() + 1).padStart(2, '0')}-${String(chicagoDate.getDate()).padStart(2, '0')}-${chicagoDate.getFullYear()}`;
        
        return {
          ...flip,
          date: dateString,
          durationMinutes,
          profit
        };
      } catch (error) {
        console.warn('Error processing flip:', flip, error);
        return null;
      }
    }).filter(flip => flip);


    // Always aggregate by day for velocity analysis
    const dailyData = {};
    
    flipsWithDuration.forEach(flip => {
      if (!dailyData[flip.date]) {
        dailyData[flip.date] = {
          date: flip.date,
          totalProfit: 0,
          totalMinutes: 0,
          flipCount: 0,
          profitableFlips: 0,
          totalInvestment: 0
        };
      }
      
      dailyData[flip.date].totalProfit += flip.profit;
      dailyData[flip.date].totalMinutes += flip.durationMinutes;
      dailyData[flip.date].flipCount += 1;
      dailyData[flip.date].totalInvestment += parseFloat(flip.spent) || 0;
      if (flip.profit > 0) {
        dailyData[flip.date].profitableFlips += 1;
      }
    });


    // Get today's date in Chicago timezone for comparison
    const today = new Date();
    const todayChicago = new Date(today.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const todayString = `${String(todayChicago.getMonth() + 1).padStart(2, '0')}-${String(todayChicago.getDate()).padStart(2, '0')}-${todayChicago.getFullYear()}`;

    const sortedDays = Object.values(dailyData)
      .filter(day => day.date !== todayString) // Skip today's incomplete data
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return sortedDays.map((day, index) => {
      try {
        const date = new Date(day.date);
        const displayDate = isNaN(date.getTime()) ? day.date : date.toLocaleDateString();
        const dayNumber = index + 1;
        
        return {
          ...day,
          dayNumber,
          gpPerHour: day.totalMinutes > 0 ? (day.totalProfit / day.totalMinutes) * 60 : 0,
          avgFlipDuration: day.totalMinutes / day.flipCount,
          winRate: (day.profitableFlips / day.flipCount) * 100,
          avgInvestment: day.totalInvestment / day.flipCount,
          displayDate,
          displayLabel: showDates ? displayDate : `Day ${dayNumber}`
        };
      } catch (error) {
        console.warn('Error processing daily data:', day, error);
        return null;
      }
    }).filter(day => day);
  }, [allFlips, showDates]);

  const velocityStats = useMemo(() => {
    if (!velocityData.length) return {};

    const gpPerHourValues = velocityData.map(d => d.gpPerHour).filter(v => v > 0);
    const winRates = velocityData.map(d => d.winRate);
    
    return {
      avgGpPerHour: gpPerHourValues.reduce((a, b) => a + b, 0) / gpPerHourValues.length,
      maxGpPerHour: Math.max(...gpPerHourValues),
      avgWinRate: winRates.reduce((a, b) => a + b, 0) / winRates.length,
      totalActiveHours: velocityData.reduce((acc, d) => acc + d.totalMinutes, 0) / 60,
      bestDay: velocityData.find(d => d.gpPerHour === Math.max(...gpPerHourValues))
    };
  }, [velocityData]);

  if (loading) return <LoadingSpinner size="large" text={`Loading ${totalDays || 'all'} days of flip data...`} />;
  if (error) return <div className="text-red-400 p-4">Error loading flip data: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-lg mb-6">
          <h1 className="text-3xl font-bold text-center mb-2">Performance Analysis</h1>
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
            <p className="text-center text-gray-400 mb-4 sm:mb-0">
              Analyzing {velocityData.length} days of trading data ({allFlips.length} total flips)
            </p>
            
            {/* Day/Date Toggle */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-400">Display:</span>
              <button
                onClick={() => setShowDates(!showDates)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  !showDates 
                    ? 'bg-yellow-600 text-black' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Days
              </button>
              <button
                onClick={() => setShowDates(!showDates)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  showDates 
                    ? 'bg-yellow-600 text-black' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Dates
              </button>
            </div>
          </div>
          

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-1">Avg GP/Hour</h3>
              <p className="text-2xl font-bold text-green-400">{formatGP(velocityStats.avgGpPerHour || 0)}</p>
            </div>
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-1">Peak GP/Hour</h3>
              <p className="text-2xl font-bold text-blue-400">{formatGP(velocityStats.maxGpPerHour || 0)}</p>
            </div>
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-1">Avg Profitable %</h3>
              <p className="text-2xl font-bold text-yellow-400">{(velocityStats.avgWinRate || 0).toFixed(1)}%</p>
            </div>
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-1">Avg Offer Time</h3>
              <p className="text-2xl font-bold text-purple-400">{formatTime((velocityStats.totalActiveHours || 0) * 60 / 8)}</p>
              <p className="text-sm text-gray-400">Per slot</p>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Daily Profit Velocity</h2>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="displayLabel" 
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tickFormatter={formatGP}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name, props) => {
                    if (name === 'gpPerHour') {
                      const avgHours = (props.payload.totalMinutes / 60 / 8).toFixed(1);
                      return [`${formatGP(value)}/hr (~${avgHours}h avg offer time)`, 'GP/Hour']
                    }
                    return [
                      name === 'winRate' ? `${value.toFixed(1)}%` :
                      name === 'flipCount' ? value :
                      formatGP(value), 
                      name === 'winRate' ? 'Profitable %' :
                      name === 'flipCount' ? 'Flips' :
                      name
                    ]
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="gpPerHour" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Win Rate Trend */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">% of Profitable Trades</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="displayLabel" 
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    domain={['dataMin - 5', 100]}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Profitable Trades']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="winRate" 
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Flip Count */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Daily Flip Volume</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="displayLabel" 
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [value, 'Flips']}
                  />
                  <Bar 
                    dataKey="flipCount" 
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}