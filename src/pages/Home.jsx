// src/pages/Home.jsx - Updated with better background
import React from 'react';
import DailySummaryLog from '../components/DailySummaryLog';
import ItemLeaderboard from '../components/ItemLeaderboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
      <div className="flex flex-col xl:grid xl:grid-cols-[2fr_1fr] gap-6 items-start">
        {/* Main content - Daily Summary Log */}
        <div className="w-full">
          <DailySummaryLog />
        </div>
        
        {/* Sidebar - Item Leaderboard */}
        <div className="w-full">
          <ItemLeaderboard />
        </div>
      </div>
    </div>
  );
}