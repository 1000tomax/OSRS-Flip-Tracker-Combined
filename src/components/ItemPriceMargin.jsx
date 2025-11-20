import React, { useMemo, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import ChartFullscreenModal from './ChartFullscreenModal';

// Format numbers as GP
function formatGP(n) {
  const v = Math.round(Number(n) || 0);
  return `${v.toLocaleString()} gp`;
}

function stddev(values) {
  const xs = values.filter(v => Number.isFinite(v));
  const n = xs.length;
  if (n < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1);
  return Math.sqrt(variance);
}

function ScatterDot(props) {
  const { cx, cy, payload } = props;
  const color = (payload.marginPct || 0) >= 0 ? '#10b981' : '#ef4444';
  // Fixed radius (no volume-based scaling)
  const r = 3;
  return <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.7} />;
}

export default function ItemPriceMargin({ flips = [] }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const containerRefFs = useRef(null);
  // no scale capture; rely on activeLabel (x) and activePayload (y)
  const base = useMemo(() => {
    const pts = [];
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let successCount = 0;
    for (const f of flips || []) {
      const tsMs = Number(
        f.tsMs ||
          f.ts ||
          (f.lastSellTime
            ? Date.parse(f.lastSellTime)
            : f.last_sell_time
              ? Date.parse(f.last_sell_time)
              : undefined)
      );
      if (!Number.isFinite(tsMs)) continue;
      const buy = Number(f.avgBuyPrice ?? f.buyPrice);
      const sell = Number(f.avgSellPrice ?? f.sellPrice);
      const profit = Number(f.profit);
      const quantity = Number(f.quantity ?? f.bought ?? f.sold ?? 1) || 1;
      const marginPct =
        Number.isFinite(buy) && buy > 0 && Number.isFinite(sell)
          ? ((sell - buy) / buy) * 100
          : Number(f.marginPct);
      if (!Number.isFinite(marginPct)) continue;
      pts.push({
        tsMs,
        marginPct,
        profit: Number.isFinite(profit)
          ? profit
          : Number.isFinite(buy) && Number.isFinite(sell)
            ? (sell - buy) * quantity
            : 0,
        quantity,
      });
      if (tsMs < minX) minX = tsMs;
      if (tsMs > maxX) maxX = tsMs;
      if (marginPct < minY) minY = marginPct;
      if (marginPct > maxY) maxY = marginPct;
      if (marginPct >= 0) successCount += 1;
    }
    if (!isFinite(minX)) {
      minX = 0;
      maxX = 1;
    }
    if (!isFinite(minY)) {
      minY = -1;
      maxY = 1;
    }
    const pad = Math.max(1, (maxY - minY) * 0.1);
    return {
      points: pts.sort((a, b) => a.tsMs - b.tsMs),
      xMin: minX,
      xMax: maxX,
      yMin: minY - pad,
      yMax: maxY + pad,
      success: successCount,
      total: pts.length,
    };
  }, [flips]);

  // Zoom state and selection
  const [xDomain, setXDomain] = useState([base.xMin, base.xMax]);
  const [yDomain, setYDomain] = useState([base.yMin, base.yMax]);
  const [focus, setFocus] = useState(null); // { points, xDomain:[min,max], yDomain:[min,max] }
  const [refLeft, setRefLeft] = useState(null);
  const [refRight, setRefRight] = useState(null);
  const [refTop, setRefTop] = useState(null);
  const [refBottom, setRefBottom] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Track last base values to avoid unnecessary updates
  const lastBaseRef = useRef({
    xMin: base.xMin,
    xMax: base.xMax,
    yMin: base.yMin,
    yMax: base.yMax,
  });

  // Keep domains in sync if base changes (new item/data)
  useEffect(() => {
    // Check if base has actually changed
    const hasChanged =
      lastBaseRef.current.xMin !== base.xMin ||
      lastBaseRef.current.xMax !== base.xMax ||
      lastBaseRef.current.yMin !== base.yMin ||
      lastBaseRef.current.yMax !== base.yMax;

    if (!hasChanged) return;

    // Update ref and state - this is intentional synchronization of zoom state when data changes
    lastBaseRef.current = { xMin: base.xMin, xMax: base.xMax, yMin: base.yMin, yMax: base.yMax };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setXDomain([base.xMin, base.xMax]);

    setYDomain([base.yMin, base.yMax]);

    setRefLeft(null);

    setRefRight(null);

    setRefTop(null);

    setRefBottom(null);

    setFocus(null);
  }, [base.xMin, base.xMax, base.yMin, base.yMax]);

  const viewPoints = useMemo(() => {
    const [xmin, xmax] = xDomain;
    const [ymin, ymax] = yDomain;
    return base.points.filter(
      p => p.tsMs >= xmin && p.tsMs <= xmax && p.marginPct >= ymin && p.marginPct <= ymax
    );
  }, [base.points, xDomain, yDomain]);

  const volatility = useMemo(() => {
    const sigma = stddev(viewPoints.map(p => p.marginPct));
    if (sigma < 2) return { label: 'Stable', sigma };
    if (sigma <= 5) return { label: 'Moderate', sigma };
    return { label: 'Volatile', sigma };
  }, [viewPoints]);

  if (!base.points || base.points.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-3">Price & Margin Analysis</h3>
        <div className="text-gray-400">No flips available to display.</div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    // Prefer the scatter point payload (has marginPct/profit/quantity)
    const scatterEntry = payload.find(
      p => p && p.payload && typeof p.payload.marginPct === 'number'
    );
    const entry = scatterEntry || payload[0];
    const d = entry.payload || {};
    const ts = typeof d.tsMs === 'number' ? d.tsMs : typeof label === 'number' ? label : undefined;
    const margin =
      typeof d.marginPct === 'number'
        ? d.marginPct
        : typeof entry.value === 'number'
          ? entry.value
          : NaN;
    const profit = typeof d.profit === 'number' ? d.profit : NaN;
    const qty = typeof d.quantity === 'number' ? d.quantity : undefined;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-xs text-gray-100">
        <div className="font-medium">{ts ? new Date(ts).toLocaleString() : ''}</div>
        <div className="mt-1">
          Margin:{' '}
          <span className={Number(margin) >= 0 ? 'text-green-400' : 'text-red-400'}>
            {Number.isFinite(margin) ? margin.toFixed(2) : '—'}%
          </span>
        </div>
        {Number.isFinite(profit) && (
          <div>
            Profit:{' '}
            <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatGP(profit)}
            </span>
          </div>
        )}
        {typeof qty === 'number' && <div>Qty: {qty.toLocaleString()}</div>}
      </div>
    );
  };

  const renderChart = (tall = false, refArg) => {
    const MARGINS = { top: 8, right: 20, left: 12, bottom: 8 };
    const getDims = () => {
      const el = refArg && refArg.current ? refArg.current : null;
      if (!el) return { w: 1, h: 1 };
      return { w: el.clientWidth || 1, h: el.clientHeight || 1 };
    };
    const xFromPixel = px => {
      const { w } = getDims();
      const innerW = Math.max(1, w - (MARGINS.left + MARGINS.right));
      const pxInner = Math.max(0, Math.min(innerW, px - MARGINS.left));
      const [xmin, xmax] = xDomain;
      const ratio = pxInner / innerW;
      return xmin + ratio * (xmax - xmin);
    };
    const yFromPixel = py => {
      const { h } = getDims();
      const innerH = Math.max(1, h - (MARGINS.top + MARGINS.bottom));
      const pyInner = Math.max(0, Math.min(innerH, py - MARGINS.top));
      const [ymin, ymax] = yDomain;
      const ratio = pyInner / innerH;
      // Invert because pixel 0 is top
      return ymax - ratio * (ymax - ymin);
    };

    return (
      <div
        className={tall ? 'h-[70vh]' : 'h-64'}
        ref={refArg}
        style={{ cursor: isDragging ? 'crosshair' : 'default' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={base.points}
            margin={MARGINS}
            onMouseDown={e => {
              if (!e) return;
              setIsDragging(true);
              if (typeof e.chartX === 'number') {
                const x = xFromPixel(e.chartX);
                setRefLeft(x);
                setRefRight(x);
              }
              if (typeof e.chartY === 'number') {
                const y = yFromPixel(e.chartY);
                setRefTop(y);
                setRefBottom(y);
              } else {
                setRefTop(null);
                setRefBottom(null);
              }
            }}
            onMouseMove={e => {
              if (refLeft !== null && e) {
                if (typeof e.chartX === 'number') setRefRight(xFromPixel(e.chartX));
                if (typeof e.chartY === 'number') setRefBottom(yFromPixel(e.chartY));
              }
            }}
            onMouseUp={() => {
              setIsDragging(false);
              if (refLeft === null || refRight === null) {
                setRefLeft(null);
                setRefRight(null);
                setRefTop(null);
                setRefBottom(null);
                return;
              }
              let left = Math.min(refLeft, refRight);
              let right = Math.max(refLeft, refRight);
              left = Math.max(base.xMin, Math.min(base.xMax, left));
              right = Math.max(base.xMin, Math.min(base.xMax, right));
              if (right - left < 1000) {
                setRefLeft(null);
                setRefRight(null);
                setRefTop(null);
                setRefBottom(null);
                return;
              }
              // Determine Y selection
              const haveY = refTop !== null && refBottom !== null;
              const yLow = haveY ? Math.min(refTop, refBottom) : null;
              const yHigh = haveY ? Math.max(refTop, refBottom) : null;
              // Selected points within rectangular area (if y provided) or within x range otherwise
              const sel = base.points.filter(
                p =>
                  p.tsMs >= left &&
                  p.tsMs <= right &&
                  (!haveY || (p.marginPct >= yLow && p.marginPct <= yHigh))
              );
              if (sel.length === 0) {
                setRefLeft(null);
                setRefRight(null);
                setRefTop(null);
                setRefBottom(null);
                return;
              }
              // Compute focus yDomain if not provided
              let yMinSel, yMaxSel;
              if (haveY) {
                yMinSel = yLow;
                yMaxSel = yHigh;
              } else {
                yMinSel = Math.min(...sel.map(p => p.marginPct));
                yMaxSel = Math.max(...sel.map(p => p.marginPct));
              }
              const pad = Math.max(1, (yMaxSel - yMinSel) * 0.1);
              const f = {
                points: sel,
                xDomain: [left, right],
                yDomain: [yMinSel - pad, yMaxSel + pad],
              };
              setFocus(f);
              setRefLeft(null);
              setRefRight(null);
              setRefTop(null);
              setRefBottom(null);
            }}
            onMouseLeave={() => setIsDragging(false)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="tsMs"
              type="number"
              domain={xDomain}
              tickFormatter={v => new Date(v).toLocaleDateString()}
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis
              domain={yDomain}
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={v => `${Math.round(v)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            <ReferenceLine y={5} stroke="#6b7280" strokeDasharray="2 6" />
            <Scatter dataKey="marginPct" name="Margin %" shape={<ScatterDot />} />
            {refLeft !== null && refRight !== null && (
              <ReferenceArea
                x1={Math.min(refLeft, refRight)}
                x2={Math.max(refLeft, refRight)}
                y1={refTop !== null && refBottom !== null ? Math.min(refTop, refBottom) : undefined}
                y2={refTop !== null && refBottom !== null ? Math.max(refTop, refBottom) : undefined}
                strokeOpacity={0.2}
                fill="#60a5fa"
                fillOpacity={0.2}
              />
            )}
            {/* No scale capture to avoid render loops */}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderFocusChart = () => {
    if (!focus) return null;
    return (
      <div className="mt-6">
        <div className="text-xs text-gray-300 mb-2 flex items-center gap-2">
          <span>Selection View</span>
          <span className="px-2 py-0.5 bg-gray-700/60 rounded border border-gray-600">
            {new Date(focus.xDomain[0]).toLocaleDateString()} →{' '}
            {new Date(focus.xDomain[1]).toLocaleDateString()} | Y:{' '}
            {`${focus.yDomain[0].toFixed(2)}%–${focus.yDomain[1].toFixed(2)}%`}
          </span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={focus.points} margin={{ top: 8, right: 20, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="tsMs"
                type="number"
                domain={focus.xDomain}
                tickFormatter={v => new Date(v).toLocaleDateString()}
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis
                domain={focus.yDomain}
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={v => `${Math.round(v)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
              <ReferenceLine y={5} stroke="#6b7280" strokeDasharray="2 6" />
              <Scatter dataKey="marginPct" name="Margin %" shape={<ScatterDot />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-300">
          <div>
            <span className="text-gray-400">Consistency:</span>{' '}
            <span className="font-semibold text-white">
              {(() => {
                const s = stddev(focus.points.map(p => p.marginPct));
                return s < 2 ? 'Stable' : s <= 5 ? 'Moderate' : 'Volatile';
              })()}
            </span>{' '}
            <span className="text-gray-500">
              (σ {stddev(focus.points.map(p => p.marginPct)).toFixed(2)}%)
            </span>
          </div>
          <div>
            <span className="text-gray-400">Success:</span>{' '}
            <span className="font-semibold text-white">
              {focus.points.filter(p => p.marginPct >= 0).length}/{focus.points.length} profitable
            </span>
          </div>
          <button
            type="button"
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            onClick={() => setFocus(null)}
          >
            Clear Selection
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Margin Performance Timeline</h3>
        <button
          onClick={() => setIsFullscreen(true)}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          title="Maximize chart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
      {isDragging && refLeft !== null && refRight !== null && (
        <div className="mb-2 text-[11px] text-gray-300">
          <span className="px-2 py-1 bg-gray-700/60 rounded border border-gray-600">
            {new Date(Math.min(refLeft, refRight)).toLocaleDateString()} →{' '}
            {new Date(Math.max(refLeft, refRight)).toLocaleDateString()} | Y:{' '}
            {refTop !== null && refBottom !== null
              ? `${Math.min(refTop, refBottom).toFixed(2)}%–${Math.max(refTop, refBottom).toFixed(2)}%`
              : 'auto'}
          </span>
        </div>
      )}
      <p className="text-xs text-gray-400 mb-2">
        Tip: Drag to draw a rectangle for a detailed selection view below.
      </p>
      {renderChart(false, containerRef)}
      {renderFocusChart()}
      <div className="flex flex-wrap items-center justify-between mt-3 text-xs text-gray-300 gap-2">
        <div>
          <span className="text-gray-400">Consistency:</span>{' '}
          <span className="font-semibold text-white">{volatility.label}</span>{' '}
          <span className="text-gray-500">
            (σ {stddev(viewPoints.map(p => p.marginPct)).toFixed(2)}%)
          </span>
        </div>
        <div>
          <span className="text-gray-400">Success:</span>{' '}
          <span className="font-semibold text-white">
            {viewPoints.filter(p => p.marginPct >= 0).length}/{viewPoints.length} profitable
          </span>
        </div>
      </div>

      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Margin Performance Timeline"
      >
        {renderChart(true, containerRefFs)}
        {renderFocusChart()}
      </ChartFullscreenModal>
    </div>
  );
}

// Scale capture removed to prevent update-depth loops

ItemPriceMargin.propTypes = {
  flips: PropTypes.array,
};
