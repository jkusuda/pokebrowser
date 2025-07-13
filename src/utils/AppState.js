// AppState.js

/**
 * Manages the application's state.
 */
export class AppState {
    // Caches data to reduce redundant requests.
    static cache = new Map();

    /**
     * Initializes the application state.
     */
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.lastSyncHash = null;
        this.syncTimeout = null;
        this.isInitialized = false;
        this.candyData = new Map(); // Map of pokemon_id -> candy_count
    }

    /**
     * Sets the Supabase client instance.
     * @param {SupabaseClient} client - The Supabase client.
     */
    setSupabase(client) {
        this.supabase = client;
    }

    /**
     * Sets the current user.
     * @param {User} user - The current user.
     */
    setUser(user) {
        console.log('Setting user:', user);
        this.currentUser = user;
    }

    /**
     * Sets the last synchronization hash.
     * @param {string} hash - The last sync hash.
     */
    setLastSyncHash(hash) {
        this.lastSyncHash = hash;
    }

    /**
     * Sets the current Pokémon.
     * @param {Object} pokemon - The current Pokémon.
     */
    setPokemon(pokemon) {
        this.currentPokemon = pokemon;
    }

    /**
     * Sets the Pokémon data.
     * @param {Object} data - The Pokémon data.
     */
    setPokemonData(data) {
        this.pokemonData = data;
    }

    /**
     * Sets the synchronization timeout.
     * @param {number} timeout - The timeout ID.
     */
    setSyncTimeout(timeout) {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        this.syncTimeout = timeout;
    }

    /**
     * Clears the synchronization timeout.
     */
    clearSyncTimeout() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
    }

    /**
     * Checks if a user is logged in.
     * @returns {boolean} - True if a user is logged in, false otherwise.
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * Checks if the application can perform a sync.
     * @returns {boolean} - True if a sync is possible, false otherwise.
     */
    canSync() {
        const canSync = this.isLoggedIn() && this.supabase && navigator.onLine;
        
        if (!canSync) {
            const issues = [];
            if (!this.isLoggedIn()) issues.push('not logged in');
            if (!this.supabase) issues.push('supabase not initialized');
            if (!navigator.onLine) issues.push('offline');
            console.log(`🔍 canSync() = false. Issues: ${issues.join(', ')}`);
        }
        
        return canSync;
    }

    /**
     * Gets detailed authentication status for debugging.
     * @returns {Object} - Detailed status information.
     */
    getAuthStatus() {
        return {
            isLoggedIn: this.isLoggedIn(),
            hasSupabase: !!this.supabase,
            isOnline: navigator.onLine,
            canSync: this.canSync(),
            userEmail: this.currentUser?.email || null,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Logs current authentication status for debugging.
     */
    logAuthStatus() {
        const status = this.getAuthStatus();
        console.log('🔍 AppState Authentication Status:', status);
        return status;
    }

    /**
     * Sets the candy data.
     * @param {Map} candyData - The candy data map.
     */
    setCandyData(candyData) {
        this.candyData = candyData;
    }

    /**
     * Gets the candy count for a specific Pokémon.
     * @param {number} pokemonId - The Pokémon ID.
     * @returns {number} - The candy count (0 if none).
     */
    getCandyCount(pokemonId) {
        return this.candyData.get(pokemonId) || 0;
    }

    /**
     * Sets the candy count for a specific Pokémon.
     * @param {number} pokemonId - The Pokémon ID.
     * @param {number} count - The candy count.
     */
    setCandyCount(pokemonId, count) {
        if (count <= 0) {
            this.candyData.delete(pokemonId);
        } else {
            this.candyData.set(pokemonId, count);
        }
    }

    /**
     * Resets the application state.
     */
    reset() {
        console.log('🔄 Resetting AppState...');
        this.currentUser = null;
        this.lastSyncHash = null;
        this.candyData.clear();
        this.clearSyncTimeout();
        
        // Clear any cached Pokemon data
        this.currentPokemon = null;
        this.pokemonData = null;
        
        // Clear the static cache
        AppState.cache.clear();
        
        console.log('✅ AppState reset complete');
    }

    /**
     * Retrieves the application cache.
     * @returns {Map} - The application cache.
     */
    getCache() {
        return AppState.cache;
    }
}
