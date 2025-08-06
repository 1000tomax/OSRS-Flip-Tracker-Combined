// src/pages/Home.jsx
import React from 'react';
import DailySummaryLog from '../components/DailySummaryLog';
import ItemLeaderboard from '../components/ItemLeaderboard';

export default function Home() {
  return (
    <div className="bg-white dark:bg-black text-gray-900 dark:text-white min-h-screen font-sans p-4">
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 items-start">
        <DailySummaryLog />
        <ItemLeaderboard />
      </div>
    </div>
  );
}
