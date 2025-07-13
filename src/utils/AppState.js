// Manages global application state across all extension contexts
export class AppState {
    // Caches data to reduce redundant requests.
    static cache = new Map();

    // Initialize app state with default values
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.lastSyncHash = null;
        this.syncTimeout = null;
        this.isInitialized = false;
        this.candyData = new Map(); // Map of pokemon_id -> candy_count
    }

    // Set Supabase database client
    setSupabase(client) {
        this.supabase = client;
    }

    // Set current authenticated user
    setUser(user) {
        console.log('Setting user:', user);
        this.currentUser = user;
    }

    // Set last sync hash for change detection
    setLastSyncHash(hash) {
        this.lastSyncHash = hash;
    }

    // Set currently selected Pokemon
    setPokemon(pokemon) {
        this.currentPokemon = pokemon;
    }

    // Set Pokemon API data
    setPokemonData(data) {
        this.pokemonData = data;
    }

    // Set sync timeout ID
    setSyncTimeout(timeout) {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        this.syncTimeout = timeout;
    }

    // Clear sync timeout
    clearSyncTimeout() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
    }

    // Check if user is authenticated
    isLoggedIn() {
        return !!this.currentUser;
    }

    // Check if app can sync to cloud (user logged in, online, supabase ready)
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

    // Get detailed auth status for debugging
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

    // Log current auth status to console
    logAuthStatus() {
        const status = this.getAuthStatus();
        console.log('🔍 AppState Authentication Status:', status);
        return status;
    }

    // Set all candy data from server
    setCandyData(candyData) {
        this.candyData = candyData;
    }

    // Get candy count for specific Pokemon
    getCandyCount(pokemonId) {
        return this.candyData.get(pokemonId) || 0;
    }

    // Set candy count for specific Pokemon
    setCandyCount(pokemonId, count) {
        if (count <= 0) {
            this.candyData.delete(pokemonId);
        } else {
            this.candyData.set(pokemonId, count);
        }
    }

    // Reset all app state (used on logout)
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

    // Get static cache for API responses
    getCache() {
        return AppState.cache;
    }
}
