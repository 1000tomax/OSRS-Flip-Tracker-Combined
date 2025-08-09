// src/components/FlipTimeline.jsx
import React from 'react';

function formatGP(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function identifySessions(flips, gapMinutes = 15) {
  if (!flips || flips.length === 0) return [];

  const sorted = [...flips]
    .filter(flip => flip.closed_time)
    .sort((a, b) => new Date(a.closed_time) - new Date(b.closed_time));

  const sessions = [];
  let currentSession = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i].closed_time);
    const previous = new Date(sorted[i-1].closed_time);
    const gap = (current - previous) / 1000 / 60;

    if (gap > gapMinutes) {
      sessions.push(currentSession);
      currentSession = [sorted[i]];
    } else {
      currentSession.push(sorted[i]);
    }
  }
  sessions.push(currentSession);

  return sessions;
}

function getHourPosition(timeString) {
  const date = new Date(timeString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return ((hours * 60 + minutes) / (24 * 60)) * 100; // Percentage across 24 hours
}

export default function FlipTimeline({ flips, date }) {
  if (!flips || flips.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-2">📅 Trading Timeline</h3>
        <p className="text-gray-400 text-sm">No flips to display</p>
      </div>
    );
  }

  const sessions = identifySessions(flips);

  // Calculate session stats
  const sessionStats = sessions.map((session, index) => {
    const start = new Date(session[0].closed_time);
    const end = new Date(session[session.length - 1].closed_time);
    const duration = Math.round((end - start) / 1000 / 60);
    const profit = session.reduce((sum, flip) => sum + (flip.profit || 0), 0);
    const startPos = getHourPosition(session[0].closed_time);
    const endPos = getHourPosition(session[session.length - 1].closed_time);
    const width = Math.max(endPos - startPos, 2); // Minimum 2% width

    return {
      index,
      start,
      end,
      duration,
      profit,
      flips: session.length,
      startPos,
      width,
      efficiency: duration > 0 ? Math.round(profit / duration) : 0,
      session
    };
  });

  const totalProfit = flips.reduce((sum, flip) => sum + (flip.profit || 0), 0);
  const totalFlips = flips.length;

  // Create hour markers
  const hourMarkers = [];
  for (let hour = 0; hour < 24; hour += 3) {
    const position = (hour / 24) * 100;
    hourMarkers.push({ hour, position });
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">📅 Trading Timeline for {date}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-300">
          <span>🎯 {sessions.length} sessions</span>
          <span>📦 {totalFlips} flips</span>
          <span>💰 {formatGP(totalProfit)} GP total</span>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative bg-gray-900 rounded-lg p-4 min-h-[120px]">
        {/* Hour markers */}
        <div className="absolute top-0 left-0 right-0 h-6 flex">
          {hourMarkers.map(({ hour, position }) => (
            <div
              key={hour}
              className="absolute text-xs text-gray-500"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour-12}p`}
            </div>
          ))}
        </div>

        {/* Grid lines */}
        <div className="absolute top-6 bottom-0 left-0 right-0">
          {hourMarkers.map(({ hour, position }) => (
            <div
              key={hour}
              className="absolute top-0 bottom-0 w-px bg-gray-700"
              style={{ left: `${position}%` }}
            />
          ))}
        </div>

        {/* Session bars */}
        <div className="relative mt-8 space-y-2">
          {sessionStats.map((session) => (
            <div key={session.index} className="relative group">
              <div
                className="h-8 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded cursor-pointer hover:from-yellow-400 hover:to-yellow-300 transition-all duration-200 flex items-center justify-center text-black text-xs font-medium shadow-lg"
                style={{
                  left: `${session.startPos}%`,
                  width: `${session.width}%`,
                  position: 'absolute'
                }}
              >
                {session.width > 8 && (
                  <span>{session.flips} flips</span>
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute top-10 left-0 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-[200px]"
                   style={{ left: `${session.startPos}%` }}>
                <div className="text-white space-y-1">
                  <div className="font-semibold text-yellow-400">Session {session.index + 1}</div>
                  <div className="text-sm">
                    <div>⏰ {formatTime(session.start)} - {formatTime(session.end)}</div>
                    <div>⌚ Duration: {session.duration}m</div>
                    <div>📦 Flips: {session.flips}</div>
                    <div>💰 Profit: {formatGP(session.profit)} GP</div>
                    <div>⚡ Efficiency: {session.efficiency.toLocaleString()} GP/min</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Session summary below timeline */}
        <div className="mt-16 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {sessionStats.slice(0, 6).map((session) => (
              <div key={session.index} className="bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-yellow-400 font-medium">Session {session.index + 1}</span>
                  <span className="text-gray-300">{session.duration}m</span>
                </div>
                <div className="text-gray-300 text-xs space-y-1">
                  <div>🕐 {formatTime(session.start)}</div>
                  <div>📦 {session.flips} flips • 💰 {formatGP(session.profit)} GP</div>
                  <div>⚡ {session.efficiency.toLocaleString()} GP/min</div>
                </div>
              </div>
            ))}
          </div>

          {sessionStats.length > 6 && (
            <div className="mt-3 text-center text-gray-400 text-sm">
              +{sessionStats.length - 6} more sessions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}