// popup.js - Modular Pokemon Collection Manager
// ===============================================

// Import statements
import { generateCollectionHash } from './utils/hash-generator.js';
import { formatDate } from './utils/date-formatter.js';

// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://mzoxfiqdhbitwoyspnfm.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM',
    SPRITE_BASE_URL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon',
    SYNC_DELAY: 1000, // Reduced from 3000ms
    BATCH_SIZE: 25,   // Increased from 10
    AUTH_CHECK_INTERVAL: 1000,
    IMMEDIATE_SYNC_ACTIONS: ['login', 'new_pokemon', 'user_action'] // Actions that trigger immediate sync
};

// State Management
class AppState {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.lastSyncHash = null;
        this.syncTimeout = null;
        this.isInitialized = false;
    }

    setSupabase(client) {
        this.supabase = client;
    }

    setUser(user) {
        this.currentUser = user;
    }

    setLastSyncHash(hash) {
        this.lastSyncHash = hash;
    }

    setSyncTimeout(timeout) {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        this.syncTimeout = timeout;
    }

    clearSyncTimeout() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    canSync() {
        return this.isLoggedIn() && this.supabase && navigator.onLine;
    }

    reset() {
        this.currentUser = null;
        this.lastSyncHash = null;
        this.clearSyncTimeout();
    }
}

// DOM Manager
class DOMManager {
    constructor() {
        this.elements = this.initializeElements();
        this.syncIndicator = null;
    }

    initializeElements() {
        const elementIds = [
            'auth-section', 'logged-out-state', 'logged-in-state', 'login-btn',
            'logout-btn', 'user-email', 'sync-status', 'pokemon-collection',
            'total-caught', 'unique-count'
        ];

        const elements = {};
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                elements[id.replace(/-/g, '_')] = element;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        });

        return elements;
    }

    showLoggedOutState() {
        this.elements.logged_out_state?.classList.remove('hidden');
        this.elements.logged_in_state?.classList.add('hidden');
        this.updateSyncStatus('Local storage only', 'local');
    }

    showLoggedInState(user) {
        this.elements.logged_out_state?.classList.add('hidden');
        this.elements.logged_in_state?.classList.remove('hidden');

        if (user && this.elements.user_email) {
            this.elements.user_email.textContent = `Trainer: ${user.email}`;
            this.updateSyncStatus('Cloud sync enabled', 'synced');
        }
    }

    updateSyncStatus(message, type = 'local') {
        console.log(`Sync status: ${message} (${type})`);
        
        if (this.elements.sync_status) {
            this.elements.sync_status.textContent = message;
            this.elements.sync_status.className = `sync-status ${type}`;
            
            // Add visual feedback for syncing
            if (type === 'syncing') {
                this.showSyncIndicator();
            } else {
                this.hideSyncIndicator();
            }
        }
    }

    showSyncIndicator() {
        if (!this.syncIndicator) {
            this.syncIndicator = document.createElement('div');
            this.syncIndicator.className = 'sync-indicator';
            this.syncIndicator.innerHTML = '🔄';
            this.syncIndicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                z-index: 10000;
                animation: pulse 1s infinite;
            `;
            document.body.appendChild(this.syncIndicator);
        }
    }

    hideSyncIndicator() {
        if (this.syncIndicator) {
            this.syncIndicator.remove();
            this.syncIndicator = null;
        }
    }

    // Rest of the methods remain the same...
    setButtonState(buttonName, disabled) {
        const button = this.elements[buttonName];
        if (button) {
            button.disabled = disabled;
        }
    }

    displayCollection(collection) {
        if (!this.elements.pokemon_collection) return;

        if (collection.length === 0) {
            this.elements.pokemon_collection.innerHTML = `
                <div class="empty-state">
                    <h3>POKEDEX EMPTY</h3>
                    <p>Scan web pages to detect wild Pokémon and begin data collection...</p>
                </div>
            `;
            return;
        }

        const sortedCollection = collection.sort((a, b) => 
            new Date(b.caughtAt) - new Date(a.caughtAt)
        );

        this.elements.pokemon_collection.innerHTML = sortedCollection.map(pokemon => {
            const typeDisplay = pokemon.types?.length > 0 ? pokemon.types.join('/') : '';
            const levelDisplay = pokemon.level ? `Lv.${pokemon.level}` : '';
            const separator = levelDisplay && typeDisplay ? ' • ' : '';

            return `
                <div class="pokemon-item clickable-pokemon" data-pokemon-index="${sortedCollection.indexOf(pokemon)}">
                    <div class="pokemon-sprite">
                        <img src="${CONFIG.SPRITE_BASE_URL}/${pokemon.id}.png" 
                             alt="${pokemon.name}" onerror="this.style.display='none'">
                    </div>
                    <div class="pokemon-info">
                        <div class="pokemon-name">${pokemon.name}</div>
                        <div class="pokemon-details">
                            ${levelDisplay}${separator}${typeDisplay}
                            <br>Caught on ${pokemon.site} • ${formatDate(pokemon.caughtAt)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return sortedCollection;
    }

    updateStats(collection) {
        const totalCaught = collection.length;
        const uniquePokemon = new Set(collection.map(p => p.id)).size;

        if (this.elements.total_caught) {
            this.elements.total_caught.textContent = totalCaught.toString().padStart(3, '0');
        }
        if (this.elements.unique_count) {
            this.elements.unique_count.textContent = uniquePokemon.toString().padStart(3, '0');
        }
    }
}


// Authentication Service
class AuthService {
    constructor(appState) {
        this.state = appState;
    }

    async initializeSupabase() {
        if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
            throw new Error('Cloud sync not configured');
        }

        if (typeof window.supabase === 'undefined') {
            throw new Error('Cloud sync library not loaded');
        }

        const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        
        if (!client || typeof client.from !== 'function') {
            throw new Error('Failed to initialize Supabase client');
        }

        this.state.setSupabase(client);
        return client;
    }

    async initializeAuth() {
        if (!this.state.supabase) return null;

        try {
            const { data: { session }, error } = await this.state.supabase.auth.getSession();
            if (error) throw error;

            if (session) {
                this.state.setUser(session.user);
                return session.user;
            }
            return null;
        } catch (error) {
            console.error('Auth initialization error:', error);
            throw error;
        }
    }

    openAuthPopup() {
        const popup = window.open(
            chrome.runtime.getURL('../html/auth.html'),
            'auth',
            'width=400,height=500,scrollbars=yes,resizable=yes'
        );

        return new Promise((resolve) => {
            const checkAuth = setInterval(async () => {
                if (popup.closed) {
                    clearInterval(checkAuth);

                    if (this.state.supabase) {
                        try {
                            const { data: { session } } = await this.state.supabase.auth.getSession();
                            if (session) {
                                this.state.setUser(session.user);
                                resolve(session.user);
                            } else {
                                resolve(null);
                            }
                        } catch (error) {
                            console.error('Error checking session after popup:', error);
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                }
            }, CONFIG.AUTH_CHECK_INTERVAL);
        });
    }

    async handleLogout() {
        try {
            if (!this.state.supabase) return;

            const { error } = await this.state.supabase.auth.signOut();
            if (error) throw error;

            this.state.reset();
            await chrome.storage.local.set({ pokemonCollection: [] });

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    setupAuthStateListener(onAuthChange) {
        if (!this.state.supabase) return;

        this.state.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);

            if (event === 'SIGNED_IN' && session) {
                this.state.setUser(session.user);
                onAuthChange('SIGNED_IN', session.user);
            } else if (event === 'SIGNED_OUT') {
                this.state.reset();
                onAuthChange('SIGNED_OUT', null);
            }
        });
    }
}

// Storage Service
class StorageService {
    static async getPokemonCollection() {
        const { pokemonCollection = [] } = await chrome.storage.local.get(['pokemonCollection']);
        return pokemonCollection;
    }

    static async setPokemonCollection(collection) {
        await chrome.storage.local.set({ pokemonCollection: collection });
    }

    static async removePokemonFromCollection(pokemonToRemove) {
        const collection = await this.getPokemonCollection();
        const updatedCollection = collection.filter(pokemon => 
            !(pokemon.id === pokemonToRemove.id && 
              pokemon.site === pokemonToRemove.site && 
              new Date(pokemon.caughtAt).getTime() === new Date(pokemonToRemove.caughtAt).getTime())
        );
        
        await this.setPokemonCollection(updatedCollection);
        return updatedCollection.length < collection.length;
    }
}

// Sync Service
class SyncService {
    constructor(appState) {
        this.state = appState;
        this.syncInProgress = false;
        this.pendingSync = false;
    }

    debouncedSync(collection) {
        if (!this.state.canSync()) return;

        // If sync is already in progress, mark as pending
        if (this.syncInProgress) {
            this.pendingSync = true;
            return;
        }

        this.state.clearSyncTimeout();
        // Reduced delay for faster sync
        const timeout = setTimeout(() => this.syncToCloud(collection), 1000); // Reduced from 3000ms
        this.state.setSyncTimeout(timeout);
    }

    // Immediate sync for user-triggered actions
    async immediateSync(collection) {
        if (!this.state.canSync()) return;
        
        this.state.clearSyncTimeout();
        return await this.syncToCloud(collection, true);
    }

    async syncToCloud(collection, force = false) {
        if (!this.state.canSync() || (!collection.length && !force)) return;

        // Prevent multiple concurrent syncs
        if (this.syncInProgress && !force) {
            this.pendingSync = true;
            return;
        }

        this.syncInProgress = true;
        this.pendingSync = false;

        const currentHash = generateCollectionHash(collection);
        if (!force && this.state.lastSyncHash === currentHash) {
            console.log('Collection unchanged, skipping sync');
            this.syncInProgress = false;
            return;
        }

        try {
            // Step 1: Fetch existing Pokemon with optimized query
            const { data: existingPokemon, error: fetchError } = await this.state.supabase
                .from('pokemon')
                .select('pokemon_id, site_caught, caught_at')
                .eq('user_id', this.state.currentUser.id);

            if (fetchError) throw fetchError;

            const existingKeys = new Set(
                (existingPokemon || []).map(p => 
                    `${p.pokemon_id}|${p.site_caught}|${new Date(p.caught_at).getTime()}`
                )
            );

            const newPokemon = collection.filter(pokemon => {
                const key = `${pokemon.id}|${pokemon.site}|${new Date(pokemon.caughtAt).getTime()}`;
                return !existingKeys.has(key);
            });

            if (newPokemon.length > 0) {
                let totalInserted = 0;
                
                // Increased batch size for faster processing
                const OPTIMIZED_BATCH_SIZE = 25; // Increased from 10

                // Process batches in parallel for better performance
                const batchPromises = [];
                for (let i = 0; i < newPokemon.length; i += OPTIMIZED_BATCH_SIZE) {
                    const batch = newPokemon.slice(i, i + OPTIMIZED_BATCH_SIZE);
                    const pokemonToInsert = batch.map(pokemon => ({
                        user_id: this.state.currentUser.id,
                        pokemon_id: pokemon.id,
                        name: pokemon.name,
                        species: pokemon.species || pokemon.name,
                        level: pokemon.level || null,
                        type1: pokemon.types?.[0] || 'normal',
                        type2: pokemon.types?.[1] || null,
                        site_caught: pokemon.site,
                        caught_at: pokemon.caughtAt
                    }));

                    // Create promise for each batch
                    const batchPromise = this.state.supabase
                        .from('pokemon')
                        .insert(pokemonToInsert)
                        .then(result => {
                            if (result.error) throw result.error;
                            return batch.length;
                        });

                    batchPromises.push(batchPromise);
                }

                // Wait for all batches to complete
                const results = await Promise.all(batchPromises);
                totalInserted = results.reduce((sum, count) => sum + count, 0);

                this.state.setLastSyncHash(currentHash);
                
                // Check if there's a pending sync to run
                if (this.pendingSync) {
                    this.syncInProgress = false;
                    setTimeout(() => this.syncToCloud(collection), 100);
                }

                return { synced: totalInserted, message: `Synced ${totalInserted} new Pokémon` };
            } else {
                this.state.setLastSyncHash(currentHash);
                return { synced: 0, message: 'All Pokémon already synced' };
            }
        } catch (error) {
            console.error('Sync to cloud error:', error);
            throw error;
        } finally {
            this.syncInProgress = false;
            
            // If there was a pending sync, run it
            if (this.pendingSync) {
                setTimeout(() => this.syncToCloud(collection), 100);
            }
        }
    }

    async syncFromCloud() {
        if (!this.state.canSync()) return;

        try {
            // Optimized query - only fetch what we need
            const { data: cloudPokemon, error } = await this.state.supabase
                .from('pokemon')
                .select('pokemon_id, name, species, level, type1, type2, site_caught, caught_at')
                .eq('user_id', this.state.currentUser.id)
                .order('caught_at', { ascending: false });

            if (error) throw error;

            const localCollection = await StorageService.getPokemonCollection();
            const cloudCollection = (cloudPokemon || []).map(p => ({
                id: p.pokemon_id,
                name: p.name,
                species: p.species,
                level: p.level,
                types: [p.type1, p.type2].filter(Boolean),
                site: p.site_caught,
                caughtAt: p.caught_at
            }));

            const mergedCollection = this.mergeCollections(localCollection, cloudCollection);
            const localHash = generateCollectionHash(localCollection);
            const mergedHash = generateCollectionHash(mergedCollection);

            if (localHash !== mergedHash) {
                await StorageService.setPokemonCollection(mergedCollection);
                const newCount = mergedCollection.length - localCollection.length;
                return { merged: true, newCount, collection: mergedCollection };
            } else {
                return { merged: false, collection: localCollection };
            }
        } catch (error) {
            console.error('Sync from cloud error:', error);
            throw error;
        }
    }

    mergeCollections(collection1, collection2) {
        const merged = [...collection1];
        const existingKeys = new Set(
            collection1.map(p => 
                `${p.id}|${p.site}|${new Date(p.caughtAt).getTime()}`
            )
        );

        for (const pokemon of collection2) {
            const key = `${pokemon.id}|${pokemon.site}|${new Date(pokemon.caughtAt).getTime()}`;
            if (!existingKeys.has(key)) {
                merged.push(pokemon);
                existingKeys.add(key);
            }
        }

        return merged.sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt));
    }

    // Method to force immediate sync (useful for testing)
    async forceSyncNow(collection) {
        console.log('Forcing immediate sync...');
        return await this.syncToCloud(collection, true);
    }
}

// Pokemon Service
class PokemonService {
    constructor(appState) {
        this.state = appState;
    }

    async releasePokemon(pokemonToRelease) {
        try {
            if (this.state.canSync()) {
                
                const { error } = await this.state.supabase
                    .from('pokemon')
                    .delete()
                    .eq('user_id', this.state.currentUser.id)
                    .eq('pokemon_id', pokemonToRelease.id)
                    .eq('site_caught', pokemonToRelease.site)
                    .eq('caught_at', pokemonToRelease.caughtAt);

                if (error) throw error;
            }

            const removed = await StorageService.removePokemonFromCollection(pokemonToRelease);
            
            if (!removed) {
                throw new Error('Pokemon not found in collection');
            }

            return { success: true };
        } catch (error) {
            console.error('Error releasing Pokemon:', error);
            throw error;
        }
    }

    openPokemonDetail(pokemon) {
        const url = chrome.runtime.getURL('../html/pokemon-detail.html');
        const params = new URLSearchParams({
            id: pokemon.id,
            name: pokemon.name,
            caughtAt: pokemon.caughtAt,
            site: pokemon.site
        });

        chrome.windows.create({
            url: `${url}?${params.toString()}`,
            type: 'popup',
            width: 500,
            height: 600,
            focused: true
        });
    }
}

// Main Application Controller
class PopupApp {
    constructor() {
        this.state = new AppState();
        this.dom = new DOMManager();
        this.auth = new AuthService(this.state);
        this.sync = new SyncService(this.state);
        this.pokemon = new PokemonService(this.state);
        this.currentCollection = [];
    }

    async initialize() {
        if (this.state.isInitialized) return;

        try {
            // Initialize Supabase
            await this.initializeSupabase();
            
            // Initialize authentication
            await this.initializeAuth();
            
            // Load initial collection
            await this.loadCollection();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup storage change listener
            this.setupStorageListener();
            
            // Setup online/offline listeners
            this.setupNetworkListeners();
            
            this.state.isInitialized = true;
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.dom.showLoggedOutState();
        }
    }

    async initializeSupabase() {
        try {
            await this.auth.initializeSupabase();
            console.log('Supabase initialized successfully');
        } catch (error) {
            console.warn('Supabase initialization failed:', error);
            this.dom.updateSyncStatus(error.message, 'error');
        }
    }

    async initializeAuth() {
        if (!this.state.supabase) return;

        try {
            const user = await this.auth.initializeAuth();
            
            if (user) {
                this.dom.showLoggedInState(user);
                await this.handleInitialSync();
            } else {
                this.dom.showLoggedOutState();
            }

            // Setup auth state listener
            this.auth.setupAuthStateListener(async (event, user) => {
                if (event === 'SIGNED_IN') {
                    this.dom.showLoggedInState(user);
                    await this.handleSignIn();
                } else if (event === 'SIGNED_OUT') {
                    this.dom.showLoggedOutState();
                    await this.loadCollection();
                }
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
            this.dom.updateSyncStatus('Auth system offline', 'error');
        }
    }

    async triggerImmediateSync(reason = 'user_action') {
        if (!this.state.canSync()) return;

        console.log(`Triggering immediate sync: ${reason}`);
        this.dom.updateSyncStatus('Syncing...', 'syncing');

        try {
            const result = await this.sync.immediateSync(this.currentCollection);
            if (result) {
                this.dom.updateSyncStatus(result.message, 'synced');
                console.log('Immediate sync completed:', result);
            }
        } catch (error) {
            console.error('Immediate sync failed:', error);
            this.dom.updateSyncStatus('Sync failed', 'error');
        }
    }

    async handleInitialSync() {
        try {
            this.dom.updateSyncStatus('Syncing from cloud...', 'syncing');
            const result = await this.sync.syncFromCloud();
            
            if (result.merged) {
                this.currentCollection = result.collection;
                this.displayCollection();
                this.dom.updateSyncStatus(`Synced from cloud (${result.newCount} new)`, 'synced');
            } else {
                this.dom.updateSyncStatus('Already up to date', 'synced');
            }

            // Trigger immediate sync for any local Pokemon
            if (this.currentCollection.length > 0) {
                setTimeout(() => this.triggerImmediateSync('initial_sync'), 500);
            }
        } catch (error) {
            console.error('Initial sync error:', error);
            this.dom.updateSyncStatus(`Sync failed: ${error.message}`, 'error');
        }
    }

    async handleSignIn() {
        try {
            await this.handleInitialSync();
        } catch (error) {
            console.error('Sign in sync error:', error);
        }
    }

    async loadCollection() {
        try {
            const collection = await StorageService.getPokemonCollection();
            this.currentCollection = collection;
            this.displayCollection();

            // Use immediate sync for faster response
            if (this.state.canSync() && collection.length > 0) {
                setTimeout(() => this.triggerImmediateSync('load_collection'), 200);
            }
        } catch (error) {
            console.error('Error loading collection:', error);
        }
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.pokemonCollection) {
                console.log('Pokemon collection changed, triggering immediate sync');
                this.loadCollection();
                
                // Trigger immediate sync for new Pokemon
                if (this.state.canSync()) {
                    setTimeout(() => this.triggerImmediateSync('new_pokemon'), 100);
                }
            }
        });
    }

    displayCollection() {
        const sortedCollection = this.dom.displayCollection(this.currentCollection);
        this.dom.updateStats(this.currentCollection);
        
        if (sortedCollection && sortedCollection.length > 0) {
            this.setupPokemonClickListeners(sortedCollection);
        }
    }

    setupPokemonClickListeners(collection) {
        const pokemonItems = this.dom.elements.pokemon_collection?.querySelectorAll('.pokemon-item');
        pokemonItems?.forEach((item, index) => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                this.pokemon.openPokemonDetail(collection[index]);
            });
        });
    }

    setupEventListeners() {
        // Login button
        this.dom.elements.login_btn?.addEventListener('click', async () => {
            try {
                const user = await this.auth.openAuthPopup();
                if (user) {
                    this.dom.showLoggedInState(user);
                    await this.handleSignIn();
                }
            } catch (error) {
                console.error('Login error:', error);
            }
        });

        // Logout button
        this.dom.elements.logout_btn?.addEventListener('click', async () => {
            try {
                this.dom.setButtonState('logout_btn', true);
                this.dom.updateSyncStatus('Signing out...', 'syncing');
                
                await this.auth.handleLogout();
                
                this.dom.showLoggedOutState();
                await this.loadCollection();
                
            } catch (error) {
                console.error('Logout error:', error);
                this.dom.updateSyncStatus('Error signing out', 'error');
            } finally {
                this.dom.setButtonState('logout_btn', false);
            }
        });
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.pokemonCollection) {
                this.loadCollection();
            }
        });
    }

    setupNetworkListeners() {
        const handleOnlineStatus = () => {
            const isOnline = navigator.onLine;
            console.log('Online status changed:', isOnline);

            if (isOnline && this.state.canSync()) {
                this.dom.updateSyncStatus('Reconnected - checking for updates...', 'syncing');
                setTimeout(() => this.handleInitialSync(), 1000);
            } else if (!isOnline) {
                this.dom.updateSyncStatus('Offline mode', 'local');
            }
        };

        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);
    }
}

// Initialize the application
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new PopupApp();
    app.initialize();
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PopupApp,
        AppState,
        DOMManager,
        AuthService,
        StorageService,
        SyncService,
        PokemonService
    };
}
