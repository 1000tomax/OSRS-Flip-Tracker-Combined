import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import CsvDropzone from '../components/CsvDropzone';
import ProcessingStatus from '../components/ProcessingStatus';
import { guestAnalytics } from '../utils/guestAnalytics';
import { toast } from 'sonner';

export default function UploadPage() {
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'complete'
  const { guestData, setGuestData, processingStats, setProcessingStats } = useData();
  const navigate = useNavigate();

  // Track if user returned with existing data
  useEffect(() => {
    if (guestData) {
      guestAnalytics.returnedToUpload(true);

      // Debug breadcrumb stub:
      // console.debug('Returned to upload with existing data');
    }
  }, [guestData]);

  // If user already has data and came back to upload page
  const hasExistingData = !!guestData;

  const handleDemoLoad = async () => {
    try {
      setStep('processing');
      guestAnalytics.uploadStarted('demo_data');

      // Fetch the demo CSV file
      const response = await fetch('/flips.csv');
      if (!response.ok) {
        throw new Error('Failed to load demo data');
      }

      const csvText = await response.text();

      // Create a virtual file object from the CSV text
      const demoFile = new File([csvText], 'demo-flips.csv', { type: 'text/csv' });

      // Process it like a regular file upload
      await processFile(demoFile, true);
    } catch (error) {
      console.error('Demo data loading failed:', error);
      guestAnalytics.uploadFailed('demo_load_error');
      toast.error('Failed to load demo data. Please try again.');
      setStep('upload');
    }
  };

  const processFile = async (file, isDemoData = false) => {
    try {
      // Skip validations for demo data
      if (!isDemoData) {
        // VALIDATION 1: File size check (prevent worker crashes)
        const maxFileSize = 20 * 1024 * 1024; // 20MB limit
        if (file.size > maxFileSize) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
          const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);

          guestAnalytics.uploadFailed('file_too_large');
          toast.error(
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
          toast.error('Please upload a .csv file from Flipping Copilot');
          return;
        }

        // VALIDATION 3: Basic CSV format check (quick peek)
        const sampleSize = Math.min(file.size, 1024); // Read first 1KB
        const sampleText = await file.slice(0, sampleSize).text();
        const sampleLower = sampleText.toLowerCase();

        if (!sampleLower.includes('first buy time') || !sampleLower.includes('last sell time')) {
          guestAnalytics.uploadFailed('not_copilot_csv');
          toast.error(
            "This doesn't appear to be a Flipping Copilot export.\n\n" +
              "Make sure you're uploading the flips.csv file from the plugin."
          );
          return;
        }
      }

      // console.debug('File selected', { name: file.name, size: file.size, type: file.type });

      // Continue with existing upload logic...
      // If they have existing data, confirm replacement
      if (hasExistingData) {
        // eslint-disable-next-line no-alert
        const confirmed = window.confirm('This will replace your current data. Continue?');
        if (!confirmed) {
          // console.debug('User cancelled file replacement');
          return;
        }
        // console.debug('User confirmed data replacement');
      }

      // Track upload started (unless it's demo data, already tracked)
      if (!isDemoData) {
        guestAnalytics.uploadStarted();
      }
      const uploadStartTime = Date.now(); // Store for error handling

      setStep('processing');

      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      // Create Web Worker
      const worker = new Worker(new URL('../workers/guestProcessor.worker.js', import.meta.url), {
        type: 'module',
      });

      // Handle messages from worker
      worker.onmessage = e => {
        // Handle memory warnings from worker
        if (e.data.type === 'MEMORY_WARNING') {
          console.warn('Worker memory warning:', e.data.message);
          setProcessingStats(prev => ({
            ...prev,
            message: `${prev.message || 'Processing'} (High memory usage - processing slowly)`,
          }));
          return;
        }

        // Handle progress updates
        if (e.data.type === 'PROGRESS') {
          setProcessingStats(
            e.data.progress || {
              rowsProcessed: e.data.rowsProcessed,
              totalRows: e.data.totalRows,
            }
          );

          // Add breadcrumb for processing progress
          // Periodic debug: console.debug('Processed rows', e.data.progress?.current || e.data.rowsProcessed);
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

          // Calculate total tax paid from all flips
          const totalTax = Object.values(flipsByDate).reduce((sum, dayData) => {
            const flips = Array.isArray(dayData) ? dayData : dayData?.flips || [];
            return sum + flips.reduce((daySum, f) => daySum + (f.sellerTax || f.tax || 0), 0);
          }, 0);

          // Create daily summaries from flipsByDate
          const dailySummaries = Object.entries(flipsByDate)
            .map(([date, dayData]) => ({
              date,
              totalProfit:
                dayData.totalProfit ||
                dayData.flips?.reduce((sum, f) => sum + (f.profit || 0), 0) ||
                0,
              flipCount: dayData.totalFlips || dayData.flips?.length || 0,
              uniqueItems: new Set(dayData.flips?.map(f => f.item) || []).size,
            }))
            .sort((a, b) => {
              // Sort dates properly considering year (MM-DD-YYYY format)
              const [aMonth, aDay, aYear] = a.date.split('-');
              const [bMonth, bDay, bYear] = b.date.split('-');
              const dateA = new Date(aYear, aMonth - 1, aDay);
              const dateB = new Date(bYear, bMonth - 1, bDay);
              return dateA - dateB;
            });

          // Map allFlips to have consistent field names for query builder
          const allFlips = (rawData.allFlips || []).map(flip => ({
            ...flip,
            // Map field names to what the query builder expects
            quantity: flip.quantity || flip.bought || flip.sold || 0,
            avgBuyPrice: flip.avgBuyPrice || flip.avg_buy_price || 0,
            avgSellPrice: flip.avgSellPrice || flip.avg_sell_price || 0,
            firstBuyTime: flip.firstBuyTime || flip.first_buy_time,
            lastSellTime: flip.lastSellTime || flip.last_sell_time,
            sellerTax: flip.sellerTax || flip.tax || 0,
            // Calculate derived fields
            spent:
              (flip.avgBuyPrice || flip.avg_buy_price || 0) * (flip.quantity || flip.bought || 0),
            revenue:
              (flip.avgSellPrice || flip.avg_sell_price || 0) * (flip.quantity || flip.sold || 0),
            hoursHeld: (() => {
              const buyTime = flip.firstBuyTime || flip.first_buy_time;
              const sellTime = flip.lastSellTime || flip.last_sell_time;
              if (buyTime && sellTime) {
                const hours = (new Date(sellTime) - new Date(buyTime)) / (1000 * 60 * 60);
                return Math.round(hours * 10) / 10;
              }
              return 0;
            })(),
            roi: (() => {
              const spent =
                (flip.avgBuyPrice || flip.avg_buy_price || 0) * (flip.quantity || flip.bought || 0);
              return spent > 0 ? ((flip.profit || 0) / spent) * 100 : 0;
            })(),
            date: flip.date || flip.last_sell_time?.split('T')[0],
          }));

          const processedData = {
            flipsByDate,
            itemStats,
            dailySummaries,
            totalProfit,
            totalFlips,
            uniqueItems,
            totalTax,
            timezone,
            accounts: rawData.accounts || [],
            allFlips,
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

          // Navigate to dashboard
          // eslint-disable-next-line no-magic-numbers
          setTimeout(() => navigate('/dashboard'), 500);
          return;
        }

        // Handle errors with enhanced context
        if (e.data.type === 'ERROR') {
          console.error('Worker error:', e.data);

          // console.error('Worker processing error', e.data);

          guestAnalytics.uploadFailed('worker_error');

          toast.error(`Processing failed: ${e.data.message}`);
          setStep('upload');
          worker.terminate();
          return;
        }
      };

      // Handle worker errors
      worker.onerror = error => {
        // Log worker crash
        console.error('Worker crash', error);

        guestAnalytics.uploadFailed('worker_error');
        toast.error(`Processing error: ${error.message}`);
        setStep('upload');
        worker.terminate();
      };

      // Handle message errors (malformed messages)
      worker.onmessageerror = event => {
        // Log message error
        console.error('Worker message error', event);

        guestAnalytics.uploadFailed('message_error');
        console.error('Worker message error:', event);
        toast.error('An error occurred while processing. Please try again.');
        setStep('upload');
        worker.terminate();
      };

      // Start processing with timezone
      worker.postMessage({ type: 'START', file, timezone });
    } catch (error) {
      // Log any other errors
      console.error('Upload handler error', error);

      // Track general error
      guestAnalytics.uploadFailed(error.message || 'unknown_error');
      setStep('upload');
      console.error('Upload error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  const handleFileSelect = async file => {
    await processFile(file, false);
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
              onClick={() => navigate('/dashboard')}
              className="ml-2 underline hover:text-white"
            >
              Return to dashboard
            </button>{' '}
            or upload a new file below.
          </p>
        </div>
      )}

      {step === 'upload' && (
        <CsvDropzone onFileSelect={handleFileSelect} onDemoLoad={handleDemoLoad} />
      )}

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
