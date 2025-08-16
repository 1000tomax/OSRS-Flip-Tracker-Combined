// src/main.jsx - Simple and stable without React Query
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.working.jsx';

// Simple main.jsx without React Query complexity
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
// Force rebuild Sat, Aug 16, 2025  1:54:50 PM
// Cache bust: Sat, Aug 16, 2025  2:17:09 PM
