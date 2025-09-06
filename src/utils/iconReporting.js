/**
 * Icon Failure Reporting System
 * 
 * Automatically detects and reports failed OSRS Wiki icons to Discord
 */

import { getPossibleIconUrls } from './itemIcons';

// Track reported items to avoid spam (session-based)
const reportedItems = new Set();
const REPORT_COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown per item
const lastReportTimes = new Map();

/**
 * Check if we should report this item
 */
function shouldReport(itemName) {
  // Don't report if already reported in this session
  if (reportedItems.has(itemName)) {
    return false;
  }
  
  // Check cooldown
  const lastReport = lastReportTimes.get(itemName);
  if (lastReport && Date.now() - lastReport < REPORT_COOLDOWN) {
    return false;
  }
  
  return true;
}

/**
 * Send icon failure report to Discord
 */
export async function reportFailedIcon(itemName, additionalInfo = {}) {
  // Check if we should report
  if (!shouldReport(itemName)) {
    console.log(`Skipping report for ${itemName} (already reported or in cooldown)`);
    return false;
  }
  
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured');
    return false;
  }
  
  // Don't send in development unless explicitly enabled
  const isDev = import.meta.env.DEV;
  const logInDev = import.meta.env.VITE_LOG_TO_DISCORD_IN_DEV === 'true';
  
  if (isDev && !logInDev) {
    console.log('Skipping Discord report in development mode');
    return false;
  }
  
  try {
    // Get the URLs we tried
    const triedUrls = getPossibleIconUrls(itemName);
    
    // Build Discord embed
    const embed = {
      embeds: [{
        title: '🚨 Missing OSRS Icon',
        description: `Failed to load icon for: **${itemName}**`,
        color: 0xff0000, // Red
        fields: [
          {
            name: 'Item Name',
            value: `\`${itemName}\``,
            inline: true
          },
          {
            name: 'Environment',
            value: isDev ? 'Development' : 'Production',
            inline: true
          },
          {
            name: 'Timestamp',
            value: new Date().toLocaleString(),
            inline: true
          }
        ],
        footer: {
          text: 'OSRS Flip Dashboard - Icon Reporter'
        }
      }]
    };
    
    // Add URLs tried
    if (triedUrls && triedUrls.length > 0) {
      embed.embeds[0].fields.push({
        name: 'URLs Attempted',
        value: triedUrls.slice(0, 5).map(url => `• ${url.split('/').pop()}`).join('\n'),
        inline: false
      });
    }
    
    // Add additional context if provided
    if (additionalInfo.source) {
      embed.embeds[0].fields.push({
        name: 'Source',
        value: additionalInfo.source,
        inline: true
      });
    }
    
    if (additionalInfo.username) {
      embed.embeds[0].fields.push({
        name: 'Reported By',
        value: additionalInfo.username || 'Guest User',
        inline: true
      });
    }
    
    // Send to Discord
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embed)
    });
    
    if (response.ok) {
      // Mark as reported
      reportedItems.add(itemName);
      lastReportTimes.set(itemName, Date.now());
      console.log(`Reported missing icon for ${itemName} to Discord`);
      return true;
    } else {
      console.error('Failed to send Discord webhook:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error reporting to Discord:', error);
    return false;
  }
}

/**
 * Batch report multiple failed icons
 */
export async function reportFailedIcons(itemNames, source = 'Bulk Detection') {
  // Filter to only items we should report
  const itemsToReport = itemNames.filter(name => shouldReport(name));
  
  if (itemsToReport.length === 0) {
    console.log('No new items to report');
    return;
  }
  
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured');
    return false;
  }
  
  // Don't send in development unless explicitly enabled
  const isDev = import.meta.env.DEV;
  const logInDev = import.meta.env.VITE_LOG_TO_DISCORD_IN_DEV === 'true';
  
  if (isDev && !logInDev) {
    console.log('Skipping Discord report in development mode');
    return false;
  }
  
  try {
    // Build Discord embed for bulk report
    const embed = {
      embeds: [{
        title: `🚨 Multiple Missing OSRS Icons (${itemsToReport.length})`,
        description: 'The following items failed to load icons:',
        color: 0xff0000, // Red
        fields: [
          {
            name: 'Failed Items',
            value: itemsToReport.slice(0, 10).map(name => `• ${name}`).join('\n') + 
                   (itemsToReport.length > 10 ? `\n... and ${itemsToReport.length - 10} more` : ''),
            inline: false
          },
          {
            name: 'Source',
            value: source,
            inline: true
          },
          {
            name: 'Environment',
            value: isDev ? 'Development' : 'Production',
            inline: true
          },
          {
            name: 'Timestamp',
            value: new Date().toLocaleString(),
            inline: true
          }
        ],
        footer: {
          text: 'OSRS Flip Dashboard - Bulk Icon Reporter'
        }
      }]
    };
    
    // Send to Discord
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embed)
    });
    
    if (response.ok) {
      // Mark all as reported
      itemsToReport.forEach(name => {
        reportedItems.add(name);
        lastReportTimes.set(name, Date.now());
      });
      console.log(`Reported ${itemsToReport.length} missing icons to Discord`);
      return true;
    } else {
      console.error('Failed to send Discord webhook:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error reporting to Discord:', error);
    return false;
  }
}

/**
 * Clear report history (useful for testing)
 */
export function clearReportHistory() {
  reportedItems.clear();
  lastReportTimes.clear();
  console.log('Report history cleared');
}