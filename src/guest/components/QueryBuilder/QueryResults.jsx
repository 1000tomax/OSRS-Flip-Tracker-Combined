import { 
  formatGP, 
  formatNumber, 
  formatPercent,
  formatItemName 
} from '../../../utils/formatUtils';
import SortableTable from '../../../components/SortableTable';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function QueryResults({ data, displayConfig }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">No results found</p>
        <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
      </div>
    );
  }
  
  // Handle different display types
  switch(displayConfig?.type) {
    case 'bar_chart':
      return <BarChartDisplay data={data} config={displayConfig} />;
    case 'line_chart':
      return <LineChartDisplay data={data} config={displayConfig} />;
    case 'pie_chart':
      return <PieChartDisplay data={data} config={displayConfig} />;
    case 'single_value':
      return <SingleValueDisplay data={data} config={displayConfig} />;
    case 'table':
    default:
      return <TableDisplay data={data} />;
  }
}

function TableDisplay({ data }) {
  // Prepare columns based on data structure
  const columns = [];
  
  if (data.length > 0) {
    const sample = data[0];
    
    // Define columns with proper formatting
    if ('item' in sample) {
      columns.push({
        key: 'item',
        label: 'Item',
        sortable: true,
        format: (value) => formatItemName(value)
      });
    }
    
    if ('profit' in sample) {
      columns.push({
        key: 'profit',
        label: 'Profit',
        sortable: true,
        format: (value) => formatGP(value || 0),
        className: (value) => value >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'
      });
    }
    
    if ('roi' in sample) {
      columns.push({
        key: 'roi',
        label: 'ROI',
        sortable: true,
        format: (value) => value ? `${value.toFixed(1)}%` : '0%',
        className: (value) => value >= 15 ? 'text-green-400' : value >= 5 ? 'text-yellow-400' : 'text-gray-400'
      });
    }
    
    if ('quantity' in sample) {
      columns.push({
        key: 'quantity',
        label: 'Quantity',
        sortable: true,
        format: (value) => formatNumber(value || 0)
      });
    }
    
    if ('date' in sample) {
      columns.push({
        key: 'date',
        label: 'Date',
        sortable: true,
        format: (value) => value ? new Date(value).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }) : 'Unknown'
      });
    }
    
    if ('avgBuyPrice' in sample) {
      columns.push({
        key: 'avgBuyPrice',
        label: 'Buy Price',
        sortable: true,
        format: (value) => formatGP(value || 0)
      });
    }
    
    if ('avgSellPrice' in sample) {
      columns.push({
        key: 'avgSellPrice',
        label: 'Sell Price',
        sortable: true,
        format: (value) => formatGP(value || 0)
      });
    }
    
    // Add computed fields if present
    if ('profitVelocity' in sample) {
      columns.push({
        key: 'profitVelocity',
        label: 'Profit/Hour',
        sortable: true,
        format: (value) => formatGP(value || 0)
      });
    }
    
    if ('marginPercent' in sample) {
      columns.push({
        key: 'marginPercent',
        label: 'Margin %',
        sortable: true,
        format: (value) => value ? `${value.toFixed(1)}%` : '0%',
        className: (value) => value >= 20 ? 'text-green-400' : value >= 10 ? 'text-yellow-400' : 'text-gray-400'
      });
    }
    
    if ('daysSinceFlip' in sample) {
      columns.push({
        key: 'daysSinceFlip',
        label: 'Days Ago',
        sortable: true,
        format: (value) => value === 0 ? 'Today' : value === 1 ? 'Yesterday' : `${value} days ago`
      });
    }
    
    if ('hoursHeld' in sample) {
      columns.push({
        key: 'hoursHeld',
        label: 'Hours Held',
        sortable: true,
        format: (value) => value ? `${value.toFixed(1)}h` : '0h'
      });
    }
    
    if ('spent' in sample) {
      columns.push({
        key: 'spent',
        label: 'Total Spent',
        sortable: true,
        format: (value) => formatGP(value || 0)
      });
    }
    
    if ('revenue' in sample) {
      columns.push({
        key: 'revenue',
        label: 'Total Revenue',
        sortable: true,
        format: (value) => formatGP(value || 0)
      });
    }
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Results ({data.length} items)</h3>
      </div>
      <div className="overflow-x-auto">
        <SortableTable
          columns={columns}
          data={data}
          className="w-full"
        />
      </div>
    </div>
  );
}

function BarChartDisplay({ data, config }) {
  // Limit to top 20 items for readability
  const chartData = data.slice(0, 20).map(item => ({
    name: item[config.xAxis || 'item'] || 'Unknown',
    value: item[config.yAxis || 'profit'] || 0
  }));
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        {config.title || `Results (${data.length} items)`}
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF"
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis 
            stroke="#9CA3AF"
            tickFormatter={(value) => formatGP(value)}
          />
          <Tooltip 
            formatter={(value) => formatGP(value)}
            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          <Bar dataKey="value" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineChartDisplay({ data, config }) {
  const chartData = data.map(item => ({
    name: item[config.xAxis || 'date'] || 'Unknown',
    value: item[config.yAxis || 'profit'] || 0
  }));
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        {config.title || `Results (${data.length} items)`}
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF"
          />
          <YAxis 
            stroke="#9CA3AF"
            tickFormatter={(value) => formatGP(value)}
          />
          <Tooltip 
            formatter={(value) => formatGP(value)}
            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ fill: '#10B981' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartDisplay({ data, config }) {
  // Limit to top 8 items and group the rest as "Others"
  const topItems = data.slice(0, 8);
  const otherItems = data.slice(8);
  
  const chartData = topItems.map(item => ({
    name: item[config.xAxis || 'item'] || 'Unknown',
    value: Math.abs(item[config.yAxis || 'profit'] || 0)
  }));
  
  if (otherItems.length > 0) {
    const othersValue = otherItems.reduce((sum, item) => 
      sum + Math.abs(item[config.yAxis || 'profit'] || 0), 0
    );
    chartData.push({
      name: `Others (${otherItems.length})`,
      value: othersValue
    });
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        {config.title || `Results (${data.length} items)`}
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => formatGP(value)}
            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
            labelStyle={{ color: '#F3F4F6' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function SingleValueDisplay({ data, config }) {
  // Calculate the aggregate value
  let value = 0;
  const field = config.yAxis || 'profit';
  
  if (config.aggregation === 'sum' || !config.aggregation) {
    value = data.reduce((sum, item) => sum + (item[field] || 0), 0);
  } else if (config.aggregation === 'avg') {
    value = data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length;
  } else if (config.aggregation === 'max') {
    value = Math.max(...data.map(item => item[field] || 0));
  } else if (config.aggregation === 'min') {
    value = Math.min(...data.map(item => item[field] || 0));
  } else if (config.aggregation === 'count') {
    value = data.length;
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-8 text-center">
      <h3 className="text-lg font-semibold text-gray-400 mb-2">
        {config.title || 'Total'}
      </h3>
      <div className="text-5xl font-bold text-white">
        {config.aggregation === 'count' ? value.toLocaleString() : formatGP(value)}
      </div>
      <p className="text-sm text-gray-500 mt-2">
        From {data.length} items
      </p>
    </div>
  );
}