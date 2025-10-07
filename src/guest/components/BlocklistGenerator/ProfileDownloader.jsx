/**
 * Download profile JSON file
 */
export function downloadProfile(blockedIds, options = {}) {
  const profile = {
    blockedItemIds: blockedIds,
    timeframe: options.timeframe || 5,
    f2pOnlyMode: options.f2pOnly || false,
  };

  // Create JSON blob
  const json = JSON.stringify(profile);
  const blob = new Blob([json], { type: 'application/json' });

  // Generate filename with Mreedon branding
  const baseName = options.profileName || 'Custom Blocklist';
  const filename = `${baseName} Mreedon.profile.json`;

  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  // Cleanup
  URL.revokeObjectURL(url);
}
