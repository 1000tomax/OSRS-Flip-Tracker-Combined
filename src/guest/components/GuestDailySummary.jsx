import React, { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas-pro';
import { formatGP } from '../../utils';

// Helper function to group summaries into time periods
function groupSummariesByPeriod(summaries, mode) {
  if (mode === 'daily') return summaries;

  if (mode === 'weekly') {
    const weeks = [];
    const remainingDays = [];

    // Group complete weeks (7 days each)
    for (let i = 0; i < Math.floor(summaries.length / 7); i++) {
      const weekStart = i * 7;
      const weekEnd = weekStart + 7;
      const weekDays = summaries.slice(weekStart, weekEnd);

      // Calculate weekly aggregates
      const weekData = {
        weekNumber: i + 1,
        startDate: weekDays[0].date,
        endDate: weekDays[6].date,
        days: weekDays,
        totalFlips: weekDays.reduce((sum, day) => sum + (day.flipCount || 0), 0),
        totalItems: weekDays.reduce((sum, day) => sum + (day.uniqueItems || 0), 0),
        totalProfit: weekDays.reduce((sum, day) => sum + (day.totalProfit || 0), 0),
        avgDailyProfit: 0,
      };

      weekData.avgDailyProfit = weekData.totalProfit / 7;
      weeks.push(weekData);
    }

    // Get remaining days (incomplete week)
    const remainingStart = Math.floor(summaries.length / 7) * 7;
    if (remainingStart < summaries.length) {
      remainingDays.push(...summaries.slice(remainingStart));
    }

    return { weeks, remainingDays };
  }

  if (mode === 'monthly') {
    const monthsMap = new Map();

    summaries.forEach(day => {
      // Parse date assuming MM-DD format
      const [month] = day.date.split('-');
      const monthKey = month;

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          month: monthKey,
          days: [],
          totalFlips: 0,
          totalItems: 0,
          totalProfit: 0,
        });
      }

      const monthData = monthsMap.get(monthKey);
      monthData.days.push(day);
      monthData.totalFlips += day.flipCount || 0;
      monthData.totalItems += day.uniqueItems || 0;
      monthData.totalProfit += day.totalProfit || 0;
    });

    return Array.from(monthsMap.values()).map(month => ({
      ...month,
      avgDailyProfit: month.totalProfit / month.days.length,
      startDate: month.days[0].date,
      endDate: month.days[month.days.length - 1].date,
    }));
  }

  return summaries;
}

export default function GuestDailySummary({ guestData, onDateSelect }) {
  const [showDateMode, setShowDateMode] = useState(true); // true = dates, false = day numbers
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [screenshotMode, setScreenshotMode] = useState('weekly'); // Mode for screenshots
  const PAGE_SIZE = 7;
  const screenshotRef = useRef(null);

  const summaries = useMemo(() => guestData?.dailySummaries || [], [guestData?.dailySummaries]);
  const reversedSummaries = useMemo(() => [...summaries].reverse(), [summaries]);
  const pagedSummaries = reversedSummaries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(summaries.length / PAGE_SIZE);

  // Calculate running totals and statistics
  const stats = useMemo(() => {
    if (!summaries.length) return null;

    let runningTotal = 0;
    let bestDay = { profit: -Infinity, date: null };
    let worstDay = { profit: Infinity, date: null };
    let totalFlips = 0;
    const totalItems = new Set();

    summaries.forEach(day => {
      runningTotal += day.totalProfit || 0;
      totalFlips += day.flipCount || 0;

      if (day.totalProfit > bestDay.profit) {
        bestDay = { profit: day.totalProfit, date: day.date };
      }
      if (day.totalProfit < worstDay.profit) {
        worstDay = { profit: day.totalProfit, date: day.date };
      }

      // Track unique items across all days
      if (day.uniqueItems) {
        // This is a simplified count - in reality we'd need item IDs
        totalItems.add(day.date); // Using date as proxy for unique tracking
      }
    });

    return {
      totalProfit: runningTotal,
      totalFlips,
      avgDailyProfit: runningTotal / summaries.length,
      bestDay,
      worstDay,
      tradingDays: summaries.length,
    };
  }, [summaries]);

  // Generate screenshot with compression
  const generateScreenshot = async () => {
    if (screenshotRef.current && summaries.length > 0) {
      try {
        // Calculate dynamic height based on content
        let estimatedHeight = 200; // Base height for header and padding
        let willBeTruncated = false;

        const ROW_HEIGHT = 50;
        const WEEK_HEIGHT = 60;
        const MAX_DAILY_ROWS = 40;
        const MAX_WEEKLY_ROWS = 35;
        const MAX_MONTHLY_ROWS = 35;

        if (screenshotMode === 'daily') {
          estimatedHeight += summaries.length * ROW_HEIGHT;
          willBeTruncated = summaries.length > MAX_DAILY_ROWS;
        } else if (screenshotMode === 'weekly') {
          const weekCount = Math.floor(summaries.length / 7);
          const remainingDays = summaries.length % 7;
          estimatedHeight +=
            weekCount * WEEK_HEIGHT + (remainingDays > 0 ? remainingDays * ROW_HEIGHT : 0);
          willBeTruncated = weekCount > MAX_WEEKLY_ROWS;
        } else if (screenshotMode === 'monthly') {
          const monthsSet = new Set(summaries.map(s => s.date.split('-')[0]));
          estimatedHeight += monthsSet.size * WEEK_HEIGHT;
          willBeTruncated = monthsSet.size > MAX_MONTHLY_ROWS;
        }

        // Warn user if content will be truncated
        if (willBeTruncated) {
          // eslint-disable-next-line no-alert
          const proceed = window.confirm(
            `⚠️ Screenshot Warning\n\n` +
              `Your data has too many ${screenshotMode === 'daily' ? 'days' : screenshotMode === 'weekly' ? 'weeks' : 'months'} to fit in a single screenshot.\n\n` +
              `The screenshot will be truncated to prevent memory issues.\n\n` +
              `Tip: Try using ${screenshotMode === 'daily' ? 'Weekly or Monthly' : 'Monthly'} compression mode for better results.\n\n` +
              `Continue anyway?`
          );

          if (!proceed) {
            return;
          }
        }

        // Cap at a reasonable maximum to prevent memory issues
        const MAX_HEIGHT = 2400;
        const finalHeight = Math.min(estimatedHeight, MAX_HEIGHT);

        const canvas = await html2canvas(screenshotRef.current, {
          backgroundColor: '#1f2937',
          scale: 2,
          width: 900,
          height: finalHeight,
          logging: false,
          useCORS: true,
          allowTaint: true,
        });

        const link = document.createElement('a');
        const dateRange = `${summaries[0].date}-to-${summaries[summaries.length - 1].date}`;
        link.download = `flip-summary-${screenshotMode}-${dateRange}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Screenshot generation failed:', error);
        // eslint-disable-next-line no-alert
        alert('Failed to generate screenshot. Please try again.');
      }
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white">📊 Trading Summary</h2>
        <p className="text-sm sm:text-base text-gray-300">
          Detailed breakdown of your flipping performance over {summaries.length} trading days
        </p>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Total Profit</div>
            <div className="text-lg font-bold text-green-400">{formatGP(stats.totalProfit)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Avg Daily</div>
            <div className="text-lg font-bold text-white">{formatGP(stats.avgDailyProfit)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Best Day</div>
            <div className="text-lg font-bold text-green-400">{formatGP(stats.bestDay.profit)}</div>
            <div className="text-xs text-gray-500">{stats.bestDay.date}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Worst Day</div>
            <div className="text-lg font-bold text-red-400">{formatGP(stats.worstDay.profit)}</div>
            <div className="text-xs text-gray-500">{stats.worstDay.date}</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* View Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">View:</span>
            <div className="flex rounded-lg bg-gray-700 p-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-2 py-1 text-xs font-medium rounded transition ${
                  viewMode === 'daily' ? 'bg-blue-600 text-white' : 'text-gray-300'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-2 py-1 text-xs font-medium rounded transition ${
                  viewMode === 'weekly' ? 'bg-blue-600 text-white' : 'text-gray-300'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-2 py-1 text-xs font-medium rounded transition ${
                  viewMode === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-300'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Date/Day Toggle */}
          <button
            onClick={() => setShowDateMode(!showDateMode)}
            className="px-2 py-1 text-xs font-medium rounded-md transition bg-gray-700 hover:bg-gray-600 text-gray-300"
          >
            {showDateMode ? '📅 Show Days' : '📊 Show Dates'}
          </button>

          {/* Pagination */}
          {viewMode === 'daily' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                disabled={page === 0}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  page === 0
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-black'
                }`}
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-300 px-2 font-mono">
                {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={page >= totalPages - 1}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  page >= totalPages - 1
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-black'
                }`}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Screenshot Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            value={screenshotMode}
            onChange={e => setScreenshotMode(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600"
          >
            <option value="daily">Screenshot: Daily</option>
            <option value="weekly">Screenshot: Weekly</option>
            <option value="monthly">Screenshot: Monthly</option>
          </select>
          <button
            onClick={generateScreenshot}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
          >
            📸 Capture
          </button>
        </div>
      </div>

      {/* Display Based on View Mode */}
      {viewMode === 'daily' ? (
        <div className="flex flex-col gap-3">
          {pagedSummaries.map((s, index) => {
            const dayNumber = summaries.length - (page * PAGE_SIZE + index);

            return (
              <div
                key={s?.date || `day-${dayNumber}`}
                className="bg-gray-800 border border-gray-600 rounded-xl shadow p-4 hover:ring-2 hover:ring-yellow-500 transition duration-150"
              >
                {/* Header: Day/Date + View Flips Button */}
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-base text-white">
                    {showDateMode ? s?.date || 'Unknown' : `Day ${dayNumber}`}
                  </div>
                  {onDateSelect && (
                    <button
                      onClick={() => onDateSelect(s?.date)}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white transition"
                    >
                      View Flips
                    </button>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-400">📦 Flips</span>
                    <span className="text-white">{s?.flipCount || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400">📋 Items</span>
                    <span className="text-white">{s?.uniqueItems || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400">💰 Profit</span>
                    <span
                      className={`${(s?.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {formatGP(s?.totalProfit || 0)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400">📈 Avg/Flip</span>
                    <span className="text-white">
                      {formatGP(s?.flipCount > 0 ? s?.totalProfit / s?.flipCount : 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'weekly' ? (
        <div className="flex flex-col gap-3">
          {(() => {
            const { weeks, remainingDays } = groupSummariesByPeriod(summaries, 'weekly');
            return (
              <>
                {weeks.map(week => (
                  <div
                    key={`week-${week.weekNumber}`}
                    className="bg-gray-800 border border-gray-600 rounded-xl shadow p-4"
                  >
                    <div className="font-bold text-base text-white mb-2">
                      Week {week.weekNumber} ({week.startDate} to {week.endDate})
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-400">📦 Total Flips</span>
                        <span className="text-white">{week.totalFlips}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400">💰 Total Profit</span>
                        <span className={week.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatGP(week.totalProfit)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400">📊 Daily Avg</span>
                        <span className="text-white">{formatGP(week.avgDailyProfit)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400">📋 Unique Items</span>
                        <span className="text-white">{week.totalItems}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {remainingDays.length > 0 && (
                  <div className="bg-gray-800/50 border border-gray-600 border-dashed rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-2">
                      Incomplete Week ({remainingDays.length} days)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {remainingDays.map(day => (
                        <span key={day.date} className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {day.date}: {formatGP(day.totalProfit)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groupSummariesByPeriod(summaries, 'monthly').map(month => (
            <div
              key={`month-${month.month}`}
              className="bg-gray-800 border border-gray-600 rounded-xl shadow p-4"
            >
              <div className="font-bold text-base text-white mb-2">
                Month {month.month} ({month.days.length} days)
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-400">📦 Total Flips</span>
                  <span className="text-white">{month.totalFlips}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">💰 Total Profit</span>
                  <span className={month.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatGP(month.totalProfit)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">📊 Daily Avg</span>
                  <span className="text-white">{formatGP(month.avgDailyProfit)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">📋 Unique Items</span>
                  <span className="text-white">{month.totalItems}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Screenshot Content */}
      <div
        ref={screenshotRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          width: '900px',
          backgroundColor: '#1f2937',
          color: '#ffffff',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid #4b5563',
            paddingBottom: '16px',
          }}
        >
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#fbbf24',
              margin: '0 0 8px 0',
            }}
          >
            📊 OSRS Flip Trading Summary
          </h1>
          <p
            style={{
              color: '#d1d5db',
              margin: '0 0 4px 0',
              fontSize: '14px',
            }}
          >
            {summaries.length} Trading Days • Total Profit: {formatGP(stats?.totalProfit || 0)} •{' '}
            Average Daily: {formatGP(stats?.avgDailyProfit || 0)}
          </p>
          <p
            style={{
              color: '#60a5fa',
              margin: '8px 0 0 0',
              fontSize: '16px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
            }}
          >
            🌐 MREEDON.COM/GUEST
          </p>
        </div>

        {/* Table based on screenshot mode */}
        <table
          style={{
            width: '100%',
            fontSize: '13px',
            borderCollapse: 'collapse',
            border: '2px solid #000000',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#374151',
                borderTop: '2px solid #000000',
                borderBottom: '2px solid #000000',
              }}
            >
              <th
                style={{
                  padding: '8px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderLeft: '2px solid #000000',
                }}
              >
                Period
              </th>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Flips</th>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Items</th>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Profit</th>
              <th
                style={{
                  padding: '8px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderRight: '2px solid #000000',
                }}
              >
                Avg/Day
              </th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              if (screenshotMode === 'weekly') {
                const { weeks, remainingDays } = groupSummariesByPeriod(summaries, 'weekly');
                let rowIndex = 0;

                return (
                  <>
                    {weeks.map(week => {
                      const currentRowIndex = rowIndex++;
                      return (
                        <tr
                          key={`week-${week.weekNumber}`}
                          style={{
                            backgroundColor: currentRowIndex % 2 === 0 ? '#1f2937' : '#374151',
                            borderBottom: '1px solid #000000',
                            fontWeight: 'bold',
                          }}
                        >
                          <td
                            style={{
                              padding: '6px 8px',
                              borderLeft: '2px solid #000000',
                              color: '#fbbf24',
                            }}
                          >
                            Week {week.weekNumber}
                          </td>
                          <td style={{ padding: '6px 8px' }}>{week.totalFlips}</td>
                          <td style={{ padding: '6px 8px' }}>{week.totalItems}</td>
                          <td
                            style={{
                              padding: '6px 8px',
                              color: week.totalProfit >= 0 ? '#10b981' : '#ef4444',
                            }}
                          >
                            {formatGP(week.totalProfit)}
                          </td>
                          <td style={{ padding: '6px 8px', borderRight: '2px solid #000000' }}>
                            {formatGP(week.avgDailyProfit)}
                          </td>
                        </tr>
                      );
                    })}
                    {remainingDays.map(s => {
                      const currentRowIndex = rowIndex++;
                      return (
                        <tr
                          key={s.date}
                          style={{
                            backgroundColor: currentRowIndex % 2 === 0 ? '#1f2937' : '#374151',
                            borderBottom: '1px solid #000000',
                          }}
                        >
                          <td style={{ padding: '6px 8px', borderLeft: '2px solid #000000' }}>
                            {s.date}
                          </td>
                          <td style={{ padding: '6px 8px' }}>{s.flipCount || 0}</td>
                          <td style={{ padding: '6px 8px' }}>{s.uniqueItems || 0}</td>
                          <td
                            style={{
                              padding: '6px 8px',
                              color: (s.totalProfit || 0) >= 0 ? '#10b981' : '#ef4444',
                            }}
                          >
                            {formatGP(s.totalProfit || 0)}
                          </td>
                          <td style={{ padding: '6px 8px', borderRight: '2px solid #000000' }}>
                            {formatGP(s.totalProfit || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              } else if (screenshotMode === 'monthly') {
                const months = groupSummariesByPeriod(summaries, 'monthly');
                return months.map((month, monthIdx) => (
                  <tr
                    key={`month-${month.month}`}
                    style={{
                      backgroundColor: monthIdx % 2 === 0 ? '#1f2937' : '#374151',
                      borderBottom: '1px solid #000000',
                      fontWeight: 'bold',
                    }}
                  >
                    <td
                      style={{
                        padding: '6px 8px',
                        borderLeft: '2px solid #000000',
                        color: '#fbbf24',
                      }}
                    >
                      Month {month.month} ({month.days.length} days)
                    </td>
                    <td style={{ padding: '6px 8px' }}>{month.totalFlips}</td>
                    <td style={{ padding: '6px 8px' }}>{month.totalItems}</td>
                    <td
                      style={{
                        padding: '6px 8px',
                        color: month.totalProfit >= 0 ? '#10b981' : '#ef4444',
                      }}
                    >
                      {formatGP(month.totalProfit)}
                    </td>
                    <td style={{ padding: '6px 8px', borderRight: '2px solid #000000' }}>
                      {formatGP(month.avgDailyProfit)}
                    </td>
                  </tr>
                ));
              } else {
                // Daily view
                return summaries.map((s, dayIdx) => (
                  <tr
                    key={s.date}
                    style={{
                      backgroundColor: dayIdx % 2 === 0 ? '#1f2937' : '#374151',
                      borderBottom: '1px solid #000000',
                    }}
                  >
                    <td style={{ padding: '6px 8px', borderLeft: '2px solid #000000' }}>
                      {s.date}
                    </td>
                    <td style={{ padding: '6px 8px' }}>{s.flipCount || 0}</td>
                    <td style={{ padding: '6px 8px' }}>{s.uniqueItems || 0}</td>
                    <td
                      style={{
                        padding: '6px 8px',
                        color: (s.totalProfit || 0) >= 0 ? '#10b981' : '#ef4444',
                      }}
                    >
                      {formatGP(s.totalProfit || 0)}
                    </td>
                    <td style={{ padding: '6px 8px', borderRight: '2px solid #000000' }}>
                      {formatGP(s.totalProfit || 0)}
                    </td>
                  </tr>
                ));
              }
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
