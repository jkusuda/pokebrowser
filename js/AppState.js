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
        return this.isLoggedIn() && this.supabase && navigator.onLine;
    }

    /**
     * Resets the application state.
     */
    reset() {
        this.currentUser = null;
        this.lastSyncHash = null;
        this.clearSyncTimeout();
    }

    /**
     * Retrieves the application cache.
     * @returns {Map} - The application cache.
     */
    getCache() {
        return AppState.cache;
    }
}
