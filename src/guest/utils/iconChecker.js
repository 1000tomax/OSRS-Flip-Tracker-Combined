/**
 * Icon Checker for Guest Uploads
 * 
 * Checks icons for uploaded data and reports failures
 */

import { getValidatedIconUrl } from '../../utils/itemIcons';
import { reportFailedIcons } from '../../utils/iconReporting';

/**
 * Check icons for a list of items from uploaded data
 * Reports any missing icons to Discord
 */
export async function checkUploadedItemIcons(items) {
  if (!items || items.length === 0) return;
  
  // Extract unique item names
  const uniqueItems = [...new Set(
    items
      .map(item => item.item || item.item_name || item.itemName)
      .filter(name => name && typeof name === 'string')
  )];
  
  if (uniqueItems.length === 0) return;
  
  console.log(`Checking icons for ${uniqueItems.length} unique items from upload...`);
  
  const failedItems = [];
  // Bounded concurrency pool to avoid overwhelming network
  const CONCURRENCY = 10;
  let index = 0;

  const worker = async () => {
    while (index < uniqueItems.length) {
      const current = uniqueItems[index++];
      try {
        const url = await getValidatedIconUrl(current);
        if (!url) failedItems.push(current);
      } catch (error) {
        console.error(`Error checking icon for ${current}:`, error);
        failedItems.push(current);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, uniqueItems.length) }, worker));
  
  // Report failed items if any
  if (failedItems.length > 0) {
    console.log(`Found ${failedItems.length} items with missing icons`);
    await reportFailedIcons(failedItems, 'CSV Upload');
  } else {
    console.log('All icons found successfully');
  }
  
  return {
    total: uniqueItems.length,
    failed: failedItems.length,
    failedItems
  };
}
