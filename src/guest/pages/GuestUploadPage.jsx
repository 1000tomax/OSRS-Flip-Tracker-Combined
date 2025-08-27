import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestData } from '../contexts/GuestDataContext';
import CsvDropzone from '../components/CsvDropzone';
import ProcessingStatus from '../components/ProcessingStatus';

export default function GuestUploadPage() {
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'complete'
  const { guestData, setGuestData, processingStats, setProcessingStats } = useGuestData();
  const navigate = useNavigate();

  // If user already has data and came back to upload page
  const hasExistingData = !!guestData;

  const handleFileSelect = async file => {
    // If they have existing data, confirm replacement
    if (hasExistingData) {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm('This will replace your current data. Continue?');
      if (!confirmed) return;
    }

    setStep('processing');

    // Get browser timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Create Web Worker
    const worker = new Worker(new URL('../../workers/guestProcessor.worker.js', import.meta.url), {
      type: 'module',
    });

    // Handle messages from worker
    worker.onmessage = e => {
      if (e.data.type === 'PROGRESS') {
        setProcessingStats({
          rowsProcessed: e.data.rowsProcessed,
          totalRows: e.data.totalRows,
        });
      } else if (e.data.type === 'COMPLETE') {
        setGuestData(e.data.result);
        setStep('complete');
        worker.terminate(); // Clean up worker

        // Navigate to guest dashboard
        // eslint-disable-next-line no-magic-numbers
        setTimeout(() => navigate('/guest/dashboard'), 500);
      } else if (e.data.type === 'ERROR') {
        // eslint-disable-next-line no-alert
        window.alert(`Error processing CSV: ${e.data.message}`);
        setStep('upload');
        worker.terminate(); // Clean up worker
      }
    };

    // Handle worker errors
    worker.onerror = error => {
      // eslint-disable-next-line no-alert
      window.alert(`Processing error: ${error.message}`);
      setStep('upload');
      worker.terminate();
    };

    // Handle message errors (malformed messages)
    worker.onmessageerror = event => {
      console.error('Worker message error:', event);
      // eslint-disable-next-line no-alert
      window.alert('An error occurred while processing. Please try again.');
      setStep('upload');
      worker.terminate();
    };

    // Start processing with timezone
    worker.postMessage({ type: 'START', file, timezone });
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
