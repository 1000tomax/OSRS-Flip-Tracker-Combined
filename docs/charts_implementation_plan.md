# Charts Implementation Planning Document

## 🎯 Overview

Implementation plan for data visualization dashboard for the OSRS 1K to Max Cash
flipping challenge. Focus on actionable insights and motivational progress
tracking using existing data structure.

## 📊 Chart Priorities & Phases

### Phase 1: Core Dashboard (Weekend Priority)

**Essential charts for immediate impact:**

1. **Net Worth Progress Line Chart** ⭐
   - **Purpose:** Main goal visualization - 1K to 2.147B journey
   - **Data:** Daily summary `net_worth` over time
   - **Impact:** Most motivating chart, shows overall progress
   - **Implementation:** Simple line chart with golden gradient area fill

2. **Daily Profit Bar Chart** ⭐
   - **Purpose:** Spot best/worst days, performance consistency
   - **Data:** Daily summary `profit` values
   - **Impact:** Easy to understand, good for sharing screenshots
   - **Implementation:** Bar chart with green/red coloring for positive/negative

3. **Top 10 Items by Total Profit** ⭐
   - **Purpose:** Identify most profitable items to focus on
   - **Data:** Item stats `total_profit`, top 10 items
   - **Impact:** Actionable insights for strategy optimization
   - **Implementation:** Horizontal bar chart, sorted descending

### Phase 2: Advanced Analytics (Later)

4. **Weekday Performance Analysis** 🧮
   - **Purpose:** Optimize flipping schedule efficiency
   - **Data:** Daily profit normalized by starting cash stack
   - **Formula:** `Daily Profit / Starting Cash Stack * 1M = Profit per 1M GP`
   - **Implementation:** Bar chart by day of week
   - **Insight:** Shows which days you flip most efficiently

5. **Flip Volume vs Daily Profit** 📈
   - **Purpose:** Validate high-volume strategy
   - **Data:** Daily `flips` count vs `profit`
   - **Implementation:** Scatter plot with trend line
   - **Insight:** Proves more flips = more money

6. **Progress Milestones** 🎯
   - **Purpose:** Goal tracking and celebration
   - **Data:** Net worth with milestone markers (10M, 50M, 100M, etc.)
   - **Implementation:** Line chart with milestone annotations
   - **Impact:** Gamification and motivation

### Phase 3: Deep Insights (Future)

7. **Item Category Breakdown**
   - **Data:** Profit by item type (Dragons, Barrows, consumables)
   - **Implementation:** Pie chart or treemap

8. **Monthly Growth Rate**
   - **Data:** Month-over-month profit acceleration
   - **Implementation:** Line chart with percentage change

9. **Average Flip Duration by Item**
   - **Data:** Flip logs with buy/sell timestamps
   - **Implementation:** Bar chart showing time to complete flips

## 🛠 Technical Implementation

### Chart Library: Recharts

**Why Recharts:**

- React-native integration
- Responsive by default
- Good documentation and examples
- Simpler than D3, more powerful than basic charts

**Installation:**

```bash
npm install recharts
```

### Data Flow Architecture

```
Daily Summary JSON → React Query → Chart Component → Recharts
```

### Page Structure: `/charts`

**Layout:**

- **Desktop:** 2-column grid with featured chart spanning full width
- **Mobile:** Single column stack
- **Navigation:** Add "📈 Charts" to main navigation

### Chart Layout Plan

```
┌─────────────────────────────────────┐
│     Net Worth Progress (Full)       │
├──────────────────┬──────────────────┤
│   Daily Profit   │   Top Items      │
├──────────────────┼──────────────────┤
│   Weekday Perf   │   Milestones     │
└──────────────────┴──────────────────┘
```

### Responsive Design

**Breakpoints:**

- **Mobile (< 640px):** Single column, smaller charts
- **Tablet (640px - 1024px):** 2-column grid
- **Desktop (> 1024px):** Full layout with optimal spacing

**Mobile Considerations:**

- Touch-friendly tooltips
- Larger text sizes
- Horizontal scroll for wide data
- Simplified chart legends

### Data Transformations

#### Net Worth Progress

```javascript
const netWorthData = summaries.map(day => ({
  date: day.date,
  netWorth: day.net_worth,
  progress: (day.net_worth / 2147483647) * 100,
}));
```

#### Daily Profit

```javascript
const profitData = summaries.map(day => ({
  date: day.date,
  profit: day.profit,
  color: day.profit >= 0 ? '#22c55e' : '#ef4444',
}));
```

#### Weekday Analysis

```javascript
const weekdayData = summaries
  .map(day => {
    const dayOfWeek = new Date(day.date).toLocaleDateString('en-US', {
      weekday: 'long',
    });
    const efficiency = (day.profit / day.starting_net_worth) * 1000000; // Per 1M GP
    return { day: dayOfWeek, efficiency };
  })
  .reduce((acc, curr) => {
    // Group by day and average
  });
```

## 🎨 Design System

### Color Palette

- **Primary:** Gold/Yellow theme (`#fbbf24`, `#f59e0b`)
- **Success:** Green (`#22c55e`)
- **Danger:** Red (`#ef4444`)
- **Neutral:** Gray scale (`#6b7280`, `#374151`)

### Chart Styling

- **Consistent margins:** 20px all around
- **Grid lines:** Subtle gray (`#374151`)
- **Tooltips:** Dark background with white text
- **Responsive text:** Scale with container size

### Animation

- **Smooth transitions:** 300ms ease-in-out
- **Loading states:** Skeleton screens while data loads
- **Hover effects:** Highlight data points and bars

## 📱 Mobile Optimization

### Chart Adaptations

- **Simplified legends:** Icons instead of text where possible
- **Touch targets:** Minimum 44px for interactive elements
- **Scroll hints:** Indicate when charts are horizontally scrollable
- **Reduced data density:** Show fewer data points on small screens

### Performance

- **Lazy loading:** Load charts as user scrolls
- **Data sampling:** Reduce data points for complex charts on mobile
- **Image fallbacks:** Static chart images for very small screens

## 🚀 Implementation Strategy

### Weekend Sprint Plan

**Day 1:**

1. Install Recharts
2. Create `/charts` page structure
3. Implement Net Worth Progress chart
4. Add basic responsive layout

**Day 2:**

1. Daily Profit bar chart
2. Top Items horizontal bars
3. Polish responsive design
4. Add to main navigation

### Future Enhancements

- **Interactive filtering:** Date ranges, item categories
- **Export functionality:** Download charts as images
- **Comparison tools:** Compare time periods
- **Real-time updates:** Auto-refresh when new data available

## 🎯 Success Metrics

### User Engagement

- Time spent on charts page
- Most viewed charts
- Mobile vs desktop usage patterns

### Functionality

- Chart load times
- Responsive breakpoint effectiveness
- Data accuracy validation

### Community Impact

- Screenshot sharing frequency
- Community discussion of insights
- Strategy optimization based on charts

## 💡 Future Chart Ideas

### Advanced Visualizations

- **Heat maps:** Profit by day of week + time of day
- **Sankey diagrams:** Cash flow through different items
- **Candlestick charts:** Daily high/low profit ranges
- **Geographic maps:** If server location data becomes available

### Interactive Features

- **Drill-down capability:** Click day to see individual flips
- **Comparison mode:** Overlay multiple time periods
- **Annotation system:** Mark important events/strategy changes

## 📋 Technical Debt Considerations

### Performance

- **Chart rendering optimization** for large datasets
- **Memory management** for real-time updates
- **Bundle size** monitoring with chart library

### Accessibility

- **Screen reader support** for chart data
- **Keyboard navigation** for interactive elements
- **High contrast mode** compatibility

### Browser Support

- **Fallback handling** for older browsers
- **Canvas vs SVG** performance testing
- **Mobile browser** compatibility verification

---

## 📝 Implementation Notes

**Created:** Chart planning session **Priority:** Phase 1 charts for weekend
implementation **Dependencies:** Recharts library, existing React Query setup
**Estimated Time:** 2-3 development sessions

**Key Insight:** Focus on motivation and actionable insights rather than complex
analytics. Start with simple, impactful charts that enhance the flipping
experience and provide clear value to users.
