// src/hooks/useVirtualScroll.js - Virtual scrolling for large datasets
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

export function useVirtualScroll({
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  overscan = 5,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount, items.length);

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      index: visibleRange.start + index,
      style: {
        position: 'absolute',
        top: (visibleRange.start + index) * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0,
      },
    }));
  }, [items, visibleRange, itemHeight]);

  const handleScroll = useCallback(e => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const scrollToIndex = useCallback(
    index => {
      if (scrollElementRef.current) {
        const targetScrollTop = index * itemHeight;
        scrollElementRef.current.scrollTop = targetScrollTop;
        setScrollTop(targetScrollTop);
      }
    },
    [itemHeight]
  );

  const scrollProps = {
    ref: scrollElementRef,
    style: {
      height: containerHeight,
      overflow: 'auto',
    },
    onScroll: handleScroll,
  };

  const containerProps = {
    style: {
      height: totalHeight,
      position: 'relative',
    },
  };

  return {
    scrollProps,
    containerProps,
    visibleItems,
    scrollToIndex,
    totalHeight,
    isScrolled: scrollTop > 0,
  };
}

// Hook for infinite scroll with pagination
export function useInfiniteScroll({
  hasMore = false,
  loading = false,
  onLoadMore,
  threshold = 0.8, // Load more when 80% scrolled
}) {
  const [element, setElement] = useState(null);

  const handleScroll = useCallback(() => {
    if (!element || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage >= threshold) {
      onLoadMore?.();
    }
  }, [element, loading, hasMore, threshold, onLoadMore]);

  useEffect(() => {
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [element, handleScroll]);

  const ref = useCallback(node => {
    if (node) setElement(node);
  }, []);

  return { ref };
}
