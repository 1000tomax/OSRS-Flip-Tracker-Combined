/**
 * Report Icon Button Component
 * 
 * Allows users to manually report missing icons
 */

import React, { useState } from 'react';
import UI from '@/config/constants';
import { reportFailedIcon } from '../utils/iconReporting';

export default function ReportIconButton({ itemName, className = '' }) {
  const [isReporting, setIsReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const handleReport = async () => {
    if (isReporting || reported) return;
    
    setIsReporting(true);
    
    try {
      const success = await reportFailedIcon(itemName, { 
        source: 'Manual Report',
        username: 'User'
      });
      
      if (success) {
        setReported(true);
        // Show success feedback
        setTimeout(() => {
          setReported(false);
        }, UI.REPORT_FEEDBACK_MS);
      }
    } catch (error) {
      console.error('Error reporting icon:', error);
    } finally {
      setIsReporting(false);
    }
  };

  if (reported) {
    return (
      <span className={`text-green-400 text-xs ${className}`}>
        ✓ Reported
      </span>
    );
  }

  return (
    <button
      onClick={handleReport}
      disabled={isReporting}
      className={`text-xs text-gray-400 hover:text-yellow-400 transition ${className}`}
      title="Report missing icon"
    >
      {isReporting ? '...' : '⚠️'}
    </button>
  );
}
