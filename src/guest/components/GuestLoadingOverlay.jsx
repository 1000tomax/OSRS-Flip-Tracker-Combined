import React from 'react';
import PropTypes from 'prop-types';

export default function GuestLoadingOverlay({ show = false, message = 'Loading…' }) {
  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div className="bg-gray-900/90 border border-gray-700 rounded-xl px-6 py-5 shadow-2xl flex items-center gap-4">
        <div
          className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
          aria-label="Loading spinner"
        />
        <div className="text-gray-200 font-medium">{message}</div>
      </div>
    </div>
  );
}

GuestLoadingOverlay.propTypes = {
  show: PropTypes.bool,
  message: PropTypes.string,
};
