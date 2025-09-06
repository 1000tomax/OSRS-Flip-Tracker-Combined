/**
 * Test Page for Discord Icon Reporting
 */

import React, { useState } from 'react';
import { reportFailedIcon, reportFailedIcons, clearReportHistory } from '../utils/iconReporting';
import {
  PageContainer,
  CardContainer,
  PageHeader,
} from '../components/layouts';

export default function TestDiscordReport() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const testSingleReport = async () => {
    setLoading(true);
    setStatus('Sending single item report...');
    
    try {
      const success = await reportFailedIcon('Test Item Name', {
        source: 'Test Page',
        username: 'Developer Test'
      });
      
      if (success) {
        setStatus('✅ Single report sent successfully! Check Discord.');
      } else {
        setStatus('❌ Report failed - check console for details');
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testBulkReport = async () => {
    setLoading(true);
    setStatus('Sending bulk report...');
    
    const testItems = [
      'Test Item 1',
      'Test Item 2',
      'Test Item 3',
      'Rare Drop Table',
      'Dragon Claws'
    ];
    
    try {
      const success = await reportFailedIcons(testItems, 'Test Bulk Report');
      
      if (success) {
        setStatus(`✅ Bulk report sent successfully! (${testItems.length} items)`);
      } else {
        setStatus('❌ Bulk report failed - check console');
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    clearReportHistory();
    setStatus('✅ Report history cleared - items can be reported again');
  };

  return (
    <PageContainer>
      <CardContainer>
        <PageHeader title="Discord Report Testing" icon="🧪" />
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-4">Test Discord Webhook</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-900 rounded p-4">
              <p className="text-sm text-gray-400 mb-3">
                These buttons will send test messages to your Discord webhook to verify it's working.
              </p>
              
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={testSingleReport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition"
                >
                  Test Single Report
                </button>
                
                <button
                  onClick={testBulkReport}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition"
                >
                  Test Bulk Report
                </button>
                
                <button
                  onClick={clearHistory}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition"
                >
                  Clear Report History
                </button>
              </div>
            </div>
            
            {status && (
              <div className="bg-gray-900 rounded p-4">
                <p className="text-sm font-mono">{status}</p>
              </div>
            )}
            
            <div className="bg-gray-900 rounded p-4">
              <h3 className="text-sm font-bold text-white mb-2">How it works:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Icons that fail to load are automatically reported</li>
                <li>• Each item is only reported once per hour to avoid spam</li>
                <li>• Bulk uploads check all items and report missing ones</li>
                <li>• Reports include attempted URLs and context</li>
              </ul>
            </div>
            
            <div className="bg-orange-900/50 border border-orange-500 rounded p-4">
              <p className="text-sm text-orange-200">
                <strong>Note:</strong> Reports are only sent in production unless VITE_LOG_TO_DISCORD_IN_DEV=true in .env.local
              </p>
            </div>
          </div>
        </div>
      </CardContainer>
    </PageContainer>
  );
}