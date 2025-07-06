import { AppState } from '../AppState.js';
import { PokemonDetailDOMManager as DOMManager } from '../dom/PokemonDetailDOMManager.js';
import { APIService } from '../services/ApiService.js';
import { AuthService } from '../services/AuthService.js';
import { PokemonService } from '../services/PokemonService.js';
import { StorageService } from '../services/StorageService.js';
import { Utils } from '../utils/Utils.js';

/**
 * Main controller for the Pokémon detail page.
 */
class PokemonDetailApp {
    constructor() {
        this.state = new AppState();
        this.dom = new DOMManager();
        this.auth = new AuthService(this.state);
        this.pokemonService = new PokemonService(this.state);
    }

    async initialize() {
        try {
            this.dom.setViewState('loading');
            await this.initializeAuth();

            const params = Utils.parseURLParams();
            const collection = await StorageService.getPokemonCollection();
            const pokemon = collection.find(p =>
                p.id.toString() === params.id.toString() &&
                p.caughtAt === params.caughtAt &&
                p.site === params.site
            ) || params;

            this.state.setPokemon(pokemon);
            this.updateUI(pokemon);
            await this.fetchApiData(pokemon.id);

            this.setupEventListeners();
            this.dom.setViewState('details');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.dom.setViewState('error', error.message);
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

    updateUI(pokemon) {
        const name = pokemon.name ? Utils.capitalizeFirst(pokemon.name) : 'Unknown';
        this.dom.elements.pokemon_name.textContent = pokemon.shiny ? `${name} ⭐` : name;
        this.dom.elements.pokemon_id.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
        this.dom.updateSprite(pokemon, pokemon.shiny);
        this.dom.updateCatchInfo(pokemon);
    }

    /**
     * Fetches additional Pokémon data from the API.
     * @param {number} pokemonId - The ID of the Pokémon to fetch.
     */
    async fetchApiData(pokemonId) {
        try {
            const cache = this.state.getCache();
            const pokemonData = await APIService.fetchPokemonData(pokemonId, cache);
            this.state.setPokemonData(pokemonData);
            
            // Update UI with API data
            this.dom.updateTypes(pokemonData);
            this.dom.updateTypesLabel(pokemonData);
            this.dom.updatePhysicalStats(pokemonData);
            this.dom.updateCandies(pokemonData);

            // Fetch and update species data
            const speciesData = await APIService.fetchSpeciesData(pokemonId, cache);
            this.dom.updateDescription(speciesData);

        } catch (error) {
            console.error('Error fetching API data:', error);
            // Don't throw, as basic info is already displayed
        }
    }

    setupEventListeners() {
        const { elements } = this.dom;
        elements.evolve_btn?.addEventListener('click', () => this.showAlert('Evolution feature coming soon!'));
        elements.summon_btn?.addEventListener('click', () => this.showAlert('Summon feature coming soon!'));
        elements.release_btn?.addEventListener('click', () => this.handleRelease());
    }

    showAlert(message) {
        alert(message);
    }

    async handleRelease() {
        if (!confirm('Are you sure you want to release this Pokémon? This action cannot be undone.')) {
            return;
        }

        const releaseButton = this.dom.elements.release_btn;
        this.dom.setButtonState(releaseButton, true, 'Releasing...');

        try {
            await this.pokemonService.releasePokemon(this.state.currentPokemon);
            this.showAlert('Pokémon released! 💔');
            await Utils.delay(500);
            window.close();
        } catch (error) {
            console.error('Error releasing Pokémon:', error);
            this.showAlert(`Failed to release Pokémon: ${error.message}`);
            this.dom.setButtonState(releaseButton, false, 'Release');
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
