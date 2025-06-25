// utils/hash-generator.js
// Utility for generating collection hashes for change detection

/**
 * Generate hash of collection for change detection
 * @param {Array} collection - Array of Pokemon objects
 * @returns {string} Hash string representing the collection state
 */
export function generateCollectionHash(collection) {
    if (!collection || collection.length === 0) return 'empty';
    
    const sortedCollection = collection
        .map(p => `${p.id}-${p.site}-${new Date(p.caughtAt).getTime()}`)
        .sort()
        .join('|');
    
    // Use a simple hash function instead of btoa for better compatibility
    let hash = 0;
    for (let i = 0; i < sortedCollection.length; i++) {
        const char = sortedCollection.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
}
