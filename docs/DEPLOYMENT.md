# Deployment Guide 🚀

Complete guide for deploying the OSRS Flip Dashboard to production environments.

## 📋 Table of Contents

- [Production Build](#production-build)
- [Deployment Platforms](#deployment-platforms)
- [Environment Configuration](#environment-configuration)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Analytics](#monitoring--analytics)
- [Troubleshooting](#troubleshooting)

## 🏗️ Production Build

### Build Process

```bash
# 1. Install dependencies
npm ci --only=production

# 2. Generate data files
npm run build:data

# 3. Create production build
npm run build

# 4. Test production build locally
npm run preview
```

### Build Optimization

The build process includes several optimizations:

```javascript
// vite.config.js optimizations
export default defineConfig({
  build: {
    target: 'es2020',           // Modern browser support
    minify: 'terser',          // Advanced minification
    sourcemap: false,          // No source maps in production
    cssCodeSplit: true,        // Split CSS for caching
    chunkSizeWarningLimit: 500, // Warn on large chunks
    
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'charts': ['recharts'],
          'tanstack': ['@tanstack/react-query'],
          'utils': ['papaparse', 'html2canvas'],
        }
      }
    }
  }
});
```

### Build Output

```
dist/
├── index.html                 # Main HTML file
├── manifest.webmanifest       # PWA manifest
├── registerSW.js             # Service worker registration
├── sw.js                     # Service worker
├── workbox-*.js              # Workbox runtime
├── assets/
│   ├── index-*.css          # Bundled CSS
│   ├── index-*.js           # Main application bundle
│   ├── chunk-*.js           # Code-split chunks
│   └── *.woff2              # Font files
└── data/                    # Data files (copied from public/)
```

## 🌐 Deployment Platforms

### Vercel (Recommended)

Vercel provides the best experience for React applications with automatic deployments.

#### Initial Setup

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel
```

#### Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite",
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api|data|_next|static|favicon.ico|sw.js|manifest.webmanifest).*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Environment Variables

Set in Vercel dashboard:

```env
# Production settings
VITE_NODE_ENV=production
VITE_API_BASE_URL=https://your-domain.vercel.app

# Feature flags
VITE_ENABLE_PWA=true
VITE_ENABLE_CACHE_MONITOR=false
VITE_ENABLE_ANALYTICS=true

# Analytics (if using)
VITE_ANALYTICS_ID=your-analytics-id
```

#### Automatic Deployments

```bash
# Connect repository for automatic deployments
vercel --prod

# Deploy specific branch
vercel --prod --branch main
```

### Netlify

Alternative platform with similar features.

#### Netlify Configuration

Create `netlify.toml`:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Service-Worker-Allowed = "/"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### AWS S3 + CloudFront

For enterprise deployments with custom domains.

#### S3 Setup

```bash
# 1. Build application
npm run build

# 2. Sync to S3 bucket
aws s3 sync dist/ s3://your-bucket-name --delete

# 3. Configure S3 for static hosting
aws s3 website s3://your-bucket-name \
  --index-document index.html \
  --error-document index.html
```

#### CloudFront Configuration

```json
{
  "Origins": [{
    "DomainName": "your-bucket.s3.amazonaws.com",
    "Id": "S3-your-bucket",
    "S3OriginConfig": {
      "OriginAccessIdentity": ""
    }
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-your-bucket",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "managed-caching-optimized",
    "OriginRequestPolicyId": "managed-cors-s3origin"
  },
  "CustomErrorResponses": [{
    "ErrorCode": 404,
    "ResponseCode": 200,
    "ResponsePagePath": "/index.html"
  }]
}
```

### Traditional Web Hosting

For shared hosting or VPS deployments.

#### Server Configuration

**Apache (.htaccess)**:
```apache
RewriteEngine On
RewriteBase /

# Handle Angular/React Router
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Caching
<filesMatch "\.(css|js|woff2)$">
  Header set Cache-Control "max-age=31536000, public, immutable"
</filesMatch>
```

**Nginx**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Caching
    location ~* \.(css|js|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker
    location = /sw.js {
        add_header Service-Worker-Allowed "/";
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

## ⚙️ Environment Configuration

### Production Environment Variables

Create `.env.production`:

```env
# Build configuration
VITE_NODE_ENV=production
VITE_BUILD_DATE=2025-01-15
VITE_VERSION=1.0.0

# API configuration
VITE_API_BASE_URL=https://your-domain.com
VITE_DATA_BASE_URL=/data

# Feature flags
VITE_ENABLE_PWA=true
VITE_ENABLE_CACHE_MONITOR=false
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_ANALYTICS=true

# Performance
VITE_CACHE_STRATEGY=aggressive
VITE_PRELOAD_CRITICAL_DATA=true

# Analytics
VITE_ANALYTICS_ID=UA-XXXXXXXX-X
VITE_ANALYTICS_DOMAIN=your-domain.com

# Security
VITE_CSP_NONCE=auto-generated
```

### Build-time Variables

Variables available during build:

```typescript
// Access in code
const isProduction = import.meta.env.PROD;
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const buildDate = import.meta.env.VITE_BUILD_DATE;
const version = import.meta.env.VITE_VERSION;
```

## 🎯 Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm run build:analyze

# This generates dist/stats.html
# Open in browser to visualize bundle
```

### Lighthouse Optimization

Target Lighthouse scores:
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

### Performance Checklist

```bash
# 1. Optimize images
# - Use WebP format where possible
# - Compress images < 100KB
# - Use appropriate dimensions

# 2. Minimize JavaScript
npm run build  # Already optimized with Terser

# 3. Enable compression
# - Gzip/Brotli on server
# - Already configured in hosting platforms

# 4. Optimize fonts
# - Preload critical fonts
# - Use font-display: swap

# 5. Minimize CSS
# - Tailwind CSS purging enabled
# - Critical CSS inlined

# 6. Service Worker caching
# - Static assets cached for 1 year
# - Data files cached with smart invalidation
```

### Performance Monitoring

```typescript
// Performance tracking in production
import { analytics } from './utils/analytics';

// Track Core Web Vitals
function trackWebVitals() {
  // First Contentful Paint
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      analytics.trackPerformance('fcp', entry.startTime);
    }
  }).observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    analytics.trackPerformance('lcp', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });
}
```

## 📊 Monitoring & Analytics

### Error Monitoring

Set up error tracking for production:

```typescript
// Global error handler
window.addEventListener('error', (event) => {
  analytics.trackError(event.error, 'global-error');
});

window.addEventListener('unhandledrejection', (event) => {
  analytics.trackError(event.reason, 'unhandled-promise');
});

// React error boundaries
class ProductionErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    analytics.trackError(error, 'react-error-boundary');
  }
}
```

### Performance Monitoring

```typescript
// Track page load performance
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      analytics.trackPerformance('page-load', entry.loadEventEnd);
    }
  }
});
observer.observe({ entryTypes: ['navigation'] });
```

### Analytics Setup

For privacy-conscious analytics:

```typescript
// Use privacy-focused analytics
import { analytics } from './utils/analytics';

// Track only essential metrics
analytics.trackPageView({
  page_title: document.title,
  page_location: window.location.href,
  page_path: window.location.pathname,
});

// Track user interactions
analytics.trackEvent({
  category: 'engagement',
  action: 'search',
  label: 'item-search',
});
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### Build Failures

```bash
# Issue: Out of memory during build
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Issue: Module not found
rm -rf node_modules package-lock.json
npm install
npm run build

# Issue: TypeScript errors
npm run typecheck
# Fix errors before building
```

#### Routing Issues

```bash
# Issue: 404 on page refresh
# Solution: Configure server for SPA routing
# See server configuration examples above

# Issue: Assets not loading
# Check: Base URL configuration in vite.config.js
base: '/your-subdirectory/'  # If deploying to subdirectory
```

#### PWA Issues

```bash
# Issue: Service worker not updating
# Solution: Check cache headers and SW version

# Issue: PWA not installable
# Solution: Verify manifest.json and HTTPS

# Issue: Offline functionality not working
# Solution: Check service worker registration
```

### Health Checks

```bash
# 1. Build verification
npm run build
npm run preview
# Test all routes and functionality

# 2. Performance verification
npm run build:analyze
# Check bundle sizes < 500KB per chunk

# 3. Security verification
# Run security headers check
# Verify CSP, HTTPS, security headers

# 4. Accessibility verification
# Run Lighthouse accessibility audit
# Score should be 100

# 5. SEO verification
# Check meta tags, sitemap, robots.txt
# Lighthouse SEO score should be 100
```

### Production Debugging

```typescript
// Enable production debugging
localStorage.setItem('debug', 'osrs:error,osrs:performance');

// Check service worker status
navigator.serviceWorker.ready.then((registration) => {
  console.log('SW registered:', registration);
});

// Check cache status
import { CacheUtils } from './utils/cacheManager';
console.log('Cache stats:', CacheUtils.getAllStats());
```

### Rollback Strategy

```bash
# Vercel rollback
vercel rollback [deployment-url]

# Netlify rollback
# Use Netlify dashboard to revert to previous deployment

# Manual rollback
# Keep previous build artifacts
# Deploy previous version
```

## 📈 Performance Targets

### Target Metrics

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s

### Bundle Size Targets

- **Initial JavaScript**: < 200KB gzipped
- **Total JavaScript**: < 1MB gzipped
- **CSS**: < 50KB gzipped
- **Images**: < 500KB total

### Caching Targets

- **Cache Hit Rate**: > 80%
- **Service Worker**: 100% static asset coverage
- **CDN**: Global edge caching enabled

## 🔒 Security Checklist

- [ ] HTTPS enabled everywhere
- [ ] Security headers configured
- [ ] Content Security Policy implemented
- [ ] No sensitive data in client code
- [ ] Dependencies security audit passed
- [ ] Error messages don't leak information
- [ ] Analytics respect user privacy

```bash
# Security audit
npm audit
npm audit fix

# Check for vulnerable dependencies
npm audit --audit-level moderate
```

---

This deployment guide ensures your OSRS Flip Dashboard is deployed securely, performantly, and reliably to production. Follow the platform-specific instructions and checklists to achieve optimal results. 🚀