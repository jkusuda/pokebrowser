import { AppState } from './AppState.js';
import { PokemonDetailDOMManager as DOMManager } from './PokemonDetailDOMManager.js';
import { APIService } from './services/ApiService.js';
import { AuthService } from './services/AuthService.js';
import { PokemonService } from './services/PokemonService.js';
import { Utils } from './utils/Utils.js';

/**
 * Main controller for the Pokémon detail page.
 */
class PokemonDetailApp {
    /**
     * Initializes the application.
     */
    constructor() {
        this.state = new AppState();
        this.dom = new DOMManager();
        this.auth = new AuthService(this.state);
        this.pokemonService = new PokemonService(this.state);
        this.isInitialized = false;
    }

    /**
     * Initializes the application state and fetches data.
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            this.dom.showLoading();
            await this.initializeAuth();
            
            const pokemonParams = Utils.parseURLParams();
            this.state.setPokemon(pokemonParams);
            
            this.setInitialUI(pokemonParams);
            await this.fetchPokemonData(pokemonParams.id);
            
            this.setupEventListeners();
            this.dom.showDetails();
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing app:', error);
            this.dom.showError(error.message);
        }
    }

    /**
     * Initializes the authentication service.
     */
    async initializeAuth() {
        try {
            const client = await this.auth.initializeSupabase();
            this.state.setSupabase(client);
            const user = await this.auth.initializeAuth();
            this.state.setUser(user);
        } catch (error) {
            console.warn('Auth initialization failed:', error);
        }
    }

    /**
     * Sets the initial UI state.
     * @param {Object} pokemon - The Pokémon data.
     */
    setInitialUI(pokemon) {
        if (pokemon.name) {
            this.dom.elements.pokemon_name.textContent = Utils.capitalizeFirst(pokemon.name);
        }
        this.dom.elements.pokemon_id.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
        this.dom.updateCatchInfo(pokemon);
    }

    /**
     * Fetches Pokémon data from the API.
     * @param {number} pokemonId - The ID of the Pokémon to fetch.
     */
    async fetchPokemonData(pokemonId) {
        try {
            const pokemonData = await APIService.fetchPokemonData(pokemonId, this.state.getCache());
            this.state.setPokemonData(pokemonData);
            
            this.dom.updateBasicInfo(pokemonData);
            this.dom.updateSprite(pokemonData);
            this.dom.updateTypes(pokemonData);
            this.dom.updateCandies(pokemonData);
        } catch (error) {
            console.error('Error fetching Pokemon data:', error);
            throw new Error('Failed to load Pokemon data');
        }
    }

    /**
     * Sets up event listeners for UI elements.
     */
    setupEventListeners() {
        this.dom.elements.evolve_btn?.addEventListener('click', () => alert('Evolution feature coming soon!'));
        this.dom.elements.summon_btn?.addEventListener('click', () => alert('Summon feature coming soon!'));
        this.dom.elements.release_btn?.addEventListener('click', () => this.handleRelease());
    }

    /**
     * Handles the release of a Pokémon.
     */
    async handleRelease() {
        if (!confirm('Are you sure you want to release this Pokemon? This action cannot be undone.')) {
            return;
        }

        try {
            this.dom.setButtonState('release_btn', true, 'Releasing...');
            const result = await this.pokemonService.releasePokemon(this.state.currentPokemon);
            
            if (result.success) {
                alert('Pokemon released! 💔');
                await Utils.delay(500);
                window.close();
            }
        } catch (error) {
            console.error('Error releasing Pokemon:', error);
            alert(`Failed to release Pokemon: ${error.message}`);
        } finally {
            this.dom.setButtonState('release_btn', false, 'Release');
        }
    }
}

// Initialize the application when the DOM is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const app = new PokemonDetailApp();
    app.initialize();
});

// Export for testing purposes.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PokemonDetailApp };
}
