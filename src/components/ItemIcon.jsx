/**
 * ItemIcon Component
 *
 * Displays OSRS item icons with lazy loading and error handling.
 * Fetches icons from the OSRS Wiki and caches them for performance.
 */

import React, { useState, useEffect, useRef } from 'react';
import { getValidatedIconUrl } from '../utils/itemIcons';
import { reportFailedIcon } from '../utils/iconReporting';
import ReportIconButton from './ReportIconButton';

/**
 * ItemIcon Component
 * @param {string} itemName - The name of the item
 * @param {number} size - Icon size in pixels (default: 24)
 * @param {string} className - Additional CSS classes
 * @param {boolean} lazy - Enable lazy loading (default: true)
 * @param {function} onError - Callback when icon fails to load
 */
export default function ItemIcon({ itemName, size = 24, className = '', lazy = true, onError }) {
  const [iconUrl, setIconUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const containerRef = useRef(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    // Only set up observer if lazy loading is enabled
    if (!lazy) return;

    // If ref isn't ready yet, skip setup (effect will run again on next render)
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before visible
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [lazy]);

  // Fetch icon when visible
  useEffect(() => {
    if (!isVisible || !itemName) return;

    let cancelled = false;

    async function fetchIcon() {
      setLoading(true);
      setError(false);

      try {
        const url = await getValidatedIconUrl(itemName);

        if (!cancelled) {
          if (url) {
            setIconUrl(url);
            setError(false);
          } else {
            setError(true);
            // Automatically report failed icon (throttled)
            reportFailedIcon(itemName, { source: 'Automatic Detection' });
            // Call onError callback if provided
            if (onError) onError();
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching icon:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchIcon();

    return () => {
      cancelled = true;
    };
  }, [itemName, isVisible, onError]);

  // Don't render anything if there's an error or no item name
  if (!itemName || error) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div
        ref={containerRef}
        className={`inline-block bg-gray-700 rounded animate-pulse ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        aria-label="Loading icon..."
      />
    );
  }

  // Render icon
  return iconUrl ? (
    <img
      ref={containerRef}
      src={iconUrl}
      alt={`${itemName} icon`}
      className={`inline-block object-contain ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
      loading={lazy ? 'lazy' : 'eager'}
      onError={() => setError(true)}
      decoding="async"
    />
  ) : null;
}

/**
 * ItemWithIcon Component
 *
 * Convenience component that displays an item name with its icon.
 * Used in tables and lists for consistent formatting.
 */
export function ItemWithIcon({
  itemName,
  size = 24,
  className = '',
  textClassName = '',
  showReportButton = false,
}) {
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ItemIcon itemName={itemName} size={size} onError={() => setIconFailed(true)} />
      <span className={textClassName}>{itemName}</span>
      {showReportButton && iconFailed && <ReportIconButton itemName={itemName} />}
    </div>
  );
}
