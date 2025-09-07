import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FixedSizeList as VirtualList } from 'react-window';
import { formatGP, formatDuration, formatROI } from '../../utils/formatUtils';

function toCSV(rows) {
  const headers = ['Date','Quantity','Avg Buy','Avg Sell','Profit','Duration(min)','ROI(%)','Tax'];
  const lines = rows.map(r => [
    r.ts ? new Date(r.ts).toISOString() : '',
    r.quantity ?? '',
    r.avgBuyPrice ?? '',
    r.avgSellPrice ?? '',
    r.profit ?? '',
    (r.durationMin ?? ''),
    typeof r.roi === 'number' ? (r.roi * 100).toFixed(2) : '',
    r.tax ?? '',
  ].join(','));
  return [headers.join(','), ...lines].join('\n');
}

export default function GuestItemTransactions({ flips = [], pageSize = 20, itemName = 'Item' }) {
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  // Measure platform scrollbar width once to align header with virtual list body when scrollbars appear
  useEffect(() => {
    try {
      const outer = document.createElement('div');
      outer.style.visibility = 'hidden';
      outer.style.position = 'absolute';
      outer.style.top = '-9999px';
      outer.style.width = '100px';
      outer.style.height = '100px';
      outer.style.overflow = 'scroll';
      document.body.appendChild(outer);
      const width = outer.offsetWidth - outer.clientWidth;
      document.body.removeChild(outer);
      if (width && width > 0) setScrollbarWidth(width);
    } catch (e) {
      // no-op
    }
  }, []);

  const sorted = useMemo(() => {
    const arr = [...flips];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'date':
          return dir * ((a.tsMs || 0) - (b.tsMs || 0));
        case 'quantity':
          return dir * ((a.quantity || 0) - (b.quantity || 0));
        case 'buy':
          return dir * ((a.avgBuyPrice || 0) - (b.avgBuyPrice || 0));
        case 'sell':
          return dir * ((a.avgSellPrice || 0) - (b.avgSellPrice || 0));
        case 'profit':
          return dir * ((a.profit || 0) - (b.profit || 0));
        case 'duration':
          return dir * (((a.durationMin ?? 0)) - ((b.durationMin ?? 0)));
        case 'roi':
          return dir * (((a.roi ?? 0)) - ((b.roi ?? 0)));
        default:
          return 0;
      }
    });
    return arr;
  }, [flips, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = showAll ? sorted : sorted.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const onExport = () => {
    const csv = toCSV(sorted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${itemName.replace(/\s+/g,'_').toLowerCase()}_transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const HeaderCell = ({ label, keyId, align = 'left' }) => (
    <button
      onClick={() => toggleSort(keyId)}
      className={`px-3 py-2 text-xs font-semibold text-gray-200 hover:text-white ${align==='right'?'text-right':'text-left'}`}
    >
      {label} {sortKey===keyId ? (sortDir==='asc' ? '▲' : '▼') : ''}
    </button>
  );

  const Row = ({ row, style }) => (
    <div style={style} className="grid grid-cols-12 border-t border-gray-700 items-center text-sm hover:bg-gray-800">
      <div className="col-span-3 px-3 py-2 text-gray-200">{row.ts ? new Date(row.ts).toLocaleString() : '-'}</div>
      <div className="col-span-1 px-3 py-2 text-right text-gray-200">{row.quantity?.toLocaleString?.() || row.quantity || 0}</div>
      <div className="col-span-2 px-3 py-2 text-right text-gray-200">{formatGP(row.avgBuyPrice || 0)}</div>
      <div className="col-span-2 px-3 py-2 text-right text-gray-200">{formatGP(row.avgSellPrice || 0)}</div>
      <div className={`col-span-2 px-3 py-2 text-right ${row.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatGP(row.profit || 0)}</div>
      <div className="col-span-1 px-3 py-2 text-right text-gray-200">{row.durationMin != null ? formatDuration(row.durationMin) : '-'}</div>
      <div className="col-span-1 px-3 py-2 text-right text-gray-200">{typeof row.roi === 'number' ? formatROI(row.roi) : '-'}</div>
    </div>
  );

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-white">Historical Transactions</h3>
        <div className="flex items-center gap-2">
          {sorted.length > pageSize && (
            <button onClick={() => setShowAll(s => !s)} className="px-3 py-1 text-sm rounded bg-gray-700 text-gray-200 hover:bg-gray-600">
              {showAll ? 'Paginate' : 'Show All'}
            </button>
          )}
          <button onClick={onExport} className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-500">Export CSV</button>
        </div>
      </div>

      {/* Header */}
      <div
        className="grid grid-cols-12 bg-gray-700 rounded-t"
        style={showAll && scrollbarWidth ? { paddingRight: scrollbarWidth } : undefined}
      >
        <div className="col-span-3"><HeaderCell label="Date" keyId="date" /></div>
        <div className="col-span-1 text-right"><HeaderCell label="Qty" keyId="quantity" align="right" /></div>
        <div className="col-span-2 text-right"><HeaderCell label="Avg Buy" keyId="buy" align="right" /></div>
        <div className="col-span-2 text-right"><HeaderCell label="Avg Sell" keyId="sell" align="right" /></div>
        <div className="col-span-2 text-right"><HeaderCell label="Profit" keyId="profit" align="right" /></div>
        <div className="col-span-1 text-right"><HeaderCell label="Dur" keyId="duration" align="right" /></div>
        <div className="col-span-1 text-right"><HeaderCell label="ROI" keyId="roi" align="right" /></div>
      </div>

      {/* Body */}
      {showAll ? (
        <VirtualList
          height={Math.min(520, Math.max(240, sorted.length * 44))}
          itemCount={sorted.length}
          itemSize={44}
          width={'100%'}
          className="block"
        >
          {({ index, style }) => <Row key={index} row={sorted[index]} style={style} />}
        </VirtualList>
      ) : (
        <div>
          {current.map((row, idx) => <Row key={`${row.ts || idx}-${idx}`} row={row} />)}
        </div>
      )}

      {/* Pagination */}
      {!showAll && pageCount > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-300">
          <div>Page {page + 1} of {pageCount}</div>
          <div className="flex gap-2">
            <button disabled={page===0} onClick={() => setPage(0)} className="px-2 py-1 rounded bg-gray-700 disabled:opacity-50">« First</button>
            <button disabled={page===0} onClick={() => setPage(p => Math.max(0, p-1))} className="px-2 py-1 rounded bg-gray-700 disabled:opacity-50">‹ Prev</button>
            <button disabled={page>=pageCount-1} onClick={() => setPage(p => Math.min(pageCount-1, p+1))} className="px-2 py-1 rounded bg-gray-700 disabled:opacity-50">Next ›</button>
            <button disabled={page>=pageCount-1} onClick={() => setPage(pageCount-1)} className="px-2 py-1 rounded bg-gray-700 disabled:opacity-50">Last »</button>
          </div>
        </div>
      )}
    </div>
  );
}

GuestItemTransactions.propTypes = {
  flips: PropTypes.array,
  pageSize: PropTypes.number,
  itemName: PropTypes.string,
};
