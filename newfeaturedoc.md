# OSRS Analytics Features Implementation Specification

## 📋 Overview

This document specifies the implementation of two new analytics features for the
OSRS Flip Dashboard:

1. **Trading Activity Heat Map** - Visual representation of trading activity
   across hours and days
2. **Capital Efficiency Dashboard** - Analysis of capital utilization and
   performance metrics

## 🎨 Visual Design Reference

The mockup shows the complete visual design and layout. Key design elements:

- Dark theme matching existing dashboard (gray-900 backgrounds, gray-600
  borders)
- OSRS-inspired styling with gradient backgrounds
- Yellow accent color (#eab308) for primary actions
- Green (#22c55e) for positive metrics, Red (#ef4444) for negative, Blue
  (#3b82f6) for neutral

## 📊 Data Requirements

### Expected CSV Data Structure

```javascript
// Each flip record should contain:
{
  completedAt: "2024-01-15T14:30:00Z",     // ISO timestamp (required)
  buyPrice: 1500000,                        // Purchase price in GP (required)
  sellPrice: 1650000,                       // Sale price in GP (required)
  profit: 150000,                           // sellPrice - buyPrice
  itemName: "Dragon Bones",                 // Item being flipped
  quantity: 100,                            // Number of items (optional)
  startedAt: "2024-01-15T12:00:00Z",       // Buy timestamp (optional, for hold time)
  category: "Prayer"                        // Item category (optional)
}
```

### Derived Calculations

```javascript
// Calculate these fields if missing:
roi = (profit / buyPrice) * 100;
holdTimeMinutes = (completedAt - startedAt) / (1000 * 60); // if startedAt available
dayOfWeek = new Date(completedAt).getDay(); // 0=Sunday, 6=Saturday
hourOfDay = new Date(completedAt).getHours(); // 0-23
```

## 🗂️ File Structure

```
src/
├── pages/
│   ├── TradingHeatMap.jsx           # Heat map page component
│   └── CapitalEfficiency.jsx       # Capital efficiency page component
├── components/
│   ├── analytics/
│   │   ├── HeatMapGrid.jsx         # Heat map visualization
│   │   ├── HeatMapCell.jsx         # Individual heat map cell with tooltip
│   │   ├── MetricCard.jsx          # Reusable metric display card
│   │   ├── InsightCard.jsx         # Insight/recommendation card
│   │   ├── FlipComparison.jsx      # Fast vs slow flip comparison
│   │   └── PerformanceBreakdown.jsx # Category performance analysis
│   └── layouts/
│       └── (existing layout components)
├── hooks/
│   ├── useHeatMapData.js           # Heat map data processing
│   ├── useCapitalEfficiency.js    # Capital efficiency calculations
│   └── useFlipData.js              # (existing flip data hook)
└── utils/
    ├── analyticsCalculations.js    # Core calculation functions
    └── (existing utils)
```

## 🔥 Feature 1: Trading Activity Heat Map

### Page Component: `src/pages/TradingHeatMap.jsx`

```javascript
// Key features:
- Date range selector (7, 30, 60, 90 days)
- Metric selector (profit, volume, flips, ROI, GP/hour)
- Heat map grid visualization
- Peak performance insights
- Actionable recommendations
- Mobile responsive design
```

### Core Components:

#### HeatMapGrid (`src/components/analytics/HeatMapGrid.jsx`)

- 7x24 grid (days × hours)
- Color intensity based on selected metric
- Hover tooltips showing exact values
- Responsive design (collapsible on mobile)

#### HeatMapCell (`src/components/analytics/HeatMapCell.jsx`)

- Individual cell with color coding
- Tooltip on hover with day, time, and value
- Click to drill down (future enhancement)

### Heat Map Calculations:

```javascript
// Data aggregation by hour/day
function aggregateHeatMapData(flips, metric, dateRange) {
  // Filter flips by date range
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - dateRange);
  const relevantFlips = flips.filter(
    flip => new Date(flip.completedAt) >= cutoffDate
  );

  // Initialize 7x24 grid
  const heatMap = {};
  for (let day = 0; day < 7; day++) {
    heatMap[day] = {};
    for (let hour = 0; hour < 24; hour++) {
      heatMap[day][hour] = {
        profit: 0,
        volume: 0,
        flips: 0,
        totalRoi: 0,
        count: 0,
      };
    }
  }

  // Aggregate data
  relevantFlips.forEach(flip => {
    const day = new Date(flip.completedAt).getDay();
    const hour = new Date(flip.completedAt).getHours();
    const cell = heatMap[day][hour];

    cell.profit += flip.profit || 0;
    cell.volume += flip.buyPrice || 0;
    cell.flips += 1;
    cell.totalRoi += flip.roi || 0;
    cell.count += 1;
  });

  // Calculate averages
  Object.keys(heatMap).forEach(day => {
    Object.keys(heatMap[day]).forEach(hour => {
      const cell = heatMap[day][hour];
      if (cell.count > 0) {
        cell.avgRoi = cell.totalRoi / cell.count;
        cell.gpPerHour = cell.profit; // Simplified GP/hour
      }
    });
  });

  return heatMap;
}

// Color intensity calculation
function getIntensityColor(value, maxValue) {
  if (value === 0) return 'bg-gray-700';
  const intensity = value / maxValue;
  if (intensity < 0.2) return 'bg-green-900';
  if (intensity < 0.4) return 'bg-green-800';
  if (intensity < 0.6) return 'bg-green-600';
  if (intensity < 0.8) return 'bg-green-500';
  return 'bg-green-400';
}
```

### Insights Generation:

```javascript
function calculateHeatMapInsights(heatMapData, metric) {
  let bestHour = { hour: 0, value: 0 };
  let bestDay = { day: 0, value: 0 };
  const dayTotals = new Array(7).fill(0);

  // Find peak hour and day
  Object.keys(heatMapData).forEach(day => {
    Object.keys(heatMapData[day]).forEach(hour => {
      const value = heatMapData[day][hour][metric] || 0;
      dayTotals[day] += value;

      if (value > bestHour.value) {
        bestHour = { hour: parseInt(hour), value };
      }
    });
  });

  dayTotals.forEach((total, day) => {
    if (total > bestDay.value) {
      bestDay = { day, value: total };
    }
  });

  return { bestHour, bestDay, dayTotals };
}
```

## ⚡ Feature 2: Capital Efficiency Dashboard

### Page Component: `src/pages/CapitalEfficiency.jsx`

Key sections:

- Time period selector
- Key metrics cards (4 metrics)
- Fast vs slow flip comparison
- Category performance breakdown

### Core Metrics:

#### 1. Capital Velocity

```javascript
// Flips per day
function calculateCapitalVelocity(flips, timePeriodDays) {
  return flips.length / timePeriodDays;
}
```

#### 2. ROI per GP Invested

```javascript
function calculateROIPerGP(flips) {
  const totalCapital = flips.reduce(
    (sum, flip) => sum + (flip.buyPrice || 0),
    0
  );
  const totalProfit = flips.reduce((sum, flip) => sum + (flip.profit || 0), 0);
  return totalCapital > 0 ? (totalProfit / totalCapital) * 100 : 0;
}
```

#### 3. Average Hold Time

```javascript
function calculateAvgHoldTime(flips) {
  const flipsWithHoldTime = flips.filter(flip => flip.holdTimeMinutes);
  if (flipsWithHoldTime.length === 0) return 0;

  const totalHoldTime = flipsWithHoldTime.reduce(
    (sum, flip) => sum + flip.holdTimeMinutes,
    0
  );
  return totalHoldTime / flipsWithHoldTime.length / 60; // Convert to hours
}
```

#### 4. Success Rate

```javascript
function calculateSuccessRate(flips) {
  const profitableFlips = flips.filter(flip => (flip.profit || 0) > 0);
  return flips.length > 0 ? (profitableFlips.length / flips.length) * 100 : 0;
}
```

### Fast vs Slow Flip Analysis:

```javascript
function analyzeFlipTypes(flips) {
  const fastThreshold = 120; // 2 hours in minutes
  const slowThreshold = 360; // 6 hours in minutes

  const fastFlips = flips.filter(
    flip => flip.holdTimeMinutes && flip.holdTimeMinutes <= fastThreshold
  );
  const slowFlips = flips.filter(
    flip => flip.holdTimeMinutes && flip.holdTimeMinutes > slowThreshold
  );

  function analyzeGroup(groupFlips) {
    if (groupFlips.length === 0) return null;

    const totalProfit = groupFlips.reduce(
      (sum, flip) => sum + (flip.profit || 0),
      0
    );
    const totalCapital = groupFlips.reduce(
      (sum, flip) => sum + (flip.buyPrice || 0),
      0
    );
    const avgRoi = totalCapital > 0 ? (totalProfit / totalCapital) * 100 : 0;
    const avgGpPerHour =
      groupFlips.reduce((sum, flip) => {
        const hours = (flip.holdTimeMinutes || 60) / 60;
        return sum + (flip.profit || 0) / hours;
      }, 0) / groupFlips.length;
    const successRate =
      (groupFlips.filter(flip => (flip.profit || 0) > 0).length /
        groupFlips.length) *
      100;

    return {
      count: groupFlips.length,
      avgRoi: avgRoi.toFixed(1),
      avgGpPerHour: Math.round(avgGpPerHour),
      successRate: successRate.toFixed(0),
      avgCapital: Math.round(totalCapital / groupFlips.length),
    };
  }

  return {
    fast: analyzeGroup(fastFlips),
    slow: analyzeGroup(slowFlips),
  };
}
```

### Category Performance Analysis:

```javascript
function analyzeCategoryPerformance(flips) {
  const categories = {};

  flips.forEach(flip => {
    const category = flip.category || 'Other';
    if (!categories[category]) {
      categories[category] = {
        totalProfit: 0,
        totalCapital: 0,
        flips: 0,
        items: new Set(),
      };
    }

    categories[category].totalProfit += flip.profit || 0;
    categories[category].totalCapital += flip.buyPrice || 0;
    categories[category].flips += 1;
    categories[category].items.add(flip.itemName);
  });

  // Convert to array and calculate ROI
  return Object.entries(categories)
    .map(([name, data]) => ({
      name,
      totalProfit: data.totalProfit,
      avgRoi:
        data.totalCapital > 0
          ? (data.totalProfit / data.totalCapital) * 100
          : 0,
      flipCount: data.flips,
      uniqueItems: data.items.size,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
}
```

## 🧩 Reusable Components

### MetricCard (`src/components/analytics/MetricCard.jsx`)

```javascript
// Props: title, value, subtitle, icon, change, color
// Used for the 4 main metrics in capital efficiency dashboard
// Shows large number with trend indicator
```

### InsightCard (`src/components/analytics/InsightCard.jsx`)

```javascript
// Props: type (green/yellow/blue/red), title, description, priority
// Used for recommendations and insights
// Color-coded based on priority/type
```

### FlipComparison (`src/components/analytics/FlipComparison.jsx`)

```javascript
// Side-by-side comparison of fast vs slow flips
// 2x2 grid showing ROI, GP/hour, success rate, avg capital
// Color-coded (green for fast, blue for slow)
```

## 🔧 Integration Points

### Navigation Updates

Add new nav items to existing navigation:

```javascript
// In src/components/Navigation.jsx
const navItems = [
  // ... existing items ...
  { path: '/analytics/heatmap', label: 'Heat Map', icon: '🔥' },
  { path: '/analytics/efficiency', label: 'Efficiency', icon: '⚡' },
];
```

### Router Updates

```javascript
// In src/App.jsx or router configuration
import TradingHeatMap from './pages/TradingHeatMap';
import CapitalEfficiency from './pages/CapitalEfficiency';

// Add routes:
<Route path="/analytics/heatmap" element={<TradingHeatMap />} />
<Route path="/analytics/efficiency" element={<CapitalEfficiency />} />
```

### Homepage Cards

Add navigation cards to homepage:

```javascript
// Analytics preview cards for main dashboard
const analyticsCards = [
  {
    to: '/analytics/heatmap',
    title: 'Trading Activity Heat Map',
    description: 'Discover your optimal trading times and patterns',
    icon: '🔥',
    gradient: 'from-red-600/20 to-orange-600/20',
    linkColor: 'text-red-400',
  },
  {
    to: '/analytics/efficiency',
    title: 'Capital Efficiency Dashboard',
    description: 'Analyze capital utilization and performance',
    icon: '⚡',
    gradient: 'from-yellow-600/20 to-amber-600/20',
    linkColor: 'text-yellow-400',
  },
];
```

## 📱 Mobile Responsiveness

### Breakpoint Strategy:

- **Mobile (< 768px)**: Single column layout, collapsible heat map
- **Tablet (768px - 1024px)**: 2-column grid for metrics
- **Desktop (> 1024px)**: Full 4-column layout

### Mobile Heat Map:

- Show day overview with mini heat bars
- Tap day to expand detailed hourly view
- Swipe navigation between days

### CSS Classes:

```css
/* Use existing Tailwind responsive classes */
.grid-cols-1 md:grid-cols-2 lg:grid-cols-4  /* Metrics */
.grid-cols-1 lg:grid-cols-2                 /* Main sections */
.hidden md:block                            /* Desktop-only elements */
.md:hidden                                  /* Mobile-only elements */
```

## 🎯 Key Implementation Notes

1. **Data Processing**: All calculations should handle missing/null values
   gracefully
2. **Performance**: Use React.useMemo for expensive calculations
3. **Error Handling**: Show fallback UI when no data available
4. **Loading States**: Display loading spinners during data processing
5. **Accessibility**: Proper ARIA labels and keyboard navigation
6. **Testing**: Unit tests for calculation functions

## 🚀 Development Priority

1. **Phase 1**: Heat map basic implementation
2. **Phase 2**: Capital efficiency metrics
3. **Phase 3**: Insights and recommendations
4. **Phase 4**: Mobile optimization
5. **Phase 5**: Performance optimization and testing

## 💡 Future Enhancements

- Export heat map as image
- Custom date range picker
- Item-specific heat maps
- Profit velocity trending
- Goal setting and progress tracking

---

This specification provides everything needed to implement both analytics
features using the existing CSV flip data structure. Focus on the calculations
that work with available data and provide genuine trading insights.
