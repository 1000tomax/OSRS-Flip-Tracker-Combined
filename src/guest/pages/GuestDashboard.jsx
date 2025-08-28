import { useGuestData } from '../contexts/GuestDataContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { formatGP } from '../../utils/formatGP';
import html2canvas from 'html2canvas-pro';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Import existing components
import SortableTable from '../../components/SortableTable';
import ItemSearch from '../components/ItemSearch';
import GuestHeatMap from '../components/GuestHeatMap';

// Helper function to convert array of objects to CSV
function arrayToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row =>
    headers
      .map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

// Export function - creates a ZIP with both JSON and CSV data
async function exportGuestData(guestData) {
  const zip = new JSZip();

  // Create metadata
  const metadata = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    source: 'guest-mode',
    accounts: guestData.metadata.accounts,
    dateRange: guestData.metadata.dateRange,
    timezone: guestData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    stats: {
      totalProfit: guestData.totalProfit,
      totalFlips: guestData.totalFlips,
      uniqueItems: guestData.uniqueItems,
    },
  };

  // Add JSON files
  zip.file('meta.json', JSON.stringify(metadata, null, 2));
  zip.file('json/daily-summaries.json', JSON.stringify(guestData.dailySummaries, null, 2));
  zip.file('json/item-stats.json', JSON.stringify(guestData.itemStats, null, 2));

  // Add CSV files (more user-friendly)
  zip.file('csv/daily-summaries.csv', arrayToCSV(guestData.dailySummaries));
  zip.file('csv/item-stats.csv', arrayToCSV(guestData.itemStats));

  // Add all individual flips as CSV (flatten the flipsByDate object)
  if (guestData.flipsByDate) {
    const allFlipsFlat = [];
    Object.entries(guestData.flipsByDate).forEach(([date, flips]) => {
      flips.forEach(flip => {
        allFlipsFlat.push({
          date,
          item: flip.item,
          quantity: flip.quantity,
          avgBuyPrice: flip.avgBuyPrice,
          avgSellPrice: flip.avgSellPrice,
          profit: flip.profit,
          sellerTax: flip.sellerTax,
          firstBuyTime: flip.firstBuyTime,
          lastSellTime: flip.lastSellTime,
          accountId: flip.accountId,
        });
      });
    });

    zip.file('csv/all-flips.csv', arrayToCSV(allFlipsFlat));
    zip.file('json/flips-by-date.json', JSON.stringify(guestData.flipsByDate, null, 2));
  }

  // Add a README explaining the files
  const readme = `# OSRS Flip Analysis Export

## Files Included

### CSV Files (Open in Excel/Google Sheets)
- csv/daily-summaries.csv - Your daily profit breakdown
- csv/item-stats.csv - Profit analysis by item
- csv/all-flips.csv - Complete flip history with details

### JSON Files (For developers/advanced users)
- json/daily-summaries.json - Daily data in JSON format
- json/item-stats.json - Item statistics in JSON format  
- json/flips-by-date.json - All flips organized by date

### Metadata
- meta.json - Export information and summary statistics

## Generated on ${new Date().toISOString().split('T')[0]}
Total Profit: ${guestData.totalProfit.toLocaleString()} GP
Total Flips: ${guestData.totalFlips.toLocaleString()}
Unique Items: ${guestData.uniqueItems}
Accounts: ${guestData.metadata.accounts.join(', ')}
`;

  zip.file('README.txt', readme);

  // Generate and download ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `osrs-flips-export-${new Date().toISOString().split('T')[0]}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GuestDashboard() {
  const { guestData } = useGuestData();
  const navigate = useNavigate();
  const [searchTerms, setSearchTerms] = useState([]);
  const [isCapturingItems, setIsCapturingItems] = useState(false);
  const [isCapturingChart, setIsCapturingChart] = useState(false);
  const [isCapturingDaily, setIsCapturingDaily] = useState(false);
  const [isCapturingHeatmap, setIsCapturingHeatmap] = useState(false);
  const itemsTableRef = useRef(null);
  const chartRef = useRef(null);
  const dailyTableRef = useRef(null);
  const heatmapRef = useRef(null);

  // Note: We don't need to check for data here because RequireGuestData handles it
  const userTimezone = guestData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Generate shareable image of filtered items data
  const captureItemsTable = async () => {
    if (isCapturingItems) return;

    setIsCapturingItems(true);
    try {
      const itemsToRender = searchTerms.length > 0 ? filteredItems : allItems;
      console.log(`Attempting to capture ${itemsToRender.length} items`);

      // Smart pagination for Discord readability
      const itemsPerPage = 60;
      const totalPages = Math.ceil(itemsToRender.length / itemsPerPage);

      if (totalPages > 1) {
        // eslint-disable-next-line no-alert
        const choice = window.prompt(
          `You have ${itemsToRender.length} items. Choose format:\n\n1 = Multiple Discord-friendly images (${totalPages} files)\n2 = Single long image (Twitter/Reddit)\n\nEnter 1 or 2 (or cancel to abort):`
        );

        if (choice === null) {
          // User clicked cancel or hit escape
          return;
        } else if (choice === '2') {
          // Generate single long image
          await generateItemsPage(itemsToRender, 0, 1, itemsToRender.length);
          return;
        } else if (choice !== '1') {
          // Invalid input
          // eslint-disable-next-line no-alert
          alert('Invalid choice. Screenshot cancelled.');
          return;
        }
        // If choice === '1', continue with pagination

        // Discord tip for multiple files
        // eslint-disable-next-line no-alert
        alert(
          `💡 Discord Tip: Files will download in order (01of${totalPages}, 02of${totalPages}...) but Discord may reorder them when uploading multiple files at once. For best results, upload images one at a time in order.`
        );
      }

      // Generate each page sequentially with proper delays
      for (let page = 0; page < totalPages; page++) {
        await generateItemsPage(itemsToRender, page, totalPages, itemsPerPage);

        // Longer delay between pages to ensure sequential download
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
      // eslint-disable-next-line no-alert
      alert('Screenshot failed. Please try again.');
    } finally {
      setIsCapturingItems(false);
    }
  };

  // Generate a single page of items
  const generateItemsPage = async (allItems, pageIndex, totalPages, itemsPerPage) => {
    const startIdx = pageIndex * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
    const pageItems = allItems.slice(startIdx, endIdx);

    try {
      // Create a temporary div to render the page data
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1000px';
      tempDiv.style.padding = '30px';
      tempDiv.style.backgroundColor = '#0f172a'; // Darker blue instead of gray
      tempDiv.style.color = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';

      // Compact horizontal header
      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '20px';
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.padding = '15px 20px';
      headerDiv.style.backgroundColor = '#1e293b'; // Slate blue instead of gray
      headerDiv.style.borderRadius = '8px';
      headerDiv.style.border = '2px solid #3b82f6'; // Blue border

      // Left side - Title and item info
      const leftInfo = document.createElement('div');

      const title = document.createElement('h1');
      title.textContent = 'OSRS Flip Analysis - Items Report';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      const isFiltered = searchTerms.length > 0;
      const subtitleText =
        totalPages > 1
          ? `Page ${pageIndex + 1} of ${totalPages} • Items ${startIdx + 1}-${endIdx} of ${allItems.length}`
          : isFiltered
            ? `Filtered Results: ${pageItems.length} of ${allItems.length} items`
            : `All Items: ${pageItems.length} items`;
      const searchText = isFiltered ? ` • Search: ${searchTerms.join(', ')}` : '';
      subtitle.textContent = subtitleText + searchText;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#9CA3AF';
      subtitle.style.margin = '2px 0 0 0';

      leftInfo.appendChild(title);
      leftInfo.appendChild(subtitle);

      // Center - empty for now since search moved to left
      const centerInfo = document.createElement('div');

      // Right side - Brand and date on same line
      const rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';

      const brandDateText = document.createElement('p');
      brandDateText.innerHTML = `<span style="color: #60a5fa; font-weight: bold; font-size: 16px;">mreedon.com/guest</span><br><span style="color: #94a3b8; font-size: 11px;">Generated: ${new Date().toLocaleDateString()}</span>`;
      brandDateText.style.margin = '0';
      brandDateText.style.lineHeight = '1.3';

      rightInfo.appendChild(brandDateText);

      headerDiv.appendChild(leftInfo);
      headerDiv.appendChild(centerInfo);
      headerDiv.appendChild(rightInfo);

      // Table
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '14px';

      // Table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.backgroundColor = '#1e40af'; // Blue header instead of gray

      ['Item', 'Total Profit', 'Flips', 'Quantity'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.style.padding = '12px 8px';
        th.style.textAlign = 'left';
        th.style.color = 'white';
        th.style.fontWeight = 'bold';
        th.style.borderBottom = '2px solid #3b82f6';
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table body - use page items
      const tbody = document.createElement('tbody');
      pageItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.backgroundColor = index % 2 === 0 ? '#0f172a' : '#1e293b'; // Blue alternating rows

        // Item name
        const itemCell = document.createElement('td');
        itemCell.textContent = item.item;
        itemCell.style.padding = '10px 8px';
        itemCell.style.borderBottom = '1px solid #334155';

        // Profit
        const profitCell = document.createElement('td');
        profitCell.textContent = formatGP(item.totalProfit);
        profitCell.style.padding = '10px 8px';
        profitCell.style.borderBottom = '1px solid #334155';
        profitCell.style.color = item.totalProfit >= 0 ? '#10b981' : '#f59e0b'; // Emerald green and amber instead of red
        profitCell.style.fontWeight = 'bold';

        // Flips
        const flipsCell = document.createElement('td');
        flipsCell.textContent = item.flipCount.toLocaleString();
        flipsCell.style.padding = '10px 8px';
        flipsCell.style.borderBottom = '1px solid #334155';

        // Quantity
        const quantityCell = document.createElement('td');
        quantityCell.textContent = item.totalQuantity.toLocaleString();
        quantityCell.style.padding = '10px 8px';
        quantityCell.style.borderBottom = '1px solid #334155';

        row.appendChild(itemCell);
        row.appendChild(profitCell);
        row.appendChild(flipsCell);
        row.appendChild(quantityCell);
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      tempDiv.appendChild(headerDiv);
      tempDiv.appendChild(table);
      document.body.appendChild(tempDiv);

      console.log(`Temp div dimensions: ${tempDiv.scrollWidth}x${tempDiv.scrollHeight}`);

      // Capture the temporary div with more conservative settings
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#0f172a', // Match the new blue background
        scale: 2, // Reduced from 3 to 2 for better memory usage
        useCORS: true,
        allowTaint: false,
        removeContainer: true,
        height: Math.min(tempDiv.scrollHeight, 20000), // Cap max height
        width: 1000,
        logging: false,
        pixelRatio: 1, // Fixed at 1 for consistency
      });

      console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);

      // Clean up
      document.body.removeChild(tempDiv);

      // Convert to blob with error handling
      const dataUrl = canvas.toDataURL('image/png');

      if (dataUrl === 'data:,') {
        throw new Error('Canvas generation failed - empty data URL');
      }

      console.log(`Data URL length: ${dataUrl.length} characters`);

      // Download the image
      const link = document.createElement('a');
      const searchSuffix = searchTerms.length > 0 ? 'filtered-' : '';
      const pagePrefix =
        totalPages > 1
          ? `${String(pageIndex + 1).padStart(2, '0')}of${String(totalPages).padStart(2, '0')}-`
          : '';
      link.download = `${pagePrefix}${searchSuffix}items-analysis-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      throw error; // Re-throw so main function can handle it
    }
  };

  // Generate shareable image of profit chart
  const captureChart = async () => {
    if (isCapturingChart) return;

    setIsCapturingChart(true);
    try {
      // Create a temporary div to render the chart
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1000px';
      tempDiv.style.height = '600px';
      tempDiv.style.padding = '30px';
      tempDiv.style.backgroundColor = '#0f172a';
      tempDiv.style.color = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';

      // Header
      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '20px';
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.padding = '15px 20px';
      headerDiv.style.backgroundColor = '#1e293b';
      headerDiv.style.borderRadius = '8px';
      headerDiv.style.border = '2px solid #3b82f6';

      // Left side - Title and stats
      const leftInfo = document.createElement('div');

      const title = document.createElement('h1');
      title.textContent = 'OSRS Flip Analysis - Profit Chart';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      subtitle.textContent = `${guestData.dailySummaries.length} Trading Days • Total Profit: ${guestData.totalProfit.toLocaleString()} GP`;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#9CA3AF';
      subtitle.style.margin = '2px 0 0 0';

      leftInfo.appendChild(title);
      leftInfo.appendChild(subtitle);

      // Right side - Brand and date
      const rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';

      const brandDateText = document.createElement('p');
      brandDateText.innerHTML = `<span style="color: #60a5fa; font-weight: bold; font-size: 16px;">mreedon.com/guest</span><br><span style="color: #94a3b8; font-size: 11px;">Generated: ${new Date().toLocaleDateString()}</span>`;
      brandDateText.style.margin = '0';
      brandDateText.style.lineHeight = '1.3';

      rightInfo.appendChild(brandDateText);

      headerDiv.appendChild(leftInfo);
      headerDiv.appendChild(document.createElement('div')); // empty center
      headerDiv.appendChild(rightInfo);

      // Clone the actual chart
      const originalChart = chartRef.current;
      const chartClone = originalChart.cloneNode(true);
      chartClone.style.height = '400px';
      chartClone.style.backgroundColor = '#0f172a';
      chartClone.style.borderRadius = '8px';
      chartClone.style.padding = '20px';

      // Hide screenshot button in the cloned version
      const screenshotButton = chartClone.querySelector('.screenshot-button');
      if (screenshotButton) {
        screenshotButton.style.display = 'none';
      }

      tempDiv.appendChild(headerDiv);
      tempDiv.appendChild(chartClone);
      document.body.appendChild(tempDiv);

      // Wait a bit for the chart to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        removeContainer: true,
        height: 600,
        width: 1000,
        logging: false,
        pixelRatio: 1,
      });

      // Clean up
      document.body.removeChild(tempDiv);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl === 'data:,') {
        throw new Error('Chart capture failed - empty data URL');
      }

      const link = document.createElement('a');
      link.download = `profit-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Chart screenshot failed:', error);
      // eslint-disable-next-line no-alert
      alert('Chart screenshot failed. Please try again.');
    } finally {
      setIsCapturingChart(false);
    }
  };

  // Generate shareable image of daily summaries table
  const captureDailySummaries = async () => {
    if (isCapturingDaily) return;

    setIsCapturingDaily(true);
    try {
      // Smart pagination for Discord readability
      const daysPerPage = 50;
      const totalPages = Math.ceil(guestData.dailySummaries.length / daysPerPage);

      if (totalPages > 1) {
        // eslint-disable-next-line no-alert
        const choice = window.prompt(
          `You have ${guestData.dailySummaries.length} trading days. Choose format:\n\n1 = Multiple Discord-friendly images (${totalPages} files)\n2 = Single long image (Twitter/Reddit)\n\nEnter 1 or 2 (or cancel to abort):`
        );

        if (choice === null) {
          // User clicked cancel or hit escape
          return;
        } else if (choice === '2') {
          // Generate single long image
          await generateDailySummaryPage(
            guestData.dailySummaries,
            0,
            1,
            guestData.dailySummaries.length
          );
          return;
        } else if (choice !== '1') {
          // Invalid input
          // eslint-disable-next-line no-alert
          alert('Invalid choice. Screenshot cancelled.');
          return;
        }
        // If choice === '1', continue with pagination

        // Discord tip for multiple files
        // eslint-disable-next-line no-alert
        alert(
          `💡 Discord Tip: Files will download in order (01of${totalPages}, 02of${totalPages}...) but Discord may reorder them when uploading multiple files at once. For best results, upload images one at a time in order.`
        );
      }

      // Generate each page sequentially with proper delays
      for (let page = 0; page < totalPages; page++) {
        await generateDailySummaryPage(guestData.dailySummaries, page, totalPages, daysPerPage);

        // Longer delay between pages to ensure sequential download
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error('Daily summaries screenshot failed:', error);
      // eslint-disable-next-line no-alert
      alert('Daily summaries screenshot failed. Please try again.');
    } finally {
      setIsCapturingDaily(false);
    }
  };

  // Generate a single page of daily summaries
  const generateDailySummaryPage = async (allDays, pageIndex, totalPages, daysPerPage) => {
    const startIdx = pageIndex * daysPerPage;
    const endIdx = Math.min(startIdx + daysPerPage, allDays.length);
    const pageDays = allDays.slice(startIdx, endIdx);

    try {
      // Create a temporary div to render all the daily data
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '30px';
      tempDiv.style.backgroundColor = '#0f172a';
      tempDiv.style.color = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';

      // Header
      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '20px';
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.padding = '15px 20px';
      headerDiv.style.backgroundColor = '#1e293b';
      headerDiv.style.borderRadius = '8px';
      headerDiv.style.border = '2px solid #3b82f6';

      // Left side - Title and stats
      const leftInfo = document.createElement('div');

      const title = document.createElement('h1');
      title.textContent = 'OSRS Flip Analysis - Daily Summary';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      const subtitleText =
        totalPages > 1
          ? `Page ${pageIndex + 1} of ${totalPages} • Days ${startIdx + 1}-${endIdx} of ${allDays.length}`
          : `${pageDays.length} Trading Days • Avg: ${Math.round(guestData.totalProfit / allDays.length).toLocaleString()} GP/day`;
      subtitle.textContent = subtitleText;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#9CA3AF';
      subtitle.style.margin = '2px 0 0 0';

      leftInfo.appendChild(title);
      leftInfo.appendChild(subtitle);

      // Right side - Brand and date
      const rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';

      const brandDateText = document.createElement('p');
      brandDateText.innerHTML = `<span style="color: #60a5fa; font-weight: bold; font-size: 16px;">mreedon.com/guest</span><br><span style="color: #94a3b8; font-size: 11px;">Generated: ${new Date().toLocaleDateString()}</span>`;
      brandDateText.style.margin = '0';
      brandDateText.style.lineHeight = '1.3';

      rightInfo.appendChild(brandDateText);

      headerDiv.appendChild(leftInfo);
      headerDiv.appendChild(document.createElement('div')); // empty center
      headerDiv.appendChild(rightInfo);

      // Table
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '14px';

      // Table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.backgroundColor = '#1e40af';

      ['Date', 'Profit', 'Flips', 'Items'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.style.padding = '12px 8px';
        th.style.textAlign = 'left';
        th.style.color = 'white';
        th.style.fontWeight = 'bold';
        th.style.borderBottom = '2px solid #3b82f6';
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table body - page of daily summaries
      const tbody = document.createElement('tbody');
      pageDays.forEach((day, index) => {
        const row = document.createElement('tr');
        row.style.backgroundColor = index % 2 === 0 ? '#0f172a' : '#1e293b';

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = day.date;
        dateCell.style.padding = '10px 8px';
        dateCell.style.borderBottom = '1px solid #334155';

        // Profit
        const profitCell = document.createElement('td');
        profitCell.textContent = formatGP(day.totalProfit);
        profitCell.style.padding = '10px 8px';
        profitCell.style.borderBottom = '1px solid #334155';
        profitCell.style.color = day.totalProfit >= 0 ? '#10b981' : '#f59e0b';
        profitCell.style.fontWeight = 'bold';

        // Flips
        const flipsCell = document.createElement('td');
        flipsCell.textContent = day.flipCount.toLocaleString();
        flipsCell.style.padding = '10px 8px';
        flipsCell.style.borderBottom = '1px solid #334155';

        // Items
        const itemsCell = document.createElement('td');
        itemsCell.textContent = day.uniqueItems.toString();
        itemsCell.style.padding = '10px 8px';
        itemsCell.style.borderBottom = '1px solid #334155';

        row.appendChild(dateCell);
        row.appendChild(profitCell);
        row.appendChild(flipsCell);
        row.appendChild(itemsCell);
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      tempDiv.appendChild(headerDiv);
      tempDiv.appendChild(table);
      document.body.appendChild(tempDiv);

      console.log(
        `Daily summary temp div dimensions: ${tempDiv.scrollWidth}x${tempDiv.scrollHeight}`
      );

      // Capture
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        removeContainer: true,
        height: Math.min(tempDiv.scrollHeight, 15000),
        width: 800,
        logging: false,
        pixelRatio: 1,
      });

      // Clean up
      document.body.removeChild(tempDiv);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl === 'data:,') {
        throw new Error('Daily summaries capture failed - empty data URL');
      }

      const link = document.createElement('a');
      const pagePrefix =
        totalPages > 1
          ? `${String(pageIndex + 1).padStart(2, '0')}of${String(totalPages).padStart(2, '0')}-`
          : '';
      link.download = `${pagePrefix}daily-summary-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Daily summaries screenshot failed:', error);
      // eslint-disable-next-line no-alert
      alert('Daily summaries screenshot failed. Please try again.');
    } finally {
      setIsCapturingDaily(false);
    }
  };

  // Generate shareable image of heatmap
  const captureHeatmap = async () => {
    if (isCapturingHeatmap) return;

    setIsCapturingHeatmap(true);
    try {
      // Create a temporary div to render the heatmap
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1200px';
      tempDiv.style.padding = '30px';
      tempDiv.style.backgroundColor = '#0f172a';
      tempDiv.style.color = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';

      // Header
      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '20px';
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.padding = '15px 20px';
      headerDiv.style.backgroundColor = '#1e293b';
      headerDiv.style.borderRadius = '8px';
      headerDiv.style.border = '2px solid #3b82f6';

      // Left side - Title and stats
      const leftInfo = document.createElement('div');

      const title = document.createElement('h1');
      title.textContent = 'OSRS Flip Analysis - Trading Heat Map';
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.margin = '0';
      title.style.color = 'white';

      const subtitle = document.createElement('p');
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      subtitle.textContent = `${guestData.uniqueItems} Items • ${guestData.dailySummaries.length} Days • Total: ${guestData.totalProfit.toLocaleString()} GP • Hours in ${userTimezone}`;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#9CA3AF';
      subtitle.style.margin = '2px 0 0 0';

      leftInfo.appendChild(title);
      leftInfo.appendChild(subtitle);

      // Right side - Brand and date
      const rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';

      const brandDateText = document.createElement('p');
      brandDateText.innerHTML = `<span style="color: #60a5fa; font-weight: bold; font-size: 16px;">mreedon.com/guest</span><br><span style="color: #94a3b8; font-size: 11px;">Generated: ${new Date().toLocaleDateString()}</span>`;
      brandDateText.style.margin = '0';
      brandDateText.style.lineHeight = '1.3';

      rightInfo.appendChild(brandDateText);

      headerDiv.appendChild(leftInfo);
      headerDiv.appendChild(document.createElement('div')); // empty center
      headerDiv.appendChild(rightInfo);

      // Clone the heatmap
      const originalHeatmap = heatmapRef.current;
      if (!originalHeatmap) {
        throw new Error('Heatmap element not found');
      }

      const heatmapClone = originalHeatmap.cloneNode(true);

      // Hide any screenshot buttons in the clone
      const screenshotButtons = heatmapClone.querySelectorAll('.screenshot-button');
      screenshotButtons.forEach(btn => {
        btn.style.display = 'none';
      });

      tempDiv.appendChild(headerDiv);
      tempDiv.appendChild(heatmapClone);
      document.body.appendChild(tempDiv);

      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        removeContainer: true,
        width: 1200,
        logging: false,
        pixelRatio: 1,
      });

      // Clean up
      document.body.removeChild(tempDiv);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl === 'data:,') {
        throw new Error('Heatmap capture failed - empty data URL');
      }

      const link = document.createElement('a');
      link.download = `trading-heatmap-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Heatmap screenshot failed:', error);
      // eslint-disable-next-line no-alert
      alert('Heatmap screenshot failed. Please try again.');
    } finally {
      setIsCapturingHeatmap(false);
    }
  };

  // Prepare data for daily summaries table
  const dailyTableColumns = [
    { key: 'date', label: 'Date', sortable: true },
    {
      key: 'totalProfit',
      label: 'Profit',
      sortable: true,
      render: value => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>{formatGP(value)}</span>
      ),
    },
    { key: 'flipCount', label: 'Flips', sortable: true },
    { key: 'uniqueItems', label: 'Items', sortable: true },
  ];

  // Filter items based on search
  const filterItems = (items, searchTerms) => {
    if (searchTerms.length === 0) return items;

    return items.filter(item => {
      const itemName = item.item.toLowerCase();
      return searchTerms.some(term => itemName.includes(term));
    });
  };

  // Show all items - this is their personal analysis, let them see everything
  const allItems = guestData.itemStats;
  const filteredItems = filterItems(allItems, searchTerms);
  const itemTableColumns = [
    { key: 'item', label: 'Item', sortable: true },
    {
      key: 'totalProfit',
      label: 'Total Profit',
      sortable: true,
      render: value => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>{formatGP(value)}</span>
      ),
    },
    { key: 'flipCount', label: 'Flips', sortable: true },
    { key: 'totalQuantity', label: 'Quantity', sortable: true },
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Warning about refreshing */}
      <div className="bg-orange-900/50 border border-orange-500 rounded-lg p-3 mb-6">
        <p className="text-orange-200 text-sm">
          ⚠️ <strong>Note:</strong> Your data exists only in this session. Refreshing the page will
          require re-uploading your CSV. Use the Export button to save your processed data.
        </p>
      </div>

      {/* Account info if multiple accounts */}
      {guestData.metadata?.accountCount > 1 && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-6">
          <p className="text-blue-200 text-sm">
            📊 <strong>Combined data from {guestData.metadata.accountCount} accounts:</strong>{' '}
            {guestData.metadata.accounts.join(', ')}
          </p>
          <p className="text-blue-300 text-xs mt-1">
            Tip: Export accounts separately from Flipping Copilot if you want individual analysis
          </p>
        </div>
      )}

      {/* Header with clear indication this is guest mode */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Your Flip Analysis</h1>
          <p className="text-gray-400 mt-2">
            Guest Session -{' '}
            {guestData.metadata?.dateRange
              ? `${guestData.metadata.dateRange.from} to ${guestData.metadata.dateRange.to}`
              : new Date().toLocaleDateString()}
          </p>
          <p className="text-gray-500 text-xs mt-1">Dates shown in your timezone: {userTimezone}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              // eslint-disable-next-line no-alert
              if (window.confirm('This will clear your current data. Continue?')) {
                navigate('/guest');
              }
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Upload New CSV
          </button>
          <button
            onClick={() => exportGuestData(guestData)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            📥 Export Results
          </button>
        </div>
      </div>

      {/* Summary Cards - No challenge metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm">Total Profit</div>
          <div className="text-2xl font-bold text-green-400">
            {guestData.totalProfit.toLocaleString()} GP
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm">Total Flips</div>
          <div className="text-2xl font-bold text-white">
            {guestData.totalFlips.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm">Unique Items</div>
          <div className="text-2xl font-bold text-white">{guestData.uniqueItems}</div>
        </div>
      </div>

      {/* Cumulative Profit Chart */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8" ref={chartRef}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">📈 Cumulative Profit Over Time</h3>
          <button
            onClick={captureChart}
            disabled={isCapturingChart}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-50 screenshot-button"
          >
            {isCapturingChart ? '📸 Capturing...' : '📸 Screenshot'}
          </button>
        </div>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={(() => {
                // Calculate cumulative profit
                let cumulativeProfit = 0;
                return guestData.dailySummaries.map((day, index) => {
                  cumulativeProfit += day.totalProfit;
                  return {
                    date: day.date,
                    day: index + 1,
                    dailyProfit: day.totalProfit,
                    cumulativeProfit,
                    flips: day.flipCount,
                  };
                });
              })()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="day"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                label={{
                  value: 'Day',
                  position: 'insideBottom',
                  offset: -5,
                  style: { textAnchor: 'middle', fill: '#9CA3AF' },
                }}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                tickFormatter={value => formatGP(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: 'white',
                }}
                formatter={(value, name) => [
                  name === 'cumulativeProfit' ? `${value.toLocaleString()} GP` : formatGP(value),
                  name === 'cumulativeProfit'
                    ? 'Total Profit'
                    : name === 'dailyProfit'
                      ? 'Daily Profit'
                      : name,
                ]}
                labelFormatter={day => `Day ${day}`}
              />
              <Line
                type="monotone"
                dataKey="cumulativeProfit"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#22c55e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Shows your total accumulated profit over {guestData.dailySummaries.length} trading days
        </p>
      </div>

      {/* Trading Heat Map */}
      <div ref={heatmapRef} className="mb-8">
        <div className="flex justify-end mb-2">
          <button
            onClick={captureHeatmap}
            disabled={isCapturingHeatmap}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-50 screenshot-button"
          >
            {isCapturingHeatmap ? '📸 Capturing...' : '📸 Screenshot'}
          </button>
        </div>
        <GuestHeatMap guestData={guestData} />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg" ref={dailyTableRef}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">
              Daily Summary ({guestData.dailySummaries.length} days)
            </h3>
            <button
              onClick={captureDailySummaries}
              disabled={isCapturingDaily}
              className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-500 disabled:opacity-50"
            >
              {isCapturingDaily ? '📸 Capturing...' : '📸 Screenshot'}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <SortableTable
              data={guestData.dailySummaries}
              columns={dailyTableColumns}
              initialSortField="date"
              initialSortDirection="desc"
              className="text-sm"
            />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg" ref={itemsTableRef}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">
              All Items (
              {searchTerms.length > 0
                ? `${filteredItems.length} of ${allItems.length}`
                : allItems.length}
              )
            </h3>
            <button
              onClick={captureItemsTable}
              disabled={isCapturingItems}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-500 disabled:opacity-50"
            >
              {isCapturingItems ? '📸 Capturing...' : '📸 Screenshot'}
            </button>
          </div>

          <ItemSearch
            onSearch={setSearchTerms}
            placeholder="Search items... (e.g., 'Dragon bones' or 'Rune sword, Magic logs, Whip')"
          />

          <div className="max-h-96 overflow-y-auto">
            <SortableTable data={filteredItems} columns={itemTableColumns} className="text-sm" />
          </div>

          {searchTerms.length > 0 && filteredItems.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p>No items found matching your search.</p>
              <p className="text-sm mt-2">
                Try searching for partial names like "dragon" or "rune"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
