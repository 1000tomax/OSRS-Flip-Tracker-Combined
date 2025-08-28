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

    try {
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

      setStep('processing');
      const startTime = Date.now();

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
        if (e.data.type === 'PROGRESS') {
          setProcessingStats({
            rowsProcessed: e.data.rowsProcessed,
            totalRows: e.data.totalRows,
          });

          // Add breadcrumb for processing progress
          if (e.data.rowsProcessed % 10000 === 0) {
            Sentry.addBreadcrumb({
              category: 'processing',
              message: `Processed ${e.data.rowsProcessed} rows`,
              level: 'info',
            });
          }
        } else if (e.data.type === 'COMPLETE') {
          const processingTime = Date.now() - startTime;

          // Track successful upload with anonymized stats
          guestAnalytics.uploadCompleted(
            e.data.stats?.totalFlips || e.data.result.totalFlips || 0,
            processingTime,
            e.data.meta?.accountCount || 1
          );

          // Add success context to Sentry
          Sentry.setContext('upload_success', {
            totalFlips: e.data.stats?.totalFlips || e.data.result.totalFlips || 0,
            processingTime: `${processingTime}ms`,
            accountCount: e.data.meta?.accountCount || 1,
            uniqueItems: e.data.stats?.uniqueItems || 0,
          });

          Sentry.addBreadcrumb({
            category: 'upload',
            message: 'File processing completed successfully',
            level: 'info',
          });

          setGuestData(e.data.result);
          setStep('complete');
          worker.terminate(); // Clean up worker

          // Navigate to guest dashboard
          // eslint-disable-next-line no-magic-numbers
          setTimeout(() => navigate('/guest/dashboard'), 500);
        } else if (e.data.type === 'ERROR') {
          // Determine error type for analytics
          const errorType = e.data.message.includes('Show Buying')
            ? 'show_buying_enabled'
            : e.data.message.includes('format')
              ? 'invalid_format'
              : 'processing_error';

          // Capture error with context
          Sentry.captureException(new Error(e.data.message), {
            tags: {
              error_type: errorType,
              component: 'csv_processor',
            },
            contexts: {
              upload_attempt: {
                fileSize: file.size,
                fileName: file.name,
                error: e.data.message,
              },
            },
          });

          guestAnalytics.uploadFailed(errorType);

          // eslint-disable-next-line no-alert
          window.alert(`Error processing CSV: ${e.data.message}`);
          setStep('upload');
          worker.terminate(); // Clean up worker
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
