import { AppState } from '../AppState.js';
import { PokemonDetailDOMManager as DOMManager } from '../dom/PokemonDetailDOMManager.js';
import { APIService } from '../services/ApiService.js';
import { AuthService } from '../services/AuthService.js';
import { PokemonService } from '../services/PokemonService.js';
import { CandyService } from '../services/CandyService.js';
import { EvolutionService } from '../services/EvolutionService.js';
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
        this.candyService = null;
        this.evolutionService = new EvolutionService(this.state);
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
            
            // Log auth status for debugging
            console.log('🔧 PokemonDetail: Auth initialized');
            this.state.logAuthStatus();
            
            // Initialize candy service if user is logged in
            if (user) {
                console.log('🔧 PokemonDetail: Initializing CandyService for user:', user.email);
                this.candyService = new CandyService(this.state);
            }
        } catch (error) {
            console.warn('❌ Auth initialization failed:', error);
            this.state.logAuthStatus();
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
            
            // Load candy data if user is logged in - use base candy ID
            let candyCount = 0;
            let baseCandyName = null;
            if (this.candyService) {
                try {
                    const candyData = await this.candyService.getCandyForUser();
                    const baseCandyId = this.evolutionService.getBaseCandyId(pokemonId);
                    candyCount = candyData.get(baseCandyId) || 0;
                    baseCandyName = this.evolutionService.getBaseCandyName(pokemonId);
                } catch (error) {
                    console.error('Error loading candy data:', error);
                }
            }
            
            // Check evolution availability
            const canEvolve = this.evolutionService.canEvolve(pokemonId);
            const evolutionInfo = canEvolve ? this.evolutionService.getEvolutionInfo(pokemonId) : null;
            
            // Update UI with API data
            this.dom.updateTypes(pokemonData);
            this.dom.updateTypesLabel(pokemonData);
            this.dom.updatePhysicalStats(pokemonData);
            this.dom.updateCandies(pokemonData, candyCount, evolutionInfo, baseCandyName);
            
            // Update evolution section
            this.dom.updateEvolutionSection(canEvolve, evolutionInfo, candyCount);

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
        elements.evolve_btn?.addEventListener('click', () => this.handleEvolution());
        elements.summon_btn?.addEventListener('click', () => this.showAlert('Summon feature coming soon!'));
        elements.release_btn?.addEventListener('click', () => this.handleRelease());
    }

    showAlert(message) {
        alert(message);
    }

    /**
     * Handles Pokemon evolution process.
     */
    async handleEvolution() {
        const pokemon = this.state.currentPokemon;
        const pokemonId = parseInt(pokemon.id || pokemon.pokemon_id);
        
        // Check if user is authenticated
        if (!this.candyService) {
            this.showAlert('You must be logged in to evolve Pokemon!');
            return;
        }

        // Get current candy count using base candy ID
        let currentCandy = 0;
        try {
            const candyData = await this.candyService.getCandyForUser();
            const baseCandyId = this.evolutionService.getBaseCandyId(pokemonId);
            currentCandy = candyData.get(baseCandyId) || 0;
        } catch (error) {
            console.error('Error getting candy count:', error);
            this.showAlert('Failed to check candy count. Please try again.');
            return;
        }

        // Get evolution info
        const evolutionInfo = this.evolutionService.getEvolutionInfo(pokemonId);
        if (!evolutionInfo) {
            this.showAlert('This Pokemon cannot evolve!');
            return;
        }

        // Validate evolution using base candy
        const validation = this.evolutionService.validateEvolutionWithBaseCandy(pokemonId, currentCandy);
        if (!validation.success) {
            this.showAlert(validation.message);
            return;
        }

        // Show confirmation dialog
        const confirmMessage = `Evolve ${Utils.capitalizeFirst(pokemon.name)} into ${evolutionInfo.name}?\n\nThis will cost ${evolutionInfo.candyCost} candy and cannot be undone.`;
        if (!confirm(confirmMessage)) {
            return;
        }

        // Disable button and show loading state
        const evolveButton = this.dom.elements.evolve_btn;
        const originalText = evolveButton.textContent;
        this.dom.setButtonState(evolveButton, true, 'Evolving...');

        try {
            // Perform evolution
            const result = await this.evolutionService.evolvePokemon(pokemon, currentCandy);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // Show success message
            const fromName = Utils.capitalizeFirst(pokemon.name);
            const toName = Utils.capitalizeFirst(result.evolvedPokemon.name);
            this.dom.showEvolutionSuccess(fromName, toName);

            // Update current Pokemon state
            this.state.setPokemon(result.evolvedPokemon);

            // Fetch new API data for evolved Pokemon
            const cache = this.state.getCache();
            const evolvedPokemonData = await APIService.fetchPokemonData(result.evolvedPokemon.id, cache);
            this.state.setPokemonData(evolvedPokemonData);

            // Update UI with evolved Pokemon
            this.dom.updateAfterEvolution(result.evolvedPokemon, evolvedPokemonData);

            // Wait for background script to process candy deduction, then refresh candy data
            console.log('⏳ Waiting for candy deduction to process...');
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
            
            console.log('🔄 Refreshing candy data after evolution...');
            const newCandyData = await this.candyService.refreshCandyData();
            const newBaseCandyId = this.evolutionService.getBaseCandyId(result.evolvedPokemon.id);
            const newCandyCount = newCandyData.get(newBaseCandyId) || 0;
            const newBaseCandyName = this.evolutionService.getBaseCandyName(result.evolvedPokemon.id);
            
            const newCanEvolve = this.evolutionService.canEvolve(result.evolvedPokemon.id);
            const newEvolutionInfo = newCanEvolve ? this.evolutionService.getEvolutionInfo(result.evolvedPokemon.id) : null;
            
            this.dom.updateCandies(evolvedPokemonData, newCandyCount, newEvolutionInfo, newBaseCandyName);
            this.dom.updateEvolutionSection(newCanEvolve, newEvolutionInfo, newCandyCount);
            
            console.log(`✅ UI updated with new candy count: ${newCandyCount} ${newBaseCandyName} candy`);

            // Fetch and update species data for evolved Pokemon
            try {
                const evolvedSpeciesData = await APIService.fetchSpeciesData(result.evolvedPokemon.id, cache);
                this.dom.updateDescription(evolvedSpeciesData);
            } catch (speciesError) {
                console.warn('Could not fetch evolved Pokemon species data:', speciesError);
            }

        } catch (error) {
            console.error('Error evolving Pokemon:', error);
            this.showAlert(`Evolution failed: ${error.message}`);
            
            // Restore button state
            this.dom.setButtonState(evolveButton, false, originalText);
        }
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
