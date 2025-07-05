/**
 * Background script for the Chrome extension.
 * Manages the service worker and persists authentication state.
 */

/**
 * Fired when the extension is first installed.
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

/**
 * Listens for messages from popup or content scripts.
 * @param {Object} request - The message sent by the calling script.
 * @param {Object} sender - The sender of the message.
 * @param {Function} sendResponse - A function to send a response.
 * @returns {boolean} - True to keep the message channel open for asynchronous responses.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'AUTH_STATE_CHANGED') {
        console.log('Auth state changed:', request.data);
        
        // Store or remove the authentication session from local storage.
        if (request.data.session) {
            chrome.storage.local.set({ 'auth_session': request.data.session });
        } else {
            chrome.storage.local.remove('auth_session');
        }
    }
    
    return true; // Keep the message channel open.
});

/**
 * Fired when the extension is started up.
 */
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension startup');
    // Optional: Clean up expired sessions or perform other cleanup tasks.
});
