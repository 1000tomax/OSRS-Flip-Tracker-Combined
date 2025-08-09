// src/pages/FlipLogs.jsx - Clean Rewrite
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCsvData } from '../hooks/useCsvData';
import { useJsonData } from '../hooks/useJsonData';
import LoadingSpinner, { ErrorMessage } from '../components/LoadingSpinner';

function parseDateParts(dateStr) {
  const [month, day, year] = dateStr.split('-');
  return { month, day, year };
}

function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

function dateToInputValue(date) {
  if (!date) return "";
  const [mm, dd, yyyy] = date.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function formatGP(value) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  return value?.toLocaleString?.() ?? value;
}

function groupFlipsBySessions(flips, gapMinutes = 10) {
  if (!flips || flips.length === 0) return [];

  const sortedFlips = [...flips].sort((a, b) => new Date(a.closed_time) - new Date(b.closed_time));
  const sessions = [];
  let currentSession = null;

  for (const flip of sortedFlips) {
    const flipTime = new Date(flip.closed_time);

    if (!currentSession || (flipTime - currentSession.endTime) > gapMinutes * 60 * 1000) {
      // Start new session
      currentSession = {
        startTime: flipTime,
        endTime: flipTime,
        flips: [flip],
        totalProfit: Number(flip.profit) || 0,
        totalGP: Number(flip.received_post_tax) || 0
      };
      sessions.push(currentSession);
    } else {
      // Add to current session
      currentSession.flips.push(flip);
      currentSession.endTime = flipTime;
      currentSession.totalProfit += Number(flip.profit) || 0;
      currentSession.totalGP += Number(flip.received_post_tax) || 0;
    }
  }

  return sessions.map((session, index) => {
    const durationMs = session.endTime - session.startTime;
    const durationMinutes = Math.max(durationMs / 60000, 1); // Minimum 1 minute to avoid division by zero

    return {
      ...session,
      id: index + 1,
      duration: durationMs,
      gpPerMin: Math.round(session.totalProfit / durationMinutes)
    };
  });
}

export default function FlipLogs() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const date = queryParams.get('date');
  const [hoveredSession, setHoveredSession] = useState(null);

  const { data: summaryDates, loading: summaryLoading, error: summaryError } = useJsonData("/data/summary-index.json");

  const { month, day, year } = date ? parseDateParts(date) : {};
  const csvPath = date ? `/data/processed-flips/${year}/${month}/${day}/flips.csv` : null;
  const { data: flips, loading: flipsLoading, error: flipsError } = useCsvData(csvPath);

  const isLoading = summaryLoading || flipsLoading;
  const hasError = summaryError || flipsError;

  // Process flips data
  const validFlips = useMemo(() => {
    if (!flips || flips.length === 0) return [];
    return flips
      .filter(f => f.closed_quantity > 0 && f.received_post_tax > 0)
      .sort((a, b) => new Date(a.closed_time) - new Date(b.closed_time));
  }, [flips]);

  const sessions = useMemo(() => {
    return groupFlipsBySessions(validFlips);
  }, [validFlips]);

  const totalStats = useMemo(() => {
    return {
      flips: validFlips.length,
      profit: validFlips.reduce((sum, flip) => sum + (Number(flip.profit) || 0), 0),
      sessions: sessions.length
    };
  }, [validFlips, sessions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <LoadingSpinner size="large" text="Loading flip logs..." />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-lg">
          <ErrorMessage
            title="Failed to load flip logs"
            error={flipsError || summaryError}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white font-sans p-2 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3 sm:p-6 shadow-lg max-w-full overflow-hidden">

        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">📋 Flip Log Viewer</h1>

        {/* Date Picker */}
        {summaryDates && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <span className="text-sm text-gray-300 font-medium">Select date:</span>
            <div className="flex-1 sm:flex-none">
              <input
                type="date"
                className="w-full sm:w-auto bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
                value={dateToInputValue(date)}
                onChange={(e) => {
                  const [yyyy, mm, dd] = e.target.value.split("-");
                  const formatted = `${mm}-${dd}-${yyyy}`;
                  navigate(`/flip-logs?date=${formatted}`);
                }}
              />
            </div>
          </div>
        )}

        {/* No Date Selected */}
        {!date && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-400 text-lg">Please select a date to view flip logs</p>
          </div>
        )}

        {/* No Flips Found */}
        {date && validFlips.length === 0 && !isLoading && !hasError && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-400 text-lg">No flips found for {date}</p>
          </div>
        )}

        {/* Main Content - Show when we have flips */}
        {date && validFlips.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between border-b border-gray-700 pb-3 mb-3">
                <h2 className="text-xl font-bold text-white">📊 Trading Timeline for {date}</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{totalStats.sessions}</div>
                  <div className="text-sm text-gray-400">sessions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{totalStats.flips}</div>
                  <div className="text-sm text-gray-400">flips</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{formatGP(totalStats.profit)} GP</div>
                  <div className="text-sm text-gray-400">total</div>
                </div>
              </div>
            </div>

            {/* Timeline Visualization */}
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 mb-6 relative">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">Activity Timeline</h3>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>12a</span>
                  <span>3a</span>
                  <span>6a</span>
                  <span>9a</span>
                  <span>12p</span>
                  <span>3p</span>
                  <span>6p</span>
                  <span>9p</span>
                </div>
              </div>

              {/* Timeline Container - Hourly Activity Bars */}
              <div className="relative h-20 bg-gray-700 rounded-lg overflow-hidden p-2">
                {(() => {
                  // Create hourly buckets (0-23)
                  const hourlyData = Array(24).fill(0);

                  // Count all flips by hour (not sessions)
                  validFlips.forEach(flip => {
                    const hour = new Date(flip.closed_time).getHours();
                    hourlyData[hour]++;
                  });

                  // Find peak hour for percentage calculation
                  const maxHourlyFlips = Math.max(...hourlyData);

                  // Generate gradient style based on exact percentage
                  const getGradientStyle = (count) => {
                    if (count === 0) return { backgroundColor: '#4b5563' }; // Gray for no activity

                    const percentage = (count / maxHourlyFlips) * 100;

                    // Create gradient from light to dark green based on percentage
                    const lightness = Math.max(20, 90 - (percentage * 0.7)); // 90% to 20% lightness
                    const saturation = Math.min(100, 40 + (percentage * 0.6)); // 40% to 100% saturation

                    return {
                      background: `linear-gradient(to top, hsl(142, ${saturation}%, ${lightness - 10}%), hsl(142, ${saturation}%, ${lightness}%))`
                    };
                  };

                  return (
                    <div className="grid grid-cols-24 gap-1 h-full">
                      {hourlyData.map((count, hour) => {
                        const percentage = maxHourlyFlips > 0 ? (count / maxHourlyFlips) * 100 : 0;

                        return (
                          <div
                            key={hour}
                            className="rounded cursor-pointer transition-all duration-200 hover:scale-105 flex items-end justify-center relative"
                            style={getGradientStyle(count)}
                            onMouseEnter={() => setHoveredSession({
                              id: hour,
                              startTime: new Date().setHours(hour, 0, 0, 0),
                              flips: { length: count },
                              totalProfit: 0, // We don't calculate profit by hour yet
                              gpPerMin: 0,
                              duration: 3600000, // 1 hour in ms
                              hour: hour,
                              percentage: Math.round(percentage)
                            })}
                            onMouseLeave={() => setHoveredSession(null)}
                          >
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Hover Tooltip - Updated for hourly data */}
              {hoveredSession && (
                <div
                  className="absolute bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl z-50 min-w-80"
                  style={{
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px'
                  }}
                >
                  <div className="text-white space-y-3">
                    <div className="border-b border-gray-600 pb-2">
                      <h4 className="font-semibold text-green-400">
                        {hoveredSession.hour !== undefined ?
                          `${hoveredSession.hour === 0 ? '12' : hoveredSession.hour > 12 ? hoveredSession.hour - 12 : hoveredSession.hour}${hoveredSession.hour < 12 ? 'am' : 'pm'}` :
                          `Session ${hoveredSession.id}`
                        }
                      </h4>
                      <p className="text-sm text-gray-300">
                        {hoveredSession.hour !== undefined ?
                          `Hour ${hoveredSession.hour}:00 - ${hoveredSession.hour}:59` :
                          `${hoveredSession.startTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })} - ${hoveredSession.endTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}`
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">🔄 Flips:</span>
                        <span className="text-white font-medium ml-2">{hoveredSession.flips.length}</span>
                      </div>
                      {hoveredSession.percentage !== undefined && (
                        <div>
                          <span className="text-gray-400">📊 Activity:</span>
                          <span className="text-green-400 font-medium ml-2">{hoveredSession.percentage}%</span>
                        </div>
                      )}
                      {hoveredSession.duration && hoveredSession.hour === undefined && (
                        <>
                          <div>
                            <span className="text-gray-400">⏱️ Duration:</span>
                            <span className="text-white font-medium ml-2">{formatDuration(hoveredSession.duration)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">💰 Profit:</span>
                            <span className="text-green-400 font-medium ml-2">{formatGP(hoveredSession.totalProfit)} GP</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tooltip Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                </div>
              )}

              {/* Individual Flips List - Right under timeline */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-white mb-3">Individual Flips ({validFlips.length})</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {validFlips.map((flip, i) => {
                    const profit = Number(flip.profit) || 0;
                    const isProfit = profit >= 0;

                    return (
                      <div key={i} className="bg-gray-700 rounded-lg p-3 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white truncate">{flip.item_name}</span>
                          <span className={`font-mono ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}{formatGP(profit)} GP
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                          <div>
                            <span>Closed: {new Date(flip.closed_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <div>
                            <span>Qty: {flip.closed_quantity}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 mt-1">
                          <div>
                            <span>Spent: {formatGP(Number(flip.spent) || 0)} GP</span>
                          </div>
                          <div>
                            <span>Received: {formatGP(Number(flip.received_post_tax) || 0)} GP</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Remove the separate individual flips section since it's now under timeline */}
          </>
        )}
      </div>
    </div>
  );
}