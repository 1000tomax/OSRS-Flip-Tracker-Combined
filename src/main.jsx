import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster richColors closeButton position="top-right" />
  </React.StrictMode>
);
// Force rebuild Sat, Aug 16, 2025  1:54:50 PM
// Cache bust: Sat, Aug 16, 2025  2:17:09 PM
