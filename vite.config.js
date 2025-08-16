import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // Bundle analyzer - generates stats.html
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'treemap', 'sunburst', 'network'
    }),

    // PWA capabilities for offline support
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['flipping-copilot-logo.png'],
      manifest: {
        name: 'OSRS Flip Dashboard',
        short_name: 'FlipDash',
        description: 'Old School RuneScape Flip Trading Dashboard',
        theme_color: '#1f2937',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: '/flipping-copilot-logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^\/data\/.*\.csv$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'csv-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
          {
            urlPattern: /^\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'json-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },

  build: {
    // Target modern browsers for better optimization
    target: 'es2020',

    // Optimize output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },

    rollupOptions: {
      output: {
        // Improved chunking strategy
        manualChunks: id => {
          // Vendor chunk for core dependencies
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('@tanstack')) {
              return 'tanstack';
            }
            if (id.includes('papaparse') || id.includes('html2canvas')) {
              return 'utils';
            }
            // Other vendor libraries
            return 'vendor';
          }

          // App chunks by feature
          if (id.includes('/pages/')) {
            return 'pages';
          }
          if (id.includes('/components/')) {
            return 'components';
          }
          if (id.includes('/hooks/')) {
            return 'hooks';
          }
          if (id.includes('/utils/')) {
            return 'utils-app';
          }
        },

        // Optimize chunk file names
        chunkFileNames: chunkInfo => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId) {
            return 'assets/[name]-[hash].js';
          }
          return 'assets/chunk-[hash].js';
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Optimize chunk sizes
    chunkSizeWarningLimit: 500,

    // Source maps only in development
    sourcemap: process.env.NODE_ENV === 'development',

    // CSS code splitting
    cssCodeSplit: true,

    // Preload modules
    modulePreload: {
      polyfill: true,
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'recharts',
      'papaparse',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },

  // Dev server optimizations
  server: {
    port: 3000,
    open: true,
    // Enable HTTP/2 for better performance
    https: false,
    // Optimize HMR
    hmr: {
      overlay: false,
    },
  },
});
