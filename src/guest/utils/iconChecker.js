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
  const batchSize = 20; // Process in batches to avoid overwhelming
  
  for (let i = 0; i < uniqueItems.length; i += batchSize) {
    const batch = uniqueItems.slice(i, i + batchSize);
    
    // Check each item in the batch
    await Promise.all(
      batch.map(async (itemName) => {
        try {
          const url = await getValidatedIconUrl(itemName);
          if (!url) {
            failedItems.push(itemName);
          }
        } catch (error) {
          console.error(`Error checking icon for ${itemName}:`, error);
          failedItems.push(itemName);
        }
      })
    );
    
    // Small delay between batches
    if (i + batchSize < uniqueItems.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
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