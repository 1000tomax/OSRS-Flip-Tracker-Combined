import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { FixedSizeList as VirtualList } from 'react-window';
import PropTypes from 'prop-types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAccountFilter } from '../contexts/AccountFilterContext';
import { ItemWithIcon } from '../components/ItemIcon';
import ItemSuccessRateBadge from '../components/ItemSuccessRateBadge';
import ItemProfitSparkline from '../components/ItemProfitSparkline';
import { formatGP } from '../utils/formatUtils';
import ItemSearch from '../components/ItemSearch';
import LoadingOverlay from '../components/LoadingOverlay';
import { useItemsAnalysis } from '../contexts/ItemsAnalysisContext';

/**
 * Build per-item metrics from flips and itemStats.
 * Memoized and runs only when underlying data changes.
 */
function useItemMetrics(guestData) {
  return useMemo(() => {
    const metrics = new Map();

    // Seed from itemStats for totals/averages
    const statsArray = Array.isArray(guestData?.itemStats) ? guestData.itemStats : [];
    statsArray.forEach(s => {
      metrics.set(s.item, {
        item: s.item,
        totalProfit: Number(s.totalProfit) || 0,
        flipCount: Number(s.flipCount) || 0,
        totalQuantity: Number(s.totalQuantity) || 0,
        avgProfit: Number(s.avgProfit) || (Number(s.totalProfit) || 0) / (Number(s.flipCount) || 1),
        wins: 0,
        losses: 0,
        spark: [],
        heldMinutesTotal: 0,
        heldCount: 0,
      });
    });

    // Defer wins/losses/spark computation to progressive pass; keep only stat-based fields here

    // Convert to array with computed successRate and sparkline data points
    return Array.from(metrics.values()).map(m => {
      const successRate = 0;
      const sparkData = [];
      const avgProfit = Number.isFinite(m.avgProfit)
        ? m.avgProfit
        : (m.totalProfit || 0) / (m.flipCount || 1);
      return {
        ...m,
        successRate,
        avgProfit,
        sparkData,
        avgHeldMinutes: 0,
      };
    });
  }, [guestData]);
}

// Debounce helper without extra deps
function useDebouncedCallback(cb, delay) {
  const timeoutRef = useRef();
  const fn = useCallback(
    (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => cb(...args), delay);
    },
    [cb, delay]
  );
  useEffect(() => () => timeoutRef.current && clearTimeout(timeoutRef.current), []);
  return fn;
}

export default function ItemsList() {
  const navigate = useNavigate();
  const { guestData: originalData } = useData();
  const { getFilteredData, isFiltered, selectedAccounts } = useAccountFilter();
  const guestData = getFilteredData() || originalData;

  const [searchParams, setSearchParams] = useSearchParams();
  const { baseItems, setBaseItems, progressive, setProgressive, ui, setUi } = useItemsAnalysis();

  // Multi-column sorting: array of { key, dir } objects
  const [sortCriteria, setSortCriteria] = useState(() => {
    // Try to parse from URL first (format: "profit:desc,flips:asc")
    const sortParam = searchParams.get('sort');
    if (sortParam) {
      const parsed = sortParam
        .split(',')
        .map(s => {
          const [key, dir = 'desc'] = s.split(':');
          return { key, dir };
        })
        .filter(s => s.key);
      if (parsed.length > 0) return parsed;
    }
    // Fall back to UI context
    if (Array.isArray(ui.sortCriteria) && ui.sortCriteria.length > 0) {
      return ui.sortCriteria;
    }
    // Default: sort by profit descending
    return [{ key: 'profit', dir: 'desc' }];
  });

  const [filters, setFilters] = useState(() => {
    if (ui.filters instanceof Set && ui.filters.size > 0) return new Set(Array.from(ui.filters));
    return new Set((searchParams.get('filters') || '').split(',').filter(Boolean));
  });
  const [terms, setTerms] = useState(() => {
    if (Array.isArray(ui.terms) && ui.terms.length > 0) return ui.terms;
    return searchParams.get('q')
      ? searchParams
          .get('q')
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(Boolean)
      : [];
  });

  // Intro loading overlay: avoid flicker by requiring a short minimum delay
  const [introShow, setIntroShow] = useState(!(baseItems && baseItems.length > 0));
  const [introMinElapsed, setIntroMinElapsed] = useState(false);
  const [firstFrame, setFirstFrame] = useState(false);
  useEffect(() => {
    // Slightly longer minimum so charts and layout have breathing room
    const t1 = setTimeout(() => setIntroMinElapsed(true), 600);
    // Safety cap to ensure it never lingers too long
    const t2 = setTimeout(() => setIntroShow(false), 2000);
    const raf = requestAnimationFrame(() => setFirstFrame(true));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Keep URL + context UI in sync for persistence between list and detail
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    // Encode sortCriteria as "key:dir,key:dir,..."
    const sortString = sortCriteria.map(s => `${s.key}:${s.dir}`).join(',');
    sp.set('sort', sortString);
    if (filters.size > 0) sp.set('filters', Array.from(filters).join(','));
    else sp.delete('filters');
    if (terms.length > 0) sp.set('q', terms.join(','));
    else sp.delete('q');
    setSearchParams(sp, { replace: true });
    setUi({ sortCriteria, filters, terms });
  }, [sortCriteria, filters, terms]);

  const allItemsBaseComputed = useItemMetrics(guestData);
  useEffect(() => {
    if ((!baseItems || baseItems.length === 0) && allItemsBaseComputed.length > 0) {
      setBaseItems(allItemsBaseComputed);
    }
  }, [allItemsBaseComputed, baseItems]);
  const allItemsBase = baseItems && baseItems.length > 0 ? baseItems : allItemsBaseComputed;

  // Progressive metrics: fill success and sparkline incrementally to avoid long blocking work
  useEffect(() => {
    let cancelled = false;
    if (progressive?.byItem && progressive.byItem.size > 0) {
      return () => {
        cancelled = true;
      };
    }
    const byItem = new Map();
    const rows = [];
    const byDate = guestData?.flipsByDate || {};
    Object.values(byDate).forEach(day => {
      const flips = Array.isArray(day) ? day : day?.flips || [];
      flips.forEach(f => rows.push(f));
    });

    // Sort flips by time once to build reasonable sparklines
    rows.sort((a, b) => {
      const at = Date.parse(a.lastSellTime || a.endTime || a.firstBuyTime || a.startTime || 0) || 0;
      const bt = Date.parse(b.lastSellTime || b.endTime || b.firstBuyTime || b.startTime || 0) || 0;
      return at - bt;
    });

    const chunkSize = 400;
    let index = 0;

    function processChunk(_deadline) {
      const end = Math.min(index + chunkSize, rows.length);
      for (; index < end; index++) {
        const f = rows[index];
        const name = f?.item || f?.item_name;
        if (!name) continue;
        const profit = Number(f.profit) || 0;
        if (!byItem.has(name))
          byItem.set(name, { wins: 0, losses: 0, spark: [], heldMinutesTotal: 0, heldCount: 0 });
        const m = byItem.get(name);
        if (profit > 0) m.wins += 1;
        else if (profit < 0) m.losses += 1;
        m.spark.push(profit);
        if (m.spark.length > 40) m.spark = m.spark.slice(-40);

        const startIso =
          f.firstBuyTime ||
          f.first_buy_time ||
          f.startTime ||
          f.buy_time ||
          f.buyTime ||
          f.opened_time ||
          f.openedTime;
        const endIso =
          f.lastSellTime ||
          f.last_sell_time ||
          f.endTime ||
          f.sell_time ||
          f.sellTime ||
          f.closed_time ||
          f.closedTime;

        const durationMinutesRaw =
          Number(
            f.flip_duration_minutes ??
              f.flipDurationMinutes ??
              f.durationMinutes ??
              f.durationMin ??
              f.duration_min ??
              (typeof f.durationHours === 'number' ? f.durationHours * 60 : undefined)
          ) ||
          (startIso && endIso ? (Date.parse(endIso) - Date.parse(startIso)) / (1000 * 60) : null);
        if (Number.isFinite(durationMinutesRaw) && durationMinutesRaw > 0) {
          m.heldMinutesTotal += durationMinutesRaw;
          m.heldCount += 1;
        }
      }

      // Push partial results so UI updates smoothly
      if (!cancelled) setProgressive({ ready: index >= rows.length, byItem: new Map(byItem) });

      if (index < rows.length && !cancelled) {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(processChunk);
        } else {
          setTimeout(processChunk, 16);
        }
      }
    }

    if (rows.length === 0) {
      setProgressive({ ready: true, byItem: new Map() });
      return () => {
        cancelled = true;
      };
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(processChunk);
    } else {
      setTimeout(processChunk, 0);
    }

    return () => {
      cancelled = true;
    };
  }, [guestData]);

  // Merge base + progressive into render-ready items
  const allItems = useMemo(() => {
    if (!progressive.byItem || progressive.byItem.size === 0) return allItemsBase;
    return allItemsBase.map(m => {
      const p = progressive.byItem.get(m.item);
      if (!p) return m;
      const wl = (p.wins || 0) + (p.losses || 0);
      const denom = wl > 0 ? wl : m.flipCount || 0;
      const successRate = denom > 0 ? (p.wins / denom) * 100 : 0;
      const sparkData = (p.spark || []).map((v, i) => ({ x: i, profit: v }));
      const heldCount = p.heldCount || 0;
      const avgHeldMinutes = heldCount > 0 ? p.heldMinutesTotal / heldCount : m.avgHeldMinutes || 0;
      // Calculate profit per hour: total profit divided by total hours held
      const totalHoursHeld = (p.heldMinutesTotal || 0) / 60;
      const profitPerHour = totalHoursHeld > 0 ? m.totalProfit / totalHoursHeld : 0;
      return { ...m, successRate, sparkData, avgHeldMinutes, profitPerHour };
    });
  }, [allItemsBase, progressive]);

  // Hide intro once base metrics are available and min delay passed
  useEffect(() => {
    if (introMinElapsed && firstFrame && allItemsBase.length > 0) {
      setIntroShow(false);
    }
  }, [introMinElapsed, firstFrame, allItemsBase.length]);

  // Debounce search updates from ItemSearch
  const updateTerms = useDebouncedCallback(values => setTerms(values), 250);

  const filtered = useMemo(() => {
    let arr = allItems;
    if (terms.length > 0) {
      arr = arr.filter(i => terms.some(t => i.item.toLowerCase().includes(t)));
    }
    if (filters.has('profit')) arr = arr.filter(i => i.totalProfit > 0);
    if (filters.has('loss')) arr = arr.filter(i => i.totalProfit < 0);
    if (filters.has('volume')) arr = arr.filter(i => (i.flipCount || 0) > 50);
    return arr;
  }, [allItems, terms, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];

    // Helper to get sort value for a given key
    const getSortValue = (item, key) => {
      switch (key) {
        case 'flips':
          return item.flipCount || 0;
        case 'success':
          return item.successRate || 0;
        case 'avgProfit':
          return item.avgProfit || 0;
        case 'avgHeld':
          return item.avgHeldMinutes || 0;
        case 'profitPerHour':
          return item.profitPerHour || 0;
        case 'name':
          return item.item;
        case 'profit':
        default:
          return item.totalProfit || 0;
      }
    };

    arr.sort((a, b) => {
      // Apply each sort criterion in order until we get a non-zero result
      for (const { key, dir } of sortCriteria) {
        const dirMultiplier = dir === 'asc' ? 1 : -1;
        const valA = getSortValue(a, key);
        const valB = getSortValue(b, key);

        let result;
        if (typeof valA === 'string' && typeof valB === 'string') {
          result = valA.localeCompare(valB);
        } else {
          result = (valA || 0) - (valB || 0);
        }

        result *= dirMultiplier;
        if (result !== 0) return result;
      }
      return 0;
    });

    return arr;
  }, [filtered, sortCriteria]);

  const toggleFilter = key => {
    const next = new Set(filters);
    if (next.has(key)) next.delete(key);
    else {
      // profit/loss mutually exclusive
      if (key === 'profit') next.delete('loss');
      if (key === 'loss') next.delete('profit');
      next.add(key);
    }
    setFilters(next);
  };

  const toggleSort = (key, shiftKey = false) => {
    setSortCriteria(current => {
      const existingIndex = current.findIndex(s => s.key === key);

      // Normal click: replace entire sort with this column
      if (!shiftKey) {
        if (existingIndex === 0 && current.length === 1) {
          // Toggle direction if clicking the same single sort
          return [{ key, dir: current[0].dir === 'asc' ? 'desc' : 'asc' }];
        }
        // Otherwise, start fresh with this column descending
        return [{ key, dir: 'desc' }];
      }

      // Shift+Click: add secondary/tertiary sort
      if (existingIndex >= 0) {
        // Already in list: toggle its direction
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          dir: updated[existingIndex].dir === 'asc' ? 'desc' : 'asc',
        };
        return updated;
      }

      // Not in list: add it (max 3 sorts)
      if (current.length >= 3) {
        // Replace the last sort
        return [...current.slice(0, 2), { key, dir: 'desc' }];
      }
      return [...current, { key, dir: 'desc' }];
    });
  };

  const onClickItem = name => {
    const qs = searchParams.toString();
    navigate(`/items/${encodeURIComponent(name)}${qs ? `?${qs}` : ''}`);
  };

  const countDisplay =
    terms.length > 0 ? `${sorted.length} of ${allItems.length}` : `${allItems.length}`;

  const formatHeldDuration = minutes => {
    if (!minutes || !Number.isFinite(minutes)) return '—';
    if (minutes >= 60) {
      const hours = minutes / 60;
      if (hours >= 10) return `${Math.round(hours)}h`;
      return `${hours.toFixed(1)}h`;
    }
    return `${Math.round(minutes)}m`;
  };

  // Helper to get sort indicator for a column
  const getSortIndicator = key => {
    const index = sortCriteria.findIndex(s => s.key === key);
    if (index === -1) return null;

    const { dir } = sortCriteria[index];
    const arrow = dir === 'asc' ? '↑' : '↓';
    const priority = sortCriteria.length > 1 ? ['①', '②', '③'][index] : '';

    return (
      <span className="ml-1">
        {priority}
        {arrow}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <LoadingOverlay show={introShow} message="Preparing Items Analysis…" />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-gray-400">Dashboard</div>
          <h1 className="text-3xl font-bold text-white">Items Analysis</h1>
          {originalData?.metadata?.dateRange && (
            <p className="text-gray-500 text-xs mt-1">
              {originalData.metadata.dateRange.from} to {originalData.metadata.dateRange.to}
            </p>
          )}
        </div>
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            ← Overview
          </button>
        </div>
      </div>

      {/* Filter info */}
      {originalData?.metadata?.accountCount > 1 && isFiltered && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-6">
          <p className="text-blue-200 text-sm">
            🔍{' '}
            <strong>
              Filtering data for {selectedAccounts.length} account
              {selectedAccounts.length > 1 ? 's' : ''}:
            </strong>{' '}
            {selectedAccounts.join(', ')}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <ItemSearch onSearch={vals => updateTerms(vals)} placeholder="Search items..." />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-gray-400">Filters:</span>
          <button
            onClick={() => toggleFilter('profit')}
            className={`text-xs px-2 py-1 rounded ${filters.has('profit') ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'}`}
          >
            Profitable only
          </button>
          <button
            onClick={() => toggleFilter('loss')}
            className={`text-xs px-2 py-1 rounded ${filters.has('loss') ? 'bg-red-700 text-red-100' : 'bg-gray-700 text-gray-200'}`}
          >
            Loss only
          </button>
          <button
            onClick={() => toggleFilter('volume')}
            className={`text-xs px-2 py-1 rounded ${filters.has('volume') ? 'bg-yellow-700 text-yellow-100' : 'bg-gray-700 text-gray-200'}`}
          >
            High volume (&gt;50)
          </button>
          <span className="ml-auto text-xs text-gray-400">Items: {countDisplay}</span>
        </div>

        {/* Multi-sort hint */}
        <div className="mt-3 text-xs text-gray-400 flex items-center gap-2">
          <span>💡 Tip:</span>
          <span>
            Click column headers to sort. Hold{' '}
            <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">Shift</kbd> and click to
            add secondary sorts (up to 3).
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-lg border border-gray-700">
        <div className="grid grid-cols-[2fr_1fr_0.6fr_0.6fr_0.8fr_0.8fr_0.9fr_1fr] bg-gray-700 text-sm sticky top-0 z-10">
          <div
            className="px-4 py-2 text-left cursor-pointer hover:bg-gray-600 select-none flex items-center gap-1"
            onClick={e => toggleSort('name', e.shiftKey)}
          >
            Item
            {getSortIndicator('name')}
          </div>
          <div
            className="px-4 py-2 text-right cursor-pointer hover:bg-gray-600 select-none flex items-center justify-end gap-1"
            onClick={e => toggleSort('profit', e.shiftKey)}
          >
            Total Profit
            {getSortIndicator('profit')}
          </div>
          <div
            className="px-4 py-2 text-right cursor-pointer hover:bg-gray-600 select-none flex items-center justify-end gap-1"
            onClick={e => toggleSort('flips', e.shiftKey)}
          >
            Flips
            {getSortIndicator('flips')}
          </div>
          <div
            className="px-4 py-2 text-right cursor-pointer hover:bg-gray-600 select-none flex items-center justify-end gap-1"
            onClick={e => toggleSort('success', e.shiftKey)}
          >
            Success
            {getSortIndicator('success')}
          </div>
          <div
            className="px-4 py-2 text-right cursor-pointer hover:bg-gray-600 select-none flex items-center justify-end gap-1"
            onClick={e => toggleSort('avgProfit', e.shiftKey)}
          >
            Avg/Flip
            {getSortIndicator('avgProfit')}
          </div>
          <div
            className="px-4 py-2 text-right cursor-pointer hover:bg-gray-600 select-none flex items-center justify-end gap-1"
            onClick={e => toggleSort('avgHeld', e.shiftKey)}
          >
            Avg Held
            {getSortIndicator('avgHeld')}
          </div>
          <div
            className="px-4 py-2 text-right cursor-pointer hover:bg-gray-600 select-none flex items-center justify-end gap-1"
            onClick={e => toggleSort('profitPerHour', e.shiftKey)}
          >
            GP/Hr
            {getSortIndicator('profitPerHour')}
          </div>
          <div className="px-4 py-2 text-right text-gray-400">Recent</div>
        </div>
        <VirtualList
          height={Math.min(600, Math.max(200, sorted.length * 56))}
          itemCount={sorted.length}
          itemSize={56}
          width={'100%'}
          className="block"
        >
          {({ index, style }) => {
            const i = sorted[index];
            if (!i) return null;
            return (
              <div
                style={style}
                className="grid grid-cols-[2fr_1fr_0.6fr_0.6fr_0.8fr_0.8fr_0.9fr_1fr] border-t border-gray-700 hover:bg-gray-800 cursor-pointer items-center text-sm"
                onClick={() => onClickItem(i.item)}
              >
                <div className="px-4 py-2">
                  <ItemWithIcon itemName={i.item} textClassName="text-white font-medium" />
                </div>
                <div className="px-4 py-2 text-right">
                  <span className={i.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatGP(i.totalProfit)}
                  </span>
                </div>
                <div className="px-4 py-2 text-right text-gray-200">
                  {i.flipCount?.toLocaleString?.() || i.flipCount}
                </div>
                <div className="px-4 py-2 text-right">
                  <ItemSuccessRateBadge value={i.successRate} />
                </div>
                <div className="px-4 py-2 text-right text-gray-200">{formatGP(i.avgProfit)}</div>
                <div className="px-4 py-2 text-right text-gray-200">
                  {formatHeldDuration(i.avgHeldMinutes)}
                </div>
                <div className="px-4 py-2 text-right">
                  <span className={i.profitPerHour >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatGP(i.profitPerHour)}
                  </span>
                </div>
                <div className="px-4 py-2">
                  <ItemProfitSparkline data={i.sparkData} />
                </div>
              </div>
            );
          }}
        </VirtualList>
        {sorted.length === 0 && (
          <div className="text-center text-gray-400 py-8">No items found.</div>
        )}
      </div>
    </div>
  );
}

ItemsList.propTypes = {
  // No props currently, present for consistency
  children: PropTypes.node,
};
