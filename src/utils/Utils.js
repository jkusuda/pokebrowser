// Utils.js

export class Utils {
    static capitalizeFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static parseURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Decode the caughtAt parameter to handle URL encoding
        let caughtAt = urlParams.get('caughtAt');
        if (caughtAt) {
            try {
                // Handle URL-encoded timestamps
                caughtAt = decodeURIComponent(caughtAt);
                // Normalize timestamp for PostgreSQL compatibility
                caughtAt = this.normalizeTimestamp(caughtAt);
            } catch (error) {
                console.warn('Error decoding caughtAt parameter:', error);
            }
        }
        
        return {
            id: parseInt(urlParams.get('id')) || 25,
            name: urlParams.get('name'),
            caughtAt: caughtAt,
            site: urlParams.get('site'),
            shiny: urlParams.get('shiny') === 'true',
            supabaseId: urlParams.get('supabaseId') // Include Supabase primary key if available
        };
    }

    // Normalize timestamp to PostgreSQL-compatible format
    static normalizeTimestamp(timestamp) {
        if (!timestamp) return timestamp;
        
        try {
            // Parse the timestamp and convert to ISO string
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                console.warn('Invalid timestamp:', timestamp);
                return timestamp;
            }
            
            // Return ISO string which PostgreSQL can handle
            const normalized = date.toISOString();
            console.log('🕐 Normalized timestamp:', { original: timestamp, normalized });
            return normalized;
        } catch (error) {
            console.warn('Error normalizing timestamp:', error);
            return timestamp;
        }
    }

    // Formats a date string into a relative time format (e.g., "2 days ago").
    static formatDate(dateString) {
        const diffMinutes = Math.floor((new Date() - new Date(dateString)) / 60000);
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    /**
     * Generates a hash for a collection of Pokémon.
     * @param {Array} collection - The collection to hash.
     * @returns {string} - The generated hash.
     */
    static generateCollectionHash(collection) {
        if (!collection?.length) return 'empty';
        
        const sortedString = collection
            .map(p => `${p.id}-${p.site}-${new Date(p.caughtAt).getTime()}`)
            .sort()
            .join('|');
        
        let hash = 0;
        for (let i = 0; i < sortedString.length; i++) {
            hash = (hash << 5) - hash + sortedString.charCodeAt(i);
            hash |= 0; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
}
