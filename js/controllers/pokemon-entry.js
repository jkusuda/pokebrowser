import { PokemonEntryDOMManager } from '../dom/PokemonEntryDOMManager.js';
import { APIService } from '../services/ApiService.js';
import { HistoryService } from '../services/HistoryService.js';
import { AppState } from '../AppState.js';
import { CONFIG } from '../config.js';
import { Utils } from '../utils/Utils.js';

class PokemonEntryApp {
    constructor() {
        this.dom = new PokemonEntryDOMManager();
        this.cache = new Map();
        this.appState = new AppState();
        this.historyService = null;
    }

    async initializeServices() {
        try {
            // Initialize Supabase if not already initialized
            if (!this.appState.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
                console.log('🔧 PokemonEntry: Initializing Supabase...');
                const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
                this.appState.setSupabase(client);

                // Check for existing session
                const { data: { session } } = await client.auth.getSession();
                if (session) {
                    console.log('🔧 PokemonEntry: Found existing session for', session.user.email);
                    this.appState.setUser(session.user);
                } else {
                    console.log('🔧 PokemonEntry: No existing session found');
                }
            }

            // Initialize HistoryService if user is authenticated
            if (this.appState.isLoggedIn()) {
                if (!this.historyService) {
                    console.log('🔧 PokemonEntry: Initializing HistoryService...');
                    this.historyService = new HistoryService(this.appState);
                }
            } else {
                console.log('🔧 PokemonEntry: User not authenticated, skipping HistoryService');
            }
        } catch (error) {
            console.error('❌ Error initializing PokemonEntry services:', error);
        }
    }

    async init() {
        this.dom.setViewState('loading');
        try {
            // Initialize services first
            await this.initializeServices();

            const params = Utils.parseURLParams();
            const pokemonId = params.id;

            if (!pokemonId) {
                throw new Error('No Pokémon ID provided.');
            }

            console.log('🔧 PokemonEntry: Loading Pokemon', pokemonId);

            // Fetch Pokemon data
            const pokemonData = await APIService.fetchPokemonData(pokemonId, this.cache);
            const speciesData = await APIService.fetchSpeciesData(pokemonId, this.cache);

            // Fetch history data if available
            let historyData = null;
            if (this.historyService) {
                try {
                    console.log('🔧 PokemonEntry: Fetching history for Pokemon', pokemonId);
                    historyData = await this.historyService.getFirstCaughtData(parseInt(pokemonId));
                    console.log('📚 History data for Pokemon', pokemonId, ':', historyData);
                } catch (error) {
                    console.error('❌ Error fetching history data:', error);
                }
            } else {
                console.log('🔧 PokemonEntry: No HistoryService available, showing without history');
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
