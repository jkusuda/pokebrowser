import { PokemonEntryDOMManager } from '../dom/PokemonEntryDOMManager.js';
import { APIService } from '../services/ApiService.js';
import { HistoryService } from '../services/HistoryService.js';
import { AuthService } from '../services/AuthService.js';
import { AppState } from '../AppState.js';
import { Utils } from '../utils/Utils.js';

class PokemonEntryApp {
    constructor() {
        this.dom = new PokemonEntryDOMManager();
        this.cache = new Map();
        this.state = new AppState();
        this.auth = new AuthService(this.state);
    }

    async init() {
        this.dom.setViewState('loading');
        try {
            const params = Utils.parseURLParams();
            const pokemonId = params.id;

            if (!pokemonId) {
                throw new Error('No Pokémon ID provided.');
            }

            console.log('🔧 PokemonEntry: Loading Pokemon', pokemonId);

            // Fetch Pokemon data
            const [pokemonData, speciesData] = await Promise.all([
                APIService.fetchPokemonData(pokemonId, this.cache),
                APIService.fetchSpeciesData(pokemonId, this.cache)
            ]);

            // Initialize authentication properly (like pokemon-detail.js)
            let historyData = null;
            try {
                console.log('🔧 PokemonEntry: Initializing authentication...');
                const client = await this.auth.initializeSupabase();
                this.state.setSupabase(client);
                const user = await this.auth.initializeAuth();
                this.state.setUser(user);
                
                console.log('🔧 PokemonEntry: Auth initialized, user:', user?.email);
                
                if (user) {
                    const historyService = new HistoryService(this.state);
                    historyData = await historyService.getFirstCaughtData(parseInt(pokemonId));
                    console.log('📚 History data:', historyData);
                } else {
                    console.log('🔧 PokemonEntry: No authenticated user found');
                }
            } catch (error) {
                console.error('❌ Error with authentication or history data:', error);
                // Continue without history data
            }

            this.dom.render(pokemonData, speciesData, historyData);
            this.dom.setViewState('details');
        } catch (error) {
            console.error('Error initializing Pokémon entry page:', error);
            this.dom.setViewState('error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new PokemonEntryApp();
    app.init();
});
