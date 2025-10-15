/**
 * Download profile JSON file
 * Format matches the SuggestionPreferences model from OSRS Flipping Copilot plugin
 */
export function downloadProfile(blockedIds, options = {}) {
  const profile = {
    blockedItemIds: blockedIds,
    timeframe: options.timeframe || 5,
    f2pOnlyMode: options.f2pOnly || false,
    sellOnlyMode: false, // Explicitly set to false to match plugin expectations
  };

  // Create JSON blob
  const json = JSON.stringify(profile, null, 2); // Pretty print for readability
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
