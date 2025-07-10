// popup.js - Main controller for the popup app.
import { AppState } from '../AppState.js';
import { AuthService } from '../services/AuthService.js';
import { SyncService } from '../services/SyncService.js';
import { PokemonService } from '../services/PokemonService.js';
import { StorageService } from '../services/StorageService.js';
import { CONFIG } from '../config.js';
import { Utils } from '../utils/Utils.js';

class PopupApp {
    constructor() {
        this.state = new AppState();
        this.auth = new AuthService(this.state);
        this.sync = new SyncService(this.state);
        this.pokemon = new PokemonService(this.state);
        this.currentCollection = [];
        this.syncIndicator = null;
        this.elements = this.initializeElements();
    }

    /**
     * Initializes and caches DOM elements.
     */
    initializeElements() {
        const elementIds = [
            'auth-section', 'logged-out-state', 'logged-in-state', 'login-btn',
            'logout-btn', 'user-email', 'sync-status', 'pokemon-collection',
            'total-caught', 'unique-count', 'view-pokedex-btn'
        ];

        return elementIds.reduce((acc, id) => {
            const element = document.getElementById(id);
            if (element) {
                acc[id.replace(/-/g, '_')] = element;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
            return acc;
        }, {});
    }

    // Initializes the application, including Supabase, authentication, and event listeners.
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
            this.showLoggedOutState();
        }
    }

    /**
     * Displays the logged-out state.
     */
    showLoggedOutState() {
        this.elements.logged_out_state?.classList.remove('hidden');
        this.elements.logged_in_state?.classList.add('hidden');
        this.updateSyncStatus('Local storage only', 'local');
    }

    /**
     * Displays the logged-in state.
     */
    showLoggedInState(user) {
        this.elements.logged_out_state?.classList.add('hidden');
        this.elements.logged_in_state?.classList.remove('hidden');

        if (user && this.elements.user_email) {
            this.elements.user_email.textContent = `Trainer: ${user.email}`;
            this.updateSyncStatus('Cloud sync enabled', 'synced');
        }
    }

    /**
     * Updates the synchronization status message.
     */
    updateSyncStatus(message, type = 'local') {
        console.log(`Sync status: ${message} (${type})`);
        
        if (this.elements.sync_status) {
            this.elements.sync_status.textContent = message;
            this.elements.sync_status.className = `sync-status ${type}`;
            
            if (type === 'syncing') {
                this.showSyncIndicator();
            } else {
                this.hideSyncIndicator();
            }
        }
    }

    /**
     * Displays a visual indicator for synchronization.
     */
    showSyncIndicator() {
        if (!this.syncIndicator) {
            this.syncIndicator = document.createElement('div');
            this.syncIndicator.className = 'sync-indicator';
            this.syncIndicator.innerHTML = '🔄';
            this.syncIndicator.style.cssText = `
                position: fixed; top: 10px; right: 10px;
                background: rgba(0,0,0,0.8); color: white;
                padding: 5px 10px; border-radius: 15px;
                font-size: 12px; z-index: 10000;
                animation: pulse 1s infinite;
            `;
            document.body.appendChild(this.syncIndicator);
        }
    }

    /**
     * Hides the synchronization indicator.
     */
    hideSyncIndicator() {
        if (this.syncIndicator) {
            this.syncIndicator.remove();
            this.syncIndicator = null;
        }
    }

    /**
     * Sets the disabled state of a button.
     */
    setButtonState(buttonName, disabled) {
        const button = this.elements[buttonName];
        if (button) button.disabled = disabled;
    }

    /**
     * Renders the Pokémon collection HTML and returns sorted collection.
     */
    renderCollectionHTML(collection) {
        if (!this.elements.pokemon_collection) return [];

        if (collection.length === 0) {
            this.elements.pokemon_collection.innerHTML = `
                <div class="empty-state">
                    <h3>POKEDEX EMPTY</h3>
                    <p>Scan web pages to detect wild Pokémon and begin data collection...</p>
                </div>
            `;
            return [];
        }

        const sortedCollection = [...collection].sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt));

        this.elements.pokemon_collection.innerHTML = sortedCollection.map((pokemon, index) => `
            <div class="pokemon-item clickable-pokemon" data-pokemon-index="${index}">
                <div class="pokemon-sprite">
                    <img src="${CONFIG.SPRITE_BASE_URL}/${pokemon.shiny ? 'shiny/' : ''}${pokemon.id}.png" 
                         alt="${pokemon.name}" onerror="this.style.display='none'">
                </div>
                <div class="pokemon-info">
                    <div class="pokemon-name">${pokemon.name}</div>
                    <div class="pokemon-details">
                        ${pokemon.level ? `Lv.${pokemon.level}` : ''}${(pokemon.level && pokemon.types?.length) ? ' • ' : ''}${pokemon.types?.join('/') || ''}
                        <br>Caught on ${pokemon.site} • ${Utils.formatDate(pokemon.caughtAt)}
                    </div>
                </div>
            </div>
        `).join('');

        return sortedCollection;
    }

    /**
     * Updates the statistics display.
     */
    updateStats(collection) {
        const totalCaught = collection.length;
        const uniquePokemon = new Set(collection.map(p => p.id)).size;

        if (this.elements.total_caught) {
            this.elements.total_caught.textContent = String(totalCaught).padStart(3, '0');
        }
        if (this.elements.unique_count) {
            this.elements.unique_count.textContent = String(uniquePokemon).padStart(3, '0');
        }
    }

    // Initializes the Supabase client.
    async initializeSupabase() {
        try {
            await this.auth.initializeSupabase();
            console.log('Supabase initialized successfully');
        } catch (error) {
            console.warn('Supabase initialization failed:', error);
            this.updateSyncStatus(error.message, 'error');
        }
    }

    //Initializes authentication and sets up listeners for auth state changes.
    async initializeAuth() {
        if (!this.state.supabase) return;

        try {
            const user = await this.auth.initializeAuth();
            
            // Notify background script of current authentication state
            if (user) {
                try {
                    const { data: { session } } = await this.state.supabase.auth.getSession();
                    if (session && chrome.runtime && chrome.runtime.sendMessage) {
                        await chrome.runtime.sendMessage({
                            type: 'AUTH_STATE_CHANGED',
                            data: { session }
                        });
                    }
                } catch (error) {
                    console.error('❌ Failed to send initial auth state to background:', error);
                }
                
                this.showLoggedInState(user);
                await this.handleInitialSync();
            } else {
                this.showLoggedOutState();
            }

            this.auth.setupAuthStateListener(async (event, user) => {
                if (event === 'SIGNED_IN') {
                    this.showLoggedInState(user);
                    await this.handleSignIn();
                } else if (event === 'SIGNED_OUT') {
                    this.showLoggedOutState();
                    await this.loadCollection();
                }
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
            this.updateSyncStatus('Auth system offline', 'error');
        }
    }

    /**
     * Triggers an immediate synchronization with the server.
     * @param {string} reason - The reason for the sync.
     */
    async triggerImmediateSync(reason = 'user_action') {
        if (!this.state.canSync()) return;

        console.log(`Triggering immediate sync: ${reason}`);
        this.updateSyncStatus('Syncing...', 'syncing');

        try {
            const result = await this.sync.immediateSync(this.currentCollection);
            if (result) {
                this.updateSyncStatus(result.message, 'synced');
                console.log('Immediate sync completed:', result);
            }
        } catch (error) {
            console.error('Immediate sync failed:', error);
            this.updateSyncStatus('Sync failed', 'error');
        }
    }

    // Handles the initial synchronization when the app loads.
    async handleInitialSync() {
        try {
            this.updateSyncStatus('Syncing from cloud...', 'syncing');
            const result = await this.sync.syncFromCloud();
            
            if (result.merged) {
                this.currentCollection = result.collection;
                this.displayCollectionUI();
                this.updateSyncStatus(`Synced from cloud (${result.newCount} new)`, 'synced');
            } else {
                this.updateSyncStatus('Already up to date', 'synced');
            }

            if (this.currentCollection.length > 0) {
                setTimeout(() => this.triggerImmediateSync('initial_sync'), 500);
            }
        } catch (error) {
            console.error('Initial sync error:', error);
            this.updateSyncStatus(`Sync failed: ${error.message}`, 'error');
        }
    }

    // Handles the sign-in process.
    async handleSignIn() {
        try {
            await this.handleInitialSync();
        } catch (error) {
            console.error('Sign in sync error:', error);
        }
    }

    // Loads the Pokémon collection from storage.
    async loadCollection() {
        try {
            const collection = await StorageService.getPokemonCollection();
            this.currentCollection = collection;
            this.displayCollectionUI();

            if (this.state.canSync() && collection.length > 0) {
                setTimeout(() => this.triggerImmediateSync('load_collection'), 200);
            }
        } catch (error) {
            console.error('Error loading collection:', error);
        }
    }

    // Sets up a listener for changes in local storage.
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

    // Displays the Pokémon collection in the UI.
    displayCollectionUI() {
        const sortedCollection = this.renderCollectionHTML(this.currentCollection);
        this.updateStats(this.currentCollection);
        
        if (sortedCollection?.length > 0) {
            this.setupPokemonClickListeners(sortedCollection);
        }
    }

    /**
     * Sets up click listeners for each Pokémon item.
     * @param {Array} collection - The sorted Pokémon collection.
     */
    setupPokemonClickListeners(collection) {
        const pokemonItems = this.elements.pokemon_collection?.querySelectorAll('.pokemon-item');
        pokemonItems?.forEach((item, index) => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => this.pokemon.openPokemonDetail(collection[index]));
        });
    }

    // Sets up event listeners for UI elements.
    setupEventListeners() {
        this.elements.login_btn?.addEventListener('click', async () => {
            try {
                const user = await this.auth.openAuthPopup();
                if (user) {
                    this.showLoggedInState(user);
                    await this.handleSignIn();
                }
            } catch (error) {
                console.error('Login error:', error);
            }
        });

        this.elements.logout_btn?.addEventListener('click', async () => {
            try {
                this.setButtonState('logout_btn', true);
                this.updateSyncStatus('Signing out...', 'syncing');
                await this.auth.handleLogout();
                this.showLoggedOutState();
                await this.loadCollection();
            } catch (error) {
                console.error('Logout error:', error);
                this.updateSyncStatus('Error signing out', 'error');
            } finally {
                this.setButtonState('logout_btn', false);
            }
        });

        this.elements.view_pokedex_btn?.addEventListener('click', () => {
            if (this.state.currentUser) {
                chrome.tabs.create({ url: chrome.runtime.getURL('pokedex.html') });
            } else {
                alert('Please log in to view the Pokedex.');
            }
        });
    }

    // Sets up listeners for network online/offline status changes.
    setupNetworkListeners() {
        const handleOnlineStatus = () => {
            if (navigator.onLine && this.state.canSync()) {
                this.updateSyncStatus('Reconnected - checking for updates...', 'syncing');
                setTimeout(() => this.handleInitialSync(), 1000);
            } else if (!navigator.onLine) {
                this.updateSyncStatus('Offline mode', 'local');
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
