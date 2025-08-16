# OSRS Flip Dashboard

Personal dashboard for tracking my Old School RuneScape flipping challenge from 1K GP to max cash (2.147B GP).

## Features

### Pages
- **Home** - Daily summary overview and item leaderboards
- **Items** - Item analytics with profitability rankings and search
- **Flip Logs** - Complete transaction history with filtering
- **Charts** - Interactive profit trends and performance visualizations
- **Volume** - Strategy comparison and detailed item breakdowns

### Analytics
- Daily/weekly profit tracking and summaries
- Item profitability rankings with ML-based similarity search
- ROI calculations and trend analysis
- Net worth progression and ETA calculations
- Trading volume analysis across different strategies

## Tech Stack

- **React 19** with Vite and React Router
- **TailwindCSS 4.x** for styling
- **Recharts** for data visualization
- **TanStack Query** for data fetching
- **PapaParse** for CSV processing
- **ML embeddings** for item similarity matching

## Development

```bash
npm install
npm run dev           # Start dev server
npm run build         # Build for production
npm run build:data    # Process data files only
```

## Data Pipeline

1. Export flip data from Flipping Copilot RuneLite plugin
2. Process CSV files into optimized JSON with Node.js scripts
3. Generate item embeddings for similarity search
4. Deploy static files to Vercel

Data is stored in `/public/data/` as pre-processed JSON/CSV files for fast loading.

## Project Structure

```
public/data/
├── daily-summary/     # Daily performance summaries
├── processed-flips/   # Historical flip data by date
├── item-embeddings.json
├── item-stats.csv
└── meta.json

src/
├── components/        # UI components
├── hooks/            # Data loading hooks
├── lib/              # Utils and configurations
└── pages/            # Route components

scripts/              # Data processing scripts
```

