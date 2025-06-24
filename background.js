// Background script for Chrome extension
// This handles the service worker and can manage authentication state persistence

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'AUTH_STATE_CHANGED') {
        // Handle authentication state changes
        console.log('Auth state changed:', request.data);
        
        // You can store auth state in chrome.storage if needed
        if (request.data.session) {
            chrome.storage.local.set({
                'auth_session': request.data.session
            });
        } else {
            chrome.storage.local.remove('auth_session');
        }
    }
    
    return true; // Keep message channel open
});

// Optional: Clean up storage on startup
chrome.runtime.onStartup.addListener(() => {
    // Clear any expired sessions or perform cleanup
    console.log('Extension startup');
});
