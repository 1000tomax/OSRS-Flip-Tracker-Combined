import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { FixedSizeList as VirtualList } from 'react-window';
import PropTypes from 'prop-types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGuestData } from '../contexts/GuestDataContext';
import { useAccountFilter } from '../contexts/AccountFilterContext';
import { ItemWithIcon } from '../../components/ItemIcon';
import ItemSuccessRateBadge from '../components/ItemSuccessRateBadge';
import ItemProfitSparkline from '../components/ItemProfitSparkline';
import { formatGP } from '../../utils/formatUtils';
import ItemSearch from '../components/ItemSearch';
import GuestLoadingOverlay from '../components/GuestLoadingOverlay';
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

export default function GuestItemsList() {
  const navigate = useNavigate();
  const { guestData: originalData } = useGuestData();
  const { getFilteredData, isFiltered, selectedAccounts } = useAccountFilter();
  const guestData = getFilteredData() || originalData;

  const [searchParams, setSearchParams] = useSearchParams();
  const { baseItems, setBaseItems, progressive, setProgressive, ui, setUi } = useItemsAnalysis();
  const [view, setView] = useState(searchParams.get('view') || ui.view || 'list'); // 'list' | 'grid'
  const [sortKey, setSortKey] = useState(searchParams.get('sort') || ui.sortKey || 'profit');
  const [sortDir, setSortDir] = useState(searchParams.get('dir') || ui.sortDir || 'desc');
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
    sp.set('view', view);
    sp.set('sort', sortKey);
    sp.set('dir', sortDir);
    if (filters.size > 0) sp.set('filters', Array.from(filters).join(','));
    else sp.delete('filters');
    if (terms.length > 0) sp.set('q', terms.join(','));
    else sp.delete('q');
    setSearchParams(sp, { replace: true });
    setUi({ view, sortKey, sortDir, filters, terms });
  }, [view, sortKey, sortDir, filters, terms]);

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
        if (!byItem.has(name)) byItem.set(name, { wins: 0, losses: 0, spark: [] });
        const m = byItem.get(name);
        if (profit > 0) m.wins += 1;
        else if (profit < 0) m.losses += 1;
        m.spark.push(profit);
        if (m.spark.length > 40) m.spark = m.spark.slice(-40);
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
      return { ...m, successRate, sparkData };
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
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'flips':
          return dir * ((a.flipCount || 0) - (b.flipCount || 0));
        case 'success':
          return dir * ((a.successRate || 0) - (b.successRate || 0));
        case 'name':
          return dir * a.item.localeCompare(b.item);
        case 'profit':
        default:
          return dir * ((a.totalProfit || 0) - (b.totalProfit || 0));
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

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

  const toggleSort = key => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const onClickItem = name => {
    const qs = searchParams.toString();
    navigate(`/guest/dashboard/items/${encodeURIComponent(name)}${qs ? `?${qs}` : ''}`);
  };

  const countDisplay =
    terms.length > 0 ? `${sorted.length} of ${allItems.length}` : `${allItems.length}`;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <GuestLoadingOverlay show={introShow} message="Preparing Items Analysis…" />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-gray-400">Guest Dashboard</div>
          <h1 className="text-3xl font-bold text-white">Items Analysis</h1>
          {originalData?.metadata?.dateRange && (
            <p className="text-gray-500 text-xs mt-1">
              {originalData.metadata.dateRange.from} to {originalData.metadata.dateRange.to}
            </p>
          )}
        </div>
        <div>
          <button
            onClick={() => navigate('/guest/dashboard')}
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
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-gray-700 p-1">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              >
                List
              </button>
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-gray-400">Sort:</span>
          <button
            onClick={() => toggleSort('profit')}
            className={`text-xs px-2 py-1 rounded ${sortKey === 'profit' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          >
            Profit {sortKey === 'profit' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onClick={() => toggleSort('flips')}
            className={`text-xs px-2 py-1 rounded ${sortKey === 'flips' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          >
            Flips {sortKey === 'flips' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onClick={() => toggleSort('success')}
            className={`text-xs px-2 py-1 rounded ${sortKey === 'success' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          >
            Success {sortKey === 'success' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onClick={() => toggleSort('name')}
            className={`text-xs px-2 py-1 rounded ${sortKey === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          >
            Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
          <span className="ml-4 text-xs text-gray-400">Filters:</span>
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
      </div>

      {/* Results */}
      {view === 'list' ? (
        <div className="rounded-lg border border-gray-700">
          <div className="grid grid-cols-12 bg-gray-700 text-sm sticky top-0 z-10">
            <div className="col-span-4 px-4 py-2 text-left">Item</div>
            <div className="col-span-2 px-4 py-2 text-right">Total Profit</div>
            <div className="col-span-2 px-4 py-2 text-right">Flips</div>
            <div className="col-span-1 px-4 py-2 text-right">Success</div>
            <div className="col-span-1 px-4 py-2 text-right">Avg/Flip</div>
            <div className="col-span-2 px-4 py-2 text-right">Recent</div>
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
                  className="grid grid-cols-12 border-t border-gray-700 hover:bg-gray-800 cursor-pointer items-center text-sm"
                  onClick={() => onClickItem(i.item)}
                >
                  <div className="col-span-4 px-4 py-2">
                    <ItemWithIcon itemName={i.item} textClassName="text-white font-medium" />
                  </div>
                  <div className="col-span-2 px-4 py-2 text-right">
                    <span className={i.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatGP(i.totalProfit)}
                    </span>
                  </div>
                  <div className="col-span-2 px-4 py-2 text-right text-gray-200">
                    {i.flipCount?.toLocaleString?.() || i.flipCount}
                  </div>
                  <div className="col-span-1 px-4 py-2 text-right">
                    <ItemSuccessRateBadge value={i.successRate} />
                  </div>
                  <div className="col-span-1 px-4 py-2 text-right text-gray-200">
                    {formatGP(i.avgProfit)}
                  </div>
                  <div className="col-span-2 px-4 py-2">
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(i => (
            <button
              key={i.item}
              onClick={() => onClickItem(i.item)}
              className="text-left bg-gray-800 rounded-lg p-4 border border-transparent hover:border-blue-500"
            >
              <div className="flex items-center justify-between mb-2">
                <ItemWithIcon itemName={i.item} textClassName="text-white font-semibold" />
                <ItemSuccessRateBadge value={i.successRate} />
              </div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div
                    className={`text-sm ${i.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {formatGP(i.totalProfit)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {i.flipCount?.toLocaleString?.() || i.flipCount} flips • {formatGP(i.avgProfit)}{' '}
                    avg
                  </div>
                </div>
                <div className="flex-1">
                  <ItemProfitSparkline data={i.sparkData} />
                </div>
              </div>
            </button>
          ))}
          {sorted.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">No items found.</div>
          )}
        </div>
      )}
    </div>
  );
}

GuestItemsList.propTypes = {
  // No props currently, present for consistency
  children: PropTypes.node,
};
