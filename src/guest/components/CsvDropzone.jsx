import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function CsvDropzone({ onFileSelect, onDemoLoad }) {
  const onDrop = useCallback(
    acceptedFiles => {
      const file = acceptedFiles[0];
      if (file && file.name.endsWith('.csv')) {
        onFileSelect(file);
      } else {
        // eslint-disable-next-line no-alert
        window.alert('Please upload a flips.csv file from Flipping Copilot');
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  return (
    <div>
      {/* Important notice about Show Buying */}
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4">
        <p className="text-red-200 text-sm">
          <strong>⚠️ Important:</strong> "Show Buying" must be <strong>disabled</strong> in Flipping
          Copilot settings before exporting. Only completed flips should be included in your export.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-16 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="text-6xl mb-4">📁</div>
        <p className="text-xl mb-2">
          {isDragActive ? 'Drop your flips.csv here...' : 'Drag & drop your flips.csv here'}
        </p>
        <p className="text-gray-400">or click to select file</p>
        <p className="text-sm text-gray-500 mt-4">Export from Flipping Copilot RuneLite plugin</p>

        {/* Browser compatibility note */}
        <p className="text-xs text-gray-600 mt-6">
          Works best in Chrome on desktop. Mobile and other browsers may have issues.
        </p>
      </div>

      {/* Demo Data Option */}
      <div className="mt-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">or</span>
          </div>
        </div>

        <button
          onClick={onDemoLoad}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 inline-flex items-center gap-2"
        >
          <span>📊</span>
          Load Demo Data
        </button>
        <p className="text-sm text-gray-500 mt-2">
          Explore with sample trading data to see all features
        </p>
      </div>
    </div>
  );
}
