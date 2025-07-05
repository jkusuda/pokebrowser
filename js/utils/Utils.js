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
        return {
            id: parseInt(urlParams.get('id')) || 25,
            name: urlParams.get('name'),
            caughtAt: urlParams.get('caughtAt'),
            site: urlParams.get('site'),
            shiny: urlParams.get('shiny') === 'true'
        };
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
