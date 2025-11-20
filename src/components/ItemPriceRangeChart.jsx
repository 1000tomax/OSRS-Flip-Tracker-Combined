import React, { useMemo, useState } from 'react';
import { formatGP } from '../utils/formatUtils';
import PropTypes from 'prop-types';

function computeQuartiles(values) {
  const xs = values
    .filter(v => Number.isFinite(v))
    .slice()
    .sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const q = p => {
    const idx = (xs.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return xs[lo];
    const w = idx - lo;
    return xs[lo] * (1 - w) + xs[hi] * w;
  };
  const min = xs[0];
  const max = xs[xs.length - 1];
  const q1 = q(0.25);
  const med = q(0.5);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  return { min, q1, median: med, q3, max, iqr, count: xs.length };
}

// Row component moved outside to prevent recreation on each render
function Row({ label, s, y, scaleX }) {
  if (!s) return null;
  const xMin = scaleX(s.min);
  const xQ1 = scaleX(s.q1);
  const xMed = scaleX(s.median);
  const xQ3 = scaleX(s.q3);
  const xMax = scaleX(s.max);
  return (
    <g>
      {/* whiskers */}
      <line x1={xMin} y1={y} x2={xQ1} y2={y} stroke="#9CA3AF" strokeWidth="2" />
      <line x1={xQ3} y1={y} x2={xMax} y2={y} stroke="#9CA3AF" strokeWidth="2" />
      {/* box */}
      <rect
        x={xQ1}
        y={y - 10}
        width={Math.max(2, xQ3 - xQ1)}
        height={20}
        fill="#374151"
        stroke="#60a5fa"
      />
      {/* median */}
      <line x1={xMed} y1={y - 12} x2={xMed} y2={y + 12} stroke="#60a5fa" strokeWidth="2" />
      {/* label */}
      <text x={20} y={y - 16} fill="#E5E7EB" fontSize="12">
        {label} (n={s.count})
      </text>
    </g>
  );
}

export default function ItemPriceRangeChart({ buyPrices = [], sellPrices = [] }) {
  const [showInfo, setShowInfo] = useState(false);
  const stats = useMemo(
    () => ({
      buy: computeQuartiles(buyPrices),
      sell: computeQuartiles(sellPrices),
    }),
    [buyPrices, sellPrices]
  );

  if (!stats.buy && !stats.sell) {
    return <div className="bg-gray-800 p-4 rounded text-gray-300">No price data available</div>;
  }

  // Determine unified scale
  const values = [];
  if (stats.buy) values.push(stats.buy.min, stats.buy.max);
  if (stats.sell) values.push(stats.sell.min, stats.sell.max);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);

  const width = 320;
  const height = 120;
  const pad = 20;

  const scaleX = v => {
    if (vMax === vMin) return pad + (width - 2 * pad) / 2;
    return pad + ((v - vMin) / (vMax - vMin)) * (width - 2 * pad);
  };

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => vMin + ((vMax - vMin) * i) / ticks);

  return (
    <div className="bg-gray-800 p-4 rounded">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm text-gray-200">Price Quartiles</div>
        <button
          type="button"
          onClick={() => setShowInfo(v => !v)}
          aria-expanded={showInfo}
          className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
        >
          {showInfo ? 'Hide explainer' : 'How to read this?'}
        </button>
      </div>
      {showInfo && (
        <div className="mb-3 text-xs text-gray-300 bg-gray-700/50 border border-gray-600 rounded p-3">
          <p className="mb-2">This box plot summarizes the prices you actually traded at:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Box = middle 50% of prices (from Q1 to Q3). Line inside the box = median.</li>
            <li>Whiskers stretch to the minimum and maximum observed prices.</li>
            <li>Narrow box = consistent prices. Wide box = volatile prices.</li>
            <li>More separation between Buy and Sell boxes suggests a larger typical margin.</li>
          </ul>
          {(stats.buy || stats.sell) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-200">
              {stats.buy && (
                <div className="bg-gray-800/60 rounded p-2">
                  <div className="font-semibold text-xs mb-1">Buy quartiles</div>
                  <div className="grid grid-cols-5 gap-1 text-[11px]">
                    <div>
                      <span className="text-gray-400">Min</span>
                      <br />
                      {formatGP(stats.buy.min)}
                    </div>
                    <div>
                      <span className="text-gray-400">Q1</span>
                      <br />
                      {formatGP(stats.buy.q1)}
                    </div>
                    <div>
                      <span className="text-gray-400">Med</span>
                      <br />
                      {formatGP(stats.buy.median)}
                    </div>
                    <div>
                      <span className="text-gray-400">Q3</span>
                      <br />
                      {formatGP(stats.buy.q3)}
                    </div>
                    <div>
                      <span className="text-gray-400">Max</span>
                      <br />
                      {formatGP(stats.buy.max)}
                    </div>
                  </div>
                </div>
              )}
              {stats.sell && (
                <div className="bg-gray-800/60 rounded p-2">
                  <div className="font-semibold text-xs mb-1">Sell quartiles</div>
                  <div className="grid grid-cols-5 gap-1 text-[11px]">
                    <div>
                      <span className="text-gray-400">Min</span>
                      <br />
                      {formatGP(stats.sell.min)}
                    </div>
                    <div>
                      <span className="text-gray-400">Q1</span>
                      <br />
                      {formatGP(stats.sell.q1)}
                    </div>
                    <div>
                      <span className="text-gray-400">Med</span>
                      <br />
                      {formatGP(stats.sell.median)}
                    </div>
                    <div>
                      <span className="text-gray-400">Q3</span>
                      <br />
                      {formatGP(stats.sell.q3)}
                    </div>
                    <div>
                      <span className="text-gray-400">Max</span>
                      <br />
                      {formatGP(stats.sell.max)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <svg width={width} height={height} role="img" aria-label="Price quartiles box plot">
        {/* axis */}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#4B5563" />
        {tickVals.map((t, idx) => (
          <g key={idx}>
            <line
              x1={scaleX(t)}
              y1={height - pad}
              x2={scaleX(t)}
              y2={height - pad + 4}
              stroke="#4B5563"
            />
            <text
              x={scaleX(t)}
              y={height - pad + 14}
              fill="#9CA3AF"
              fontSize="10"
              textAnchor="middle"
            >
              {Math.round(t).toLocaleString()} gp
            </text>
          </g>
        ))}
        <Row label="Buy" s={stats.buy} y={40} scaleX={scaleX} />
        <Row label="Sell" s={stats.sell} y={85} scaleX={scaleX} />
      </svg>
    </div>
  );
}

ItemPriceRangeChart.propTypes = {
  buyPrices: PropTypes.arrayOf(PropTypes.number),
  sellPrices: PropTypes.arrayOf(PropTypes.number),
};
