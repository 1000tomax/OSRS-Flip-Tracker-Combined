# Fix Web Worker Memory Crash in Guest Mode CSV Processing

## Problem Context
Users are getting web worker crashes when uploading CSV files in guest mode. A 1.88MB file with 17,216 rows is causing memory crashes. The worker is accumulating all data in memory instead of truly streaming, causing memory fragmentation.

## Required Changes

### 1. Fix Web Worker Memory Management
**File:** `src/workers/guestProcessor.worker.js`

Replace the entire `self.onmessage` function with memory-efficient batch processing:

```javascript
self.onmessage = async e => {
  try {
    if (e.data.type !== 'START') return;

    const { file, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } = e.data;

    // EARLY EXIT: File size check to prevent crashes
    if (file.size > 3 * 1024 * 1024) { // 3MB limit
      self.postMessage({
        type: 'ERROR',
        message: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum: 3MB. Try exporting a shorter date range.`,
      });
      return;
    }

    let headers = null;
    const headerMap = {};
    let parser = null;
    let rowsProcessed = 0;
    let lastProgressUpdate = 0;
    const accounts = new Set();
    
    // MEMORY MANAGEMENT: Process in batches and clean up
    const flipsByDate = {};
    const itemStatsMap = {};
    const allFlips = []; // Keep flips but manage memory better
    const seen = new Set();
    let hasShowBuyingError = false;
    
    // BATCH PROCESSING: Prevent memory spikes
    const BATCH_SIZE = 2000;
    let currentBatch = [];
    
    const processBatch = (batch) => {
      for (const flipData of batch) {
        // Deduplication
        const flipHash = `${flipData.account}-${flipData.item}-${flipData.first_buy_time}-${flipData.last_sell_time}`;
        if (seen.has(flipHash)) continue;
        seen.add(flipHash);

        // Add to final results
        allFlips.push(flipData);
        accounts.add(flipData.account);

        // Update aggregates
        const dateKey = toDateKey(flipData.last_sell_time, timezone);
        
        // Update date aggregates
        if (!flipsByDate[dateKey]) {
          flipsByDate[dateKey] = {
            date: dateKey,
            flips: [],
            totalProfit: 0,
            totalFlips: 0,
          };
        }
        flipsByDate[dateKey].flips.push(flipData);
        flipsByDate[dateKey].totalProfit += flipData.profit;
        flipsByDate[dateKey].totalFlips++;

        // Update item stats
        if (!itemStatsMap[flipData.item]) {
          itemStatsMap[flipData.item] = {
            item: flipData.item,
            totalProfit: 0,
            flipCount: 0,
            totalQuantity: 0,
          };
        }
        itemStatsMap[flipData.item].totalProfit += flipData.profit;
        itemStatsMap[flipData.item].flipCount++;
        itemStatsMap[flipData.item].totalQuantity += flipData.bought;
      }
      
      // MEMORY CLEANUP: Clear batch and force GC opportunity
      batch.length = 0;
      if (typeof gc !== 'undefined') gc();
    };

    await new Promise((resolve, reject) => {
      parser = Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        
        // MEMORY OPTIMIZATION: Much smaller chunks
        chunkSize: 32 * 1024, // 32KB chunks (very small)
        
        chunk: results => {
          try {
            // MEMORY MONITORING
            if (performance.memory) {
              const used = performance.memory.usedJSHeapSize;
              const limit = performance.memory.jsHeapSizeLimit;
              if (used / limit > 0.85) { // Stop at 85% memory usage
                if (parser) parser.abort();
                reject(new Error(`Memory usage too high (${Math.round(used/limit*100)}%). File too large for processing.`));
                return;
              }
            }

            // Build headers on first chunk
            if (!headers) {
              headers = results.meta.fields;
              headers.forEach(header => {
                const normalized = header.trim().toLowerCase();
                headerMap[normalized] = header;
              });

              const normalizedHeaders = Object.keys(headerMap);
              const missingColumns = EXPECTED_COLUMNS.filter(col => !normalizedHeaders.includes(col));

              if (missingColumns.length > 0) {
                if (parser) parser.abort();
                reject(new Error(`Not a valid Flipping Copilot CSV. Missing columns: ${missingColumns.join(', ')}`));
                return;
              }
            }

            // Process rows in smaller batches
            for (const row of results.data) {
              try {
                const firstBuyTime = row[headerMap['first buy time']];
                const lastSellTime = row[headerMap['last sell time']];
                
                if (!firstBuyTime || !lastSellTime) continue;

                const flipData = {
                  account: row[headerMap.account] || 'Unknown',
                  item: row[headerMap.item] || 'Unknown',
                  first_buy_time: firstBuyTime,
                  last_sell_time: lastSellTime,
                  bought: cleanNumeric(row[headerMap.bought]),
                  sold: cleanNumeric(row[headerMap.sold]),
                  avg_buy_price: cleanNumeric(row[headerMap['avg. buy price']]),
                  avg_sell_price: cleanNumeric(row[headerMap['avg. sell price']]),
                  tax: cleanNumeric(row[headerMap.tax]),
                  profit: cleanNumeric(row[headerMap.profit]) || 
                          (cleanNumeric(row[headerMap.sold]) * cleanNumeric(row[headerMap['avg. sell price']]) - 
                           cleanNumeric(row[headerMap.bought]) * cleanNumeric(row[headerMap['avg. buy price']]) - 
                           cleanNumeric(row[headerMap.tax])),
                };

                if (flipData.bought === 0 && flipData.sold === 0) {
                  hasShowBuyingError = true;
                  continue;
                }

                // Add to batch
                currentBatch.push(flipData);
                
                // BATCH PROCESSING: Process when batch is full
                if (currentBatch.length >= BATCH_SIZE) {
                  processBatch(currentBatch);
                }

                rowsProcessed++;

                // Progress updates
                if (Date.now() - lastProgressUpdate > 500) {
                  self.postMessage({
                    type: 'PROGRESS',
                    progress: {
                      current: rowsProcessed,
                      message: `Processing row ${rowsProcessed.toLocaleString()}...`,
                    },
                  });
                  lastProgressUpdate = Date.now();
                }

              } catch (rowError) {
                console.warn('Error processing row:', rowError);
                continue;
              }
            }

          } catch (chunkError) {
            console.error('Chunk processing error:', chunkError);
            if (parser) parser.abort();
            reject(chunkError);
          }
        },

        complete: () => {
          // Process final batch
          if (currentBatch.length > 0) {
            processBatch(currentBatch);
          }
          resolve();
        },

        error: error => {
          console.error('Papa Parse error:', error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });

    // MEMORY CHECK: Final validation before sending
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const limit = performance.memory.jsHeapSizeLimit;
      console.log(`Final memory usage: ${Math.round(used/(1024*1024))}MB (${Math.round(used/limit*100)}%)`);
    }

    // Send results with all flips (but processed efficiently)
    self.postMessage({
      type: 'SUCCESS',
      data: {
        flipsByDate,
        itemStats: Object.values(itemStatsMap),
        accounts: Array.from(accounts),
        totalRows: rowsProcessed,
        hasShowBuyingError,
        allFlips, // Keep this for dashboard display
        metadata: {
          originalFileSize: file.size,
          processedFlips: allFlips.length,
          accounts: Array.from(accounts),
          accountCount: accounts.size,
        },
      },
    });

  } catch (error) {
    console.error('Worker processing error:', error);
    self.postMessage({
      type: 'ERROR',
      message: error.message || 'Unknown processing error',
      stack: error.stack,
    });
  } finally {
    // Final cleanup
    if (typeof gc !== 'undefined') gc();
  }
};
```

### 2. Add File Size Validation to Upload Page
**File:** `src/guest/pages/GuestUploadPage.jsx`

Find the `handleUpload` function and add validation at the beginning:

```javascript
const handleUpload = async file => {
  try {
    // VALIDATION 1: File size check (prevent worker crashes)
    const maxFileSize = 2.5 * 1024 * 1024; // 2.5MB limit (conservative)
    if (file.size > maxFileSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
      
      guestAnalytics.uploadFailed('file_too_large');
      window.alert(
        `File too large: ${fileSizeMB}MB\n` +
        `Maximum allowed: ${maxSizeMB}MB\n\n` +
        `Your file has ${Math.round(file.size / 112).toLocaleString()} estimated rows.\n` +
        `Try exporting a shorter date range (3-6 months) from Flipping Copilot.`
      );
      return;
    }

    // VALIDATION 2: Estimate row count and warn
    const estimatedRows = Math.round(file.size / 112); // 112 bytes per row average
    if (estimatedRows > 15000) {
      const proceed = window.confirm(
        `Large file detected: ~${estimatedRows.toLocaleString()} rows\n\n` +
        `This may take 30-60 seconds to process and use significant memory.\n` +
        `For better performance, consider exporting a shorter date range.\n\n` +
        `Continue anyway?`
      );
      
      if (!proceed) {
        guestAnalytics.uploadFailed('user_cancelled_large_file');
        return;
      }
    }

    // VALIDATION 3: File type check
    if (!file.name.toLowerCase().endsWith('.csv')) {
      guestAnalytics.uploadFailed('invalid_file_type');
      window.alert('Please upload a .csv file from Flipping Copilot');
      return;
    }

    // VALIDATION 4: Basic CSV format check (quick peek)
    const sampleSize = Math.min(file.size, 1024); // Read first 1KB
    const sampleText = await file.slice(0, sampleSize).text();
    
    if (!sampleText.includes('First Buy Time') && !sampleText.includes('first buy time')) {
      guestAnalytics.uploadFailed('not_copilot_csv');
      window.alert(
        'This doesn\'t appear to be a Flipping Copilot export.\n\n' +
        'Make sure you\'re uploading the flips.csv file from the plugin.'
      );
      return;
    }

    // Continue with existing upload logic...
    setStep('processing');
    setProgress({ current: 0, total: 100, message: 'Starting...' });
    // ... rest of existing code
```

### 3. Enhance Worker Message Handling
**File:** `src/guest/pages/GuestUploadPage.jsx`

Replace the `worker.onmessage` handler with enhanced error handling:

```javascript
worker.onmessage = e => {
  // Handle memory warnings from worker
  if (e.data.type === 'MEMORY_WARNING') {
    console.warn('Worker memory warning:', e.data.message);
    setProgress(prev => ({ 
      ...prev, 
      message: `${prev.message} (High memory usage - processing slowly)` 
    }));
    return;
  }

  // Handle progress updates
  if (e.data.type === 'PROGRESS') {
    setProgress(e.data.progress);
    return;
  }

  // Handle successful completion
  if (e.data.type === 'SUCCESS') {
    const processedData = {
      flipsByDate: e.data.data.flipsByDate,
      itemStats: e.data.data.itemStats,
      accounts: e.data.data.accounts,
      metadata: {
        ...e.data.data.metadata,
        processedAt: new Date().toISOString(),
        userTimezone: timezone,
        dateRange: {
          from: Object.keys(e.data.data.flipsByDate).sort()[0],
          to: Object.keys(e.data.data.flipsByDate).sort().pop(),
        },
      },
    };

    setGuestData(processedData);
    guestAnalytics.uploadSuccess({
      rows_processed: e.data.data.totalRows,
      processing_time_ms: Date.now() - uploadStartTime,
      memory_used: e.data.data.memoryUsed || 'unknown',
      accounts: e.data.data.accounts?.length || 1,
      date_range_days: Object.keys(e.data.data.flipsByDate).length,
    });

    setStep('complete');
    worker.terminate();
    return;
  }

  // Handle errors with enhanced context
  if (e.data.type === 'ERROR') {
    console.error('Worker error:', e.data);
    
    // Enhanced Sentry error reporting
    Sentry.captureException(new Error(e.data.message), {
      tags: {
        error_type: 'worker_processing_error',
        component: 'guest_csv_processor',
        severity: 'high',
      },
      contexts: {
        file_info: {
          size: file.size,
          name: file.name,
          estimated_rows: Math.round(file.size / 112),
        },
        error_details: {
          message: e.data.message,
          stack: e.data.stack,
          line: e.data.line,
          column: e.data.column,
        },
      },
    });

    guestAnalytics.uploadFailed({
      error_type: 'worker_error',
      error_message: e.data.message,
      file_size: file.size,
      estimated_rows: Math.round(file.size / 112),
    });

    window.alert(`Processing failed: ${e.data.message}`);
    setStep('upload');
    worker.terminate();
    return;
  }
};
```

## Testing Instructions

1. **Test with the original failing file** (1.88MB, 17,216 rows)
2. **Verify file size validation** works by trying to upload files >2.5MB
3. **Check memory warnings** appear in console for large files
4. **Monitor Sentry** for any remaining crashes
5. **Test progressively larger files** to find new limits

## Expected Results

- Files up to 2.5MB should process without crashes
- Better user feedback during large file processing  
- Graceful error handling instead of worker crashes
- Enhanced error reporting for debugging future issues

## Priority

This is a **critical fix** - deploy immediately to prevent user frustration with CSV upload crashes.
