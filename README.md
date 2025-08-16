# OSRS Flip Dashboard 📈

A professional Old School RuneScape trading analytics dashboard built with React and modern web technologies. Track your flipping performance, analyze profit trends, and optimize your trading strategies with comprehensive data visualization and advanced caching.

![OSRS Flip Dashboard](https://img.shields.io/badge/OSRS-Flip%20Dashboard-blue)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Enabled-blue)
![Vite](https://img.shields.io/badge/Vite-7.0.6-purple)
![PWA](https://img.shields.io/badge/PWA-Ready-green)

## ✨ Features

### 📊 **Trading Analytics**
- **Daily Trading Logs** - Detailed flip-by-flip analysis with profit tracking
- **Item Statistics** - Comprehensive ROI and performance metrics per item
- **Performance Charts** - Visual trends and velocity analysis
- **Strategy Battle** - Compare high-volume vs high-value trading approaches
- **Profit Velocity** - Track GP/hour and trading efficiency over time

### 🚀 **Technical Excellence**
- **Progressive Web App** - Install on mobile/desktop with offline support
- **Advanced Caching** - Multi-layer caching for lightning-fast performance
- **Responsive Design** - Optimized for all screen sizes and devices
- **TypeScript Integration** - Type-safe development with gradual migration
- **Bundle Optimization** - Code splitting and optimized chunks for fast loading

### 🎯 **User Experience**
- **Real-time Data** - Auto-refreshing trading information
- **Search & Filtering** - Find specific items and trading days instantly
- **Accessibility** - WCAG compliant with keyboard navigation and screen readers
- **Dark Theme** - Professional OSRS-inspired color scheme
- **SEO Optimized** - Dynamic meta tags and search engine friendly

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/osrs-flip-dashboard.git
cd osrs-flip-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Development Commands

```bash
# Development
npm run dev              # Start dev server with HMR
npm run dev:host         # Start dev server accessible on network

# Building
npm run build            # Production build
npm run build:analyze    # Build with bundle analyzer
npm run preview          # Preview production build

# Testing
npm test                 # Run test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run typecheck        # TypeScript type checking

# Data Processing
npm run build:data       # Build embeddings and summary index
```

## 📁 Project Structure

```
osrs-flip-dashboard/
├── public/                     # Static assets
│   ├── data/                  # Trading data files
│   │   ├── processed-flips/   # Daily flip CSV files
│   │   ├── item-stats.csv     # Aggregated item statistics
│   │   └── summary-index.json # Data index
│   └── manifest.json          # PWA manifest
├── src/
│   ├── components/            # React components
│   │   ├── layouts/          # Reusable layout components
│   │   ├── charts/           # Chart components
│   │   └── ui/               # Basic UI components
│   ├── pages/                # Page components (route handlers)
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   │   ├── cacheManager.ts   # Advanced caching system
│   │   ├── dateUtils.ts      # Date manipulation utilities
│   │   └── analytics.ts      # Privacy-focused analytics
│   ├── types/                # TypeScript type definitions
│   └── tests/                # Test files and utilities
├── docs/                     # Documentation
└── scripts/                  # Build and data processing scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Development
VITE_DEV_MODE=true
VITE_API_BASE_URL=http://localhost:3000

# Analytics (optional)
VITE_ANALYTICS_ID=your-analytics-id

# Feature Flags
VITE_ENABLE_CACHE_MONITOR=true
VITE_ENABLE_PWA=true
```

### Cache Configuration

The application uses a sophisticated multi-layer caching system:

```typescript
// Adjust cache settings in src/utils/cacheManager.ts
export const flipDataCache = new CacheManager({
  namespace: 'flip-data',
  ttl: 60 * 60 * 1000,        // 1 hour
  maxEntries: 50,
  storage: 'localStorage',     // 'memory' | 'localStorage' | 'indexedDB'
});
```

## 📊 Data Format

### CSV Data Structure

**Daily Flip Files** (`/data/processed-flips/YYYY/MM/DD/flips.csv`):
```csv
item_name,opened_time,closed_time,spent,received_post_tax,closed_quantity,status
Abyssal whip,2025-01-15T10:30:00Z,2025-01-15T11:45:00Z,2500000,2750000,1,FINISHED
```

**Item Statistics** (`/data/item-stats.csv`):
```csv
item_name,flips,total_profit,total_spent,roi_percent,avg_profit_per_flip,last_flipped
Abyssal whip,25,1250000,62500000,2.0,50000,2025-01-15
```

### Adding New Data

1. **Process Raw Data**: Use the provided scripts to convert raw trading logs
2. **Update Index**: Run `npm run build:data` to update the summary index
3. **Verify Format**: Ensure CSV headers match expected format
4. **Test Import**: Check that new data appears in the dashboard

## 🧪 Testing

### Test Structure
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: Hook and data flow tests  
- **E2E Tests**: Complete user journey tests (planned)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test useApiData.test.tsx

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Production Build

```bash
# Create optimized production build
npm run build

# Test production build locally
npm run preview
```

### Deployment Platforms

**Vercel (Recommended)**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Netlify**:
```bash
# Build command: npm run build
# Publish directory: dist
```

### PWA Installation

After deployment, users can install the dashboard as a Progressive Web App:
- **Desktop**: Click install button in address bar
- **Mobile**: Add to Home Screen from browser menu
- **Offline**: Cached data available without internet connection

## 🔍 Monitoring & Analytics

### Performance Monitoring

- **Cache Hit Rates**: Monitor via cache monitor (Ctrl+Shift+C in dev)
- **Bundle Analysis**: Run `npm run build:analyze` to visualize bundle size
- **Lighthouse**: Audit performance, accessibility, and SEO scores

### Privacy-Focused Analytics

The dashboard includes privacy-conscious analytics:
- No personal data collection
- Local-only tracking in development
- Aggregated performance metrics only
- Full user control over data

## 🐛 Troubleshooting

### Common Issues

**Build Errors**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Data Loading Issues**:
```bash
# Rebuild data index
npm run build:data

# Check data format and file paths
```

**Performance Issues**:
- Enable cache monitor to identify bottlenecks
- Check network tab for large data files
- Verify service worker is active

### Debug Mode

Enable detailed logging:
```typescript
// Set in localStorage
localStorage.setItem('debug', 'osrs:*');
```

## 📚 Additional Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design and patterns
- **[Development Guide](./docs/DEVELOPMENT.md)** - Detailed development setup
- **[API Reference](./docs/API.md)** - Component and hook documentation
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Happy Flipping! 🪙✨**

*Built with ❤️ for the OSRS trading community*
