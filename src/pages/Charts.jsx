// src/pages/Charts.jsx - With Both Charts
import React from 'react';
import NetWorthChart from '../components/NetWorthChart';
import DailyProfitChart from '../components/DailyProfitChart';

export default function Charts() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-2 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3 sm:p-6 shadow-lg max-w-full overflow-hidden">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">📈 Performance Charts</h1>
          <p className="text-gray-300 text-sm sm:text-base">
            Visual insights into your flipping progress and performance trends.
          </p>
        </div>

        {/* Charts Grid */}
        <div className="space-y-6">
          <NetWorthChart />
          <DailyProfitChart />
          
          {/* Future charts placeholder */}
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">More charts coming soon: Top Items, ROI Analysis, Weekday Performance...</p>
          </div>
        </div>

      </div>
    </div>
  );
}