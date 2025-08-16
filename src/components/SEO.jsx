import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../utils/analytics';

const SEO_CONFIG = {
  default: {
    title: 'OSRS Flip Dashboard | Advanced Trading Analytics & Performance Tracking',
    description:
      'Professional Old School RuneScape trading dashboard with real-time flip tracking, profit analysis, strategy comparison, and comprehensive performance metrics. Track your GP/hour, ROI, and trading efficiency.',
    keywords:
      'OSRS, Old School RuneScape, flipping, trading, dashboard, analytics, profit tracker, GP tracker, ROI calculator, merching, Grand Exchange',
  },
  '/': {
    title: 'OSRS Flip Dashboard | Trading Analytics Home',
    description:
      'Advanced Old School RuneScape trading dashboard with real-time analytics, profit tracking, and performance insights. Start tracking your flipping success today.',
    keywords:
      'OSRS dashboard, RuneScape trading, flip tracker, profit analytics, Grand Exchange tracker',
  },
  '/daily': {
    title: 'Daily Trading View | OSRS Flip Dashboard',
    description:
      'View your daily Old School RuneScape trading performance with detailed flip logs, profit summaries, and interactive charts for each trading day.',
    keywords:
      'OSRS daily trades, daily profit tracking, flip logs, trading history, daily analytics',
  },
  '/stats': {
    title: 'Full Item Statistics | OSRS Flip Dashboard',
    description:
      'Comprehensive item-by-item trading statistics for Old School RuneScape. Analyze profit margins, success rates, and performance across all traded items.',
    keywords:
      'OSRS item stats, trading statistics, profit by item, item analysis, flip success rates',
  },
  '/charts': {
    title: 'Trading Charts & Analytics | OSRS Flip Dashboard',
    description:
      'Visual analytics and performance charts for your Old School RuneScape trading activity. Track trends, patterns, and optimize your flipping strategy.',
    keywords:
      'OSRS trading charts, profit charts, performance analytics, trading trends, flip visualization',
  },
  '/volume': {
    title: 'Volume Analysis & Strategy Battle | OSRS Flip Dashboard',
    description:
      'Compare high-volume vs high-value trading strategies in Old School RuneScape. Analyze which approach yields better GP/hour performance.',
    keywords:
      'OSRS volume analysis, trading strategies, high volume vs high value, strategy comparison, GP per hour',
  },
  '/performance': {
    title: 'Performance Tracking | OSRS Flip Dashboard',
    description:
      'Track your Old School RuneScape trading performance over time with detailed velocity metrics, profit trends, and efficiency analysis.',
    keywords:
      'OSRS performance tracking, trading velocity, profit trends, efficiency metrics, long-term analysis',
  },
};

const SEO = ({ title, description, keywords, noIndex = false }) => {
  const location = useLocation();

  useEffect(() => {
    // Get route-specific config or fallback to default
    const routeConfig = SEO_CONFIG[location.pathname] || SEO_CONFIG.default;

    // Use prop values or fallback to route config
    const finalTitle = title || routeConfig.title;
    const finalDescription = description || routeConfig.description;
    const finalKeywords = keywords || routeConfig.keywords;

    // Update document title
    document.title = finalTitle;

    // Update or create meta description
    updateMetaTag('name', 'description', finalDescription);
    updateMetaTag('name', 'keywords', finalKeywords);
    updateMetaTag('property', 'og:title', finalTitle);
    updateMetaTag('property', 'og:description', finalDescription);
    updateMetaTag('property', 'twitter:title', finalTitle);
    updateMetaTag('property', 'twitter:description', finalDescription);

    // Handle noIndex
    if (noIndex) {
      updateMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      updateMetaTag('name', 'robots', 'index, follow');
    }

    // Update canonical URL
    const canonicalUrl = `https://osrs-flip-dashboard.vercel.app${location.pathname}`;
    updateCanonicalUrl(canonicalUrl);

    // Track page view for analytics
    analytics.trackPageView({
      page_title: finalTitle,
      page_location: canonicalUrl,
      page_path: location.pathname,
    });
  }, [location.pathname, title, description, keywords, noIndex]);

  return null; // This component doesn't render anything
};

// Helper function to update meta tags
function updateMetaTag(attribute, name, content) {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);

  if (element) {
    element.setAttribute('content', content);
  } else {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    element.setAttribute('content', content);
    document.getElementsByTagName('head')[0].appendChild(element);
  }
}

// Helper function to update canonical URL
function updateCanonicalUrl(url) {
  let canonical = document.querySelector('link[rel="canonical"]');

  if (canonical) {
    canonical.setAttribute('href', url);
  } else {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', url);
    document.getElementsByTagName('head')[0].appendChild(canonical);
  }
}

export default SEO;
