// src/pages/Charts.jsx - With Weekday Performance
import React from 'react';
import NetWorthChart from '../components/NetWorthChart';
import DailyProfitChart from '../components/DailyProfitChart';
import WeekdayPerformanceChart from '../components/WeekdayPerformanceChart';
import { PageContainer, CardContainer, PageHeader } from '../components/layouts';

export default function Charts() {
  return (
    <PageContainer padding="compact">
      <CardContainer>
        <PageHeader 
          title="Performance Charts"
          description="Visual insights into your flipping progress and performance trends."
          icon="📈"
        />

        {/* Charts Grid */}
        <div className="space-y-6">
          <NetWorthChart />
          <DailyProfitChart />
          <WeekdayPerformanceChart />

          {/* Future charts placeholder */}
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">Charts dashboard complete! 🎉</p>
          </div>
        </div>
      </CardContainer>
    </PageContainer>
  );
}
