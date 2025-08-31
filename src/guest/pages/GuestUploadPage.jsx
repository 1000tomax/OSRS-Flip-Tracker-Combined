import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestData } from '../contexts/GuestDataContext';
import CsvDropzone from '../components/CsvDropzone';
import ProcessingStatus from '../components/ProcessingStatus';
import { guestAnalytics } from '../../utils/guestAnalytics';
import * as Sentry from '@sentry/react';

export default function GuestUploadPage() {
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'complete'
  const { guestData, setGuestData, processingStats, setProcessingStats } = useGuestData();
  const navigate = useNavigate();

  // Track if user returned with existing data
  useEffect(() => {
    if (guestData) {
      guestAnalytics.returnedToUpload(true);

      // Add breadcrumb for debugging
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: 'User returned to upload with existing data',
        level: 'info',
      });
    }
  }, [guestData]);

  // If user already has data and came back to upload page
  const hasExistingData = !!guestData;

  const handleFileSelect = async file => {
    try {
      // VALIDATION 1: File size check (prevent worker crashes)
      const maxFileSize = 2.5 * 1024 * 1024; // 2.5MB limit (conservative)
      if (file.size > maxFileSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
        
        guestAnalytics.uploadFailed('file_too_large');
        window.alert(
          `File too large: ${fileSizeMB}MB\n` +
          `Maximum allowed: ${maxSizeMB}MB\n\n` +
          `Your file has ${Math.round(file.size / 112).toLocaleString()} estimated rows.\n` +
          `Try exporting a shorter date range (3-6 months) from Flipping Copilot.`
        );
        return;
      }

      // VALIDATION 2: File type check
      if (!file.name.toLowerCase().endsWith('.csv')) {
        guestAnalytics.uploadFailed('invalid_file_type');
        window.alert('Please upload a .csv file from Flipping Copilot');
        return;
      }

      // VALIDATION 3: Basic CSV format check (quick peek)
      const sampleSize = Math.min(file.size, 1024); // Read first 1KB
      const sampleText = await file.slice(0, sampleSize).text();
      const sampleLower = sampleText.toLowerCase();
      
      if (!sampleLower.includes('first buy time') || !sampleLower.includes('last sell time')) {
        guestAnalytics.uploadFailed('not_copilot_csv');
        window.alert(
          'This doesn\'t appear to be a Flipping Copilot export.\n\n' +
          'Make sure you\'re uploading the flips.csv file from the plugin.'
        );
        return;
      }

      // Add breadcrumb for file upload
      Sentry.addBreadcrumb({
        category: 'upload',
        message: `File selected: ${file.size} bytes`,
        level: 'info',
        data: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      });

      // Continue with existing upload logic...
      // If they have existing data, confirm replacement
      if (hasExistingData) {
        // eslint-disable-next-line no-alert
        const confirmed = window.confirm('This will replace your current data. Continue?');
        if (!confirmed) {
          Sentry.addBreadcrumb({
            category: 'action',
            message: 'User cancelled file replacement',
            level: 'info',
          });
          return;
        }

        Sentry.addBreadcrumb({
          category: 'action',
          message: 'User confirmed data replacement',
          level: 'info',
        });
      }

      // Track upload started
      guestAnalytics.uploadStarted();
      const uploadStartTime = Date.now(); // Store for error handling

      setStep('processing');

      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      // Create Web Worker
      const worker = new Worker(
        new URL('../../workers/guestProcessor.worker.js', import.meta.url),
        {
          type: 'module',
        }
      );

      // Handle messages from worker
      worker.onmessage = e => {
        // Handle memory warnings from worker
        if (e.data.type === 'MEMORY_WARNING') {
          console.warn('Worker memory warning:', e.data.message);
          setProcessingStats(prev => ({ 
            ...prev, 
            message: `${prev.message || 'Processing'} (High memory usage - processing slowly)` 
          }));
          return;
        }

        // Handle progress updates
        if (e.data.type === 'PROGRESS') {
          setProcessingStats(e.data.progress || {
            rowsProcessed: e.data.rowsProcessed,
            totalRows: e.data.totalRows,
          });

          // Add breadcrumb for processing progress
          if ((e.data.progress?.current || e.data.rowsProcessed) % 10000 === 0) {
            Sentry.addBreadcrumb({
              category: 'processing',
              message: `Processed ${e.data.progress?.current || e.data.rowsProcessed} rows`,
              level: 'info',
            });
          }
          return;
        }

        // Handle successful completion
        if (e.data.type === 'SUCCESS' || e.data.type === 'COMPLETE') {
          // Handle both new and old data structures
          const rawData = e.data.data || e.data.result;
          const flipsByDate = rawData.flipsByDate || {};
          const itemStats = rawData.itemStats || [];
          
          // Calculate totals from the data
          const totalProfit = itemStats.reduce((sum, item) => sum + (item.totalProfit || 0), 0);
          const totalFlips = itemStats.reduce((sum, item) => sum + (item.flipCount || 0), 0);
          const uniqueItems = itemStats.length;
          
          // Create daily summaries from flipsByDate
          const dailySummaries = Object.entries(flipsByDate)
            .map(([date, dayData]) => ({
              date,
              totalProfit: dayData.totalProfit || (dayData.flips?.reduce((sum, f) => sum + (f.profit || 0), 0) || 0),
              flipCount: dayData.totalFlips || dayData.flips?.length || 0,
              uniqueItems: new Set(dayData.flips?.map(f => f.item) || []).size,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

          const processedData = {
            flipsByDate,
            itemStats,
            dailySummaries,
            totalProfit,
            totalFlips,
            uniqueItems,
            timezone,
            accounts: rawData.accounts || [],
            allFlips: rawData.allFlips || [],
            metadata: {
              ...(rawData.metadata || {}),
              processedAt: new Date().toISOString(),
              userTimezone: timezone,
              accounts: rawData.accounts || [],
              accountCount: rawData.accounts?.length || rawData.metadata?.accountCount || 1,
              dateRange: {
                from: dailySummaries[0]?.date,
                to: dailySummaries[dailySummaries.length - 1]?.date,
              },
            },
          };

          setGuestData(processedData);
          guestAnalytics.uploadCompleted(
            e.data.data?.totalRows || e.data.result?.totalFlips || 0,
            Date.now() - uploadStartTime,
            e.data.data?.accounts?.length || 1
          );

          setStep('complete');
          worker.terminate();
          
          // Navigate to guest dashboard
          // eslint-disable-next-line no-magic-numbers
          setTimeout(() => navigate('/guest/dashboard'), 500);
          return;
        }

        // Handle errors with enhanced context
        if (e.data.type === 'ERROR') {
          console.error('Worker error:', e.data);
          
          // Enhanced Sentry error reporting
          Sentry.captureException(new Error(e.data.message), {
            tags: {
              error_type: 'worker_processing_error',
              component: 'guest_csv_processor',
              severity: 'high',
            },
            contexts: {
              file_info: {
                size: file.size,
                name: file.name,
                estimated_rows: Math.round(file.size / 112),
              },
              error_details: {
                message: e.data.message,
                stack: e.data.stack,
                line: e.data.line,
                column: e.data.column,
              },
            },
          });

          guestAnalytics.uploadFailed('worker_error');

          window.alert(`Processing failed: ${e.data.message}`);
          setStep('upload');
          worker.terminate();
          return;
        }
      };

      // Handle worker errors
      worker.onerror = error => {
        // Capture worker crash
        Sentry.captureException(error, {
          tags: {
            error_type: 'worker_crash',
            component: 'web_worker',
          },
          contexts: {
            file_info: {
              size: file.size,
              name: file.name,
            },
          },
        });

        guestAnalytics.uploadFailed('worker_error');
        // eslint-disable-next-line no-alert
        window.alert(`Processing error: ${error.message}`);
        setStep('upload');
        worker.terminate();
      };

      // Handle message errors (malformed messages)
      worker.onmessageerror = event => {
        // Capture message error
        Sentry.captureException(new Error('Worker message error'), {
          tags: {
            error_type: 'worker_message_error',
            component: 'web_worker',
          },
          contexts: {
            file_info: {
              size: file.size,
              name: file.name,
            },
            event_data: event.data,
          },
        });

        guestAnalytics.uploadFailed('message_error');
        console.error('Worker message error:', event);
        // eslint-disable-next-line no-alert
        window.alert('An error occurred while processing. Please try again.');
        setStep('upload');
        worker.terminate();
      };

      // Start processing with timezone
      worker.postMessage({ type: 'START', file, timezone });
    } catch (error) {
      // Capture any other errors
      Sentry.captureException(error, {
        tags: {
          component: 'upload_handler',
        },
        contexts: {
          file_info: {
            size: file.size,
            name: file.name,
          },
        },
      });

      // Track general error
      guestAnalytics.uploadFailed(error.message || 'unknown_error');
      setStep('upload');
      console.error('Upload error:', error);
      // eslint-disable-next-line no-alert
      window.alert('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-2 text-white">Upload Your Flips</h1>
      <p className="text-gray-400 mb-8">
        Upload your flips.csv export from the Flipping Copilot RuneLite plugin
      </p>

      {/* Show option to return to dashboard if data exists */}
      {hasExistingData && step === 'upload' && (
        <div className="mb-6 p-4 bg-blue-900/50 border border-blue-500 rounded-lg">
          <p className="text-blue-200">
            You already have data loaded.
            <button
              onClick={() => navigate('/guest/dashboard')}
              className="ml-2 underline hover:text-white"
            >
              Return to dashboard
            </button>{' '}
            or upload a new file below.
          </p>
        </div>
      )}

      {step === 'upload' && <CsvDropzone onFileSelect={handleFileSelect} />}

      {step === 'processing' && <ProcessingStatus stats={processingStats} />}

      {step === 'complete' && (
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">Processing Complete!</h2>
          <p className="text-gray-400">Redirecting to your dashboard...</p>
        </div>
      )}
    </div>
  );
}
