import { AppState } from './AppState.js';
import { DOMManager } from './DOMManager.js';
import { AuthService } from './services/AuthService.js';
import { SyncService } from './services/SyncService.js';
import { PokemonService } from './services/PokemonService.js';
import { StorageService } from './services/StorageService.js';

/**
 * Main controller for the popup application.
 */
class PopupApp {
    /**
     * Initializes the application.
     */
    constructor() {
        this.state = new AppState();
        this.dom = new DOMManager();
        this.auth = new AuthService(this.state);
        this.sync = new SyncService(this.state);
        this.pokemon = new PokemonService(this.state);
        this.currentCollection = [];
    }

    /**
     * Initializes the application, including Supabase, authentication, and event listeners.
     */
    async initialize() {
        if (this.state.isInitialized) return;

        try {
            await this.initializeSupabase();
            await this.initializeAuth();
            await this.loadCollection();
            this.setupEventListeners();
            this.setupStorageListener();
            this.setupNetworkListeners();
            this.state.isInitialized = true;
        } catch (error) {
            console.error('Error initializing app:', error);
            this.dom.showLoggedOutState();
        }
    }

    /**
     * Initializes the Supabase client.
     */
    async initializeSupabase() {
        try {
            await this.auth.initializeSupabase();
            console.log('Supabase initialized successfully');
        } catch (error) {
            console.warn('Supabase initialization failed:', error);
            this.dom.updateSyncStatus(error.message, 'error');
        }
    }

    /**
     * Initializes authentication and sets up listeners for auth state changes.
     */
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

    /**
     * Triggers an immediate synchronization with the server.
     * @param {string} reason - The reason for the sync.
     */
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

    /**
     * Handles the initial synchronization when the app loads.
     */
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

            if (this.currentCollection.length > 0) {
                setTimeout(() => this.triggerImmediateSync('initial_sync'), 500);
            }
        } catch (error) {
            console.error('Initial sync error:', error);
            this.dom.updateSyncStatus(`Sync failed: ${error.message}`, 'error');
        }
    }

    /**
     * Handles the sign-in process.
     */
    async handleSignIn() {
        try {
            await this.handleInitialSync();
        } catch (error) {
            console.error('Sign in sync error:', error);
        }
    }

    /**
     * Loads the Pokémon collection from storage.
     */
    async loadCollection() {
        try {
            const collection = await StorageService.getPokemonCollection();
            this.currentCollection = collection;
            this.displayCollection();

            if (this.state.canSync() && collection.length > 0) {
                setTimeout(() => this.triggerImmediateSync('load_collection'), 200);
            }
        } catch (error) {
            console.error('Error loading collection:', error);
        }
    }

    /**
     * Sets up a listener for changes in local storage.
     */
    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.pokemonCollection) {
                console.log('Pokemon collection changed, triggering immediate sync');
                this.loadCollection();
                
                if (this.state.canSync()) {
                    setTimeout(() => this.triggerImmediateSync('new_pokemon'), 100);
                }
            }
        });
    }

    /**
     * Displays the Pokémon collection in the UI.
     */
    displayCollection() {
        const sortedCollection = this.dom.displayCollection(this.currentCollection);
        this.dom.updateStats(this.currentCollection);
        
        if (sortedCollection?.length > 0) {
            this.setupPokemonClickListeners(sortedCollection);
        }
    }

    /**
     * Sets up click listeners for each Pokémon item.
     * @param {Array} collection - The sorted Pokémon collection.
     */
    setupPokemonClickListeners(collection) {
        const pokemonItems = this.dom.elements.pokemon_collection?.querySelectorAll('.pokemon-item');
        pokemonItems?.forEach((item, index) => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => this.pokemon.openPokemonDetail(collection[index]));
        });
    }

    /**
     * Sets up event listeners for UI elements.
     */
    setupEventListeners() {
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

    /**
     * Sets up listeners for network online/offline status changes.
     */
    setupNetworkListeners() {
        const handleOnlineStatus = () => {
            if (navigator.onLine && this.state.canSync()) {
                this.dom.updateSyncStatus('Reconnected - checking for updates...', 'syncing');
                setTimeout(() => this.handleInitialSync(), 1000);
            } else if (!navigator.onLine) {
                this.dom.updateSyncStatus('Offline mode', 'local');
            }
        };

        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);
    }
}

// Initialize the application when the DOM is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const app = new PopupApp();
    app.initialize();
});

// Export for testing purposes.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PopupApp };
}
