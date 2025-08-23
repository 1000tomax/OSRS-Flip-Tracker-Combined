import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      includeAssets: ['flipping-copilot-logo.png', 'icon-192.png', 'icon-512.png'],
      manifest: false, // use the static /public/manifest.json
      injectRegister: 'auto',
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: null, // Disable navigate fallback to prevent caching issues
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.(json|csv)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'data-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 30, // 30 minutes
              },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@/components': path.resolve(__dirname, '../src/components'),
      '@/pages': path.resolve(__dirname, '../src/pages'),
      '@/hooks': path.resolve(__dirname, '../src/hooks'),
      '@/utils': path.resolve(__dirname, '../src/utils'),
      '@/types': path.resolve(__dirname, '../src/types'),
    },
  },

  build: {
    // Target modern browsers for better optimization
    target: 'es2020',

    // Use esbuild for minification instead of terser to avoid TDZ issues
    minify: 'esbuild',

    // Only enable sourcemaps when explicitly requested
    // eslint-disable-next-line no-undef
    sourcemap: process.env.SOURCEMAP === 'true',

    rollupOptions: {
      output: {
        // Better chunking strategy to avoid React initialization issues
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['papaparse', 'html2canvas-pro', 'sonner'],
        },

        // Optimize chunk file names - cache bust
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

    // Optimize chunk sizes - increased limit since we're splitting intelligently
    chunkSizeWarningLimit: 800,

    // Source maps enabled temporarily for debugging (will be disabled after testing)

    // CSS code splitting
    cssCodeSplit: true,

    // Preload modules
    modulePreload: {
      polyfill: true,
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'papaparse'],
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
