import { CONFIG } from './config.js';
import { Utils } from './utils/Utils.js';

/**
 * Manages DOM manipulations and updates.
 */
export class DOMManager {
    /**
     * Initializes the DOMManager.
     */
    constructor() {
        this.elements = this.initializeElements();
        this.syncIndicator = null;
    }

    /**
     * Initializes and caches DOM elements.
     * @returns {Object} - A dictionary of DOM elements.
     */
    initializeElements() {
        const elementIds = [
            'auth-section', 'logged-out-state', 'logged-in-state', 'login-btn',
            'logout-btn', 'user-email', 'sync-status', 'pokemon-collection',
            'total-caught', 'unique-count'
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
     * @param {Object} user - The current user.
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
     * @param {string} message - The message to display.
     * @param {string} type - The type of status (e.g., 'local', 'syncing', 'synced').
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
     * @param {string} buttonName - The name of the button element.
     * @param {boolean} disabled - Whether the button should be disabled.
     */
    setButtonState(buttonName, disabled) {
        const button = this.elements[buttonName];
        if (button) button.disabled = disabled;
    }

    /**
     * Displays the Pokémon collection.
     * @param {Array} collection - The collection of Pokémon.
     * @returns {Array} - The sorted collection.
     */
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
     * @param {Array} collection - The collection of Pokémon.
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
}
