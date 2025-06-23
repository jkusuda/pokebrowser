// Background service worker for Pokebrowser
// This handles extension lifecycle and background tasks

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Pokebrowser extension installed!');
    
    // Initialize storage
    chrome.storage.local.set({
      pokemonCollection: [],
      encounterSettings: {
        encounterRate: 0.2,
        enabledSites: 'all'
      }
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pokemonCaught') {
    // Could add notification or badge update here
    console.log(`Pokemon caught: ${request.pokemon.name} on ${request.site}`);
    
    // Update badge with collection count
    updateBadge();
  }
  
  return true;
});

// Update extension badge with Pokemon count
async function updateBadge() {
  try {
    const result = await chrome.storage.local.get(['pokemonCollection']);
    const collection = result.pokemonCollection || [];
    const count = collection.length;
    
    chrome.action.setBadgeText({
      text: count > 0 ? count.toString() : ''
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: '#4CAF50'
    });
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.pokemonCollection) {
    updateBadge();
  }
});

// Initialize badge on startup
updateBadge();
