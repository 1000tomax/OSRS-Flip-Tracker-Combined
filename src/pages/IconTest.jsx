/**
 * Icon Test Page
 * 
 * Bulk testing page to verify OSRS item icons are loading correctly.
 * Shows all items with their icons and load status.
 */

import React, { useState } from 'react';
import { useCsvData } from '../hooks/useCsvData';
import { clearAllIconCache } from '../utils/itemIcons';
import ItemIcon from '../components/ItemIcon';
import {
  PageContainer,
  CardContainer,
  PageHeader,
  LoadingLayout,
  ErrorLayout,
} from '../components/layouts';

export default function IconTest() {
  const { data: items, loading, error } = useCsvData('/data/item-stats.csv');
  const [iconStatuses, setIconStatuses] = useState({});
  const [filter, setFilter] = useState('all'); // all, working, broken
  const [testing, setTesting] = useState(false);

  // Test all icons
  const testAllIcons = async () => {
    if (!items || testing) return;
    
    setTesting(true);
    const statuses = {};
    
    // Pool concurrency for faster checks without overwhelming
    const CONCURRENCY = 20;
    let idx = 0;

    const { getPossibleIconUrls, preloadImage: testImage } = await import('../utils/itemIcons');

    const worker = async () => {
      while (idx < items.length) {
        const current = items[idx++];
        const itemName = current.item_name || current.item;
        if (!itemName) continue;

        const possibleUrls = getPossibleIconUrls(itemName);
        // Test all candidate URLs concurrently and pick the first that works
        const results = await Promise.allSettled(possibleUrls.map(url => testImage(url)));
        let workingUrl = null;
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r.status === 'fulfilled' && r.value === true) {
            workingUrl = possibleUrls[i];
            break;
          }
        }

        statuses[itemName] = {
          url: workingUrl || possibleUrls[0],
          works: !!workingUrl,
          itemName,
          tried: possibleUrls,
        };

        // Update state progressively
        setIconStatuses(prev => ({
          ...prev,
          [itemName]: statuses[itemName],
        }));
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
    
    setTesting(false);
  };

  // Get unique items
  const uniqueItems = items ? 
    [...new Map(items.map(item => {
      const name = item.item_name || item.item;
      return [name, { item_name: name }];
    })).values()].filter(item => item.item_name) 
    : [];

  // Filter items based on status
  const filteredItems = uniqueItems.filter(item => {
    const name = item.item_name;
    if (filter === 'all') return true;
    if (filter === 'working') return iconStatuses[name]?.works === true;
    if (filter === 'broken') return iconStatuses[name]?.works === false;
    if (filter === 'untested') return !iconStatuses[name];
    return true;
  });

  // Calculate statistics
  const stats = {
    total: uniqueItems.length,
    tested: Object.keys(iconStatuses).length,
    working: Object.values(iconStatuses).filter(s => s.works).length,
    broken: Object.values(iconStatuses).filter(s => !s.works).length,
  };

  if (loading) {
    return <LoadingLayout text="Loading items..." />;
  }

  if (error) {
    return (
      <ErrorLayout
        title="Failed to load items"
        error={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <PageContainer>
      <CardContainer>
        <PageHeader title="OSRS Icon Test" icon="🧪" />
        
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={testAllIcons}
                disabled={testing}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  testing 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {testing ? `Testing... (${stats.tested}/${stats.total})` : 'Test All Icons'}
              </button>
              
              {stats.tested > 0 && (
                <button
                  onClick={() => {
                    setIconStatuses({});
                    setFilter('all');
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                >
                  Clear Results
                </button>
              )}
              
              <button
                onClick={() => {
                  clearAllIconCache();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                title="Clear localStorage cache and reload"
              >
                Clear Cache
              </button>
            </div>
            
            {/* Filter buttons */}
            <div className="flex gap-2">
              {['all', 'working', 'broken', 'untested'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    filter === f 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'all' && ` (${stats.total})`}
                  {f === 'working' && ` (${stats.working})`}
                  {f === 'broken' && ` (${stats.broken})`}
                  {f === 'untested' && ` (${stats.total - stats.tested})`}
                </button>
              ))}
            </div>
          </div>
          
          {/* Statistics */}
          {stats.tested > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded p-3">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-gray-400">Total Items</div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-2xl font-bold text-blue-400">{stats.tested}</div>
                <div className="text-sm text-gray-400">Tested</div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-2xl font-bold text-green-400">{stats.working}</div>
                <div className="text-sm text-gray-400">Working</div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-2xl font-bold text-red-400">{stats.broken}</div>
                <div className="text-sm text-gray-400">Broken</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Items Grid */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-white mb-4">
            Items ({filteredItems.length})
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[600px] overflow-y-auto">
            {filteredItems.map(item => {
              const name = item.item_name;
              const status = iconStatuses[name];
              
              return (
                <div
                  key={name}
                  className={`bg-gray-900 rounded-lg p-3 border ${
                    status 
                      ? status.works 
                        ? 'border-green-600' 
                        : 'border-red-600'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <ItemIcon itemName={name} size={32} lazy={false} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate" title={name}>
                        {name}
                      </div>
                      {status && (
                        <div className={`text-xs mt-1 ${status.works ? 'text-green-400' : 'text-red-400'}`}>
                          {status.works ? '✓ Working' : '✗ Broken'}
                        </div>
                      )}
                      {status && !status.works && (
                        <div className="text-xs text-gray-500 mt-1 break-all">
                          URL: {status.url.split('/').pop()}
                        </div>
                      )}
                      {status && (
                        <div className="mt-1">
                          <img 
                            src={status.url} 
                            alt="Direct test" 
                            className="w-6 h-6 inline-block"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {filter === 'broken' && filteredItems.length > 0 && (
            <div className="mt-4 p-4 bg-gray-900 rounded-lg">
              <h3 className="text-sm font-bold text-white mb-2">Broken Items URLs:</h3>
              <pre className="text-xs text-gray-400 overflow-x-auto">
                {filteredItems.map(item => {
                  const status = iconStatuses[item.item_name];
                  return status && !status.works ? `${item.item_name}: ${status.url}\n` : '';
                }).join('')}
              </pre>
            </div>
          )}
        </div>
      </CardContainer>
    </PageContainer>
  );
}
