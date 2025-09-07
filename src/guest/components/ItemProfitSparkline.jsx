import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from 'recharts';

/**
 * ItemProfitSparkline
 * Small inline sparkline for recent profits of an item.
 * Expects data in the form: [{ x: number, profit: number }]
 */
export default function ItemProfitSparkline({ data = [], height = 28, stroke = '#3b82f6', lazy = true }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(!lazy);

  useEffect(() => {
    if (!lazy || !containerRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      });
    }, { rootMargin: '150px' });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [lazy]);

  if (!Array.isArray(data) || data.length === 0) {
    return <div ref={containerRef} className="h-7 w-full bg-gray-700 rounded" aria-label="No sparkline data" />;
  }

  if (!isVisible) {
    return <div ref={containerRef} className="h-7 w-full bg-gray-700/70 rounded" aria-label="Sparkline placeholder" />;
  }

  return (
    <div ref={containerRef} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            cursor={false}
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: 'white',
              padding: '4px 8px',
            }}
            formatter={value => [
              `${Number(value || 0).toLocaleString()} GP`,
              'Profit',
            ]}
            labelFormatter={label => `Flip #${label + 1}`}
          />
          <Line
            type="monotone"
            dataKey="profit"
            dot={false}
            stroke={stroke}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

ItemProfitSparkline.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number,
      profit: PropTypes.number,
    })
  ),
  height: PropTypes.number,
  stroke: PropTypes.string,
  lazy: PropTypes.bool,
};
