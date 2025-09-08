import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster richColors closeButton position="top-right" />
    {/* Only load analytics in production and if not excluded */}
    {import.meta.env.PROD &&
      !localStorage.getItem('exclude-analytics') &&
      !window.location.hostname.includes('localhost') && <Analytics />}
  </React.StrictMode>
);
// Force rebuild Sat, Aug 16, 2025  1:54:50 PM
// Cache bust: Sat, Aug 16, 2025  2:17:09 PM
