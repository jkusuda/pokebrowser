import { StorageService } from './StorageService.js';
import { APIService } from './ApiService.js';
import { CONFIG } from '../config.js';
import { AppState } from '../AppState.js';
import { CandyService } from './CandyService.js';
import { HistoryService } from './HistoryService.js';
import { SecurityValidator } from '../utils/SecurityValidator.js';

/**
 * Unified Pokemon service that handles all Pokemon-related operations
 * Consolidates functionality from PokemonManager, PokedexService, and original PokemonService
 */
export class PokemonService {
    constructor(sharedAppState = null) {
        this.appState = sharedAppState || new AppState();
        this.candyService = null;
        this.historyService = null;
        this.servicesInitialized = false;
        this.allPokemon = [];
        this.userCollection = [];
    }

    /**
     * Initialize all required services
     */
    async initializeServices() {
        if (this.servicesInitialized) return;

        try {
            // Initialize Supabase if needed
            if (!this.appState.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
                console.log('🔧 PokemonService: Initializing Supabase...');
                const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
                this.appState.setSupabase(client);

                const { data: { session } } = await client.auth.getSession();
                if (session) {
                    console.log('🔧 PokemonService: Found existing session for', session.user.email);
                    this.appState.setUser(session.user);
                }
            }

            // Initialize dependent services if user is authenticated
            if (this.appState.isLoggedIn()) {
                if (!this.candyService) {
                    this.candyService = new CandyService(this.appState);
                }
                if (!this.historyService) {
                    this.historyService = new HistoryService(this.appState);
                }
            }

            this.servicesInitialized = true;
            this.appState.logAuthStatus();
        } catch (error) {
            console.error('❌ Error initializing PokemonService:', error);
        }
    }

    /**
     * Load complete Pokedex data with user collection, candy, and history
     */
    async loadPokedex() {
        await this.initializeServices();

        const [allPokemon, userCollection] = await Promise.all([
            APIService.fetchAllPokemon(151),
            StorageService.getPokemonCollection()
        ]);

        this.allPokemon = allPokemon;
        this.userCollection = userCollection;

        const userCollectionById = new Map(userCollection.map(p => [p.id, p]));

        // Load candy and history data
        let candyData = new Map();
        let historyData = new Set();

        if (this.candyService) {
            try {
                candyData = await this.candyService.getCandyForUser();
            } catch (error) {
                console.error('Error loading candy data:', error);
            }
        }

        if (this.historyService) {
            try {
                historyData = await this.historyService.getHistoryForUser();
                console.log(`📚 Loaded history for ${historyData.size} Pokemon`);
            } catch (error) {
                console.error('Error loading history data:', error);
            }
        }

        // Merge all data
        this.allPokemon = this.allPokemon.map(p => {
            const caughtPokemon = userCollectionById.get(p.id);
            const candyCount = candyData.get(p.id) || 0;
            const everOwned = historyData.has(p.id);
            
            if (caughtPokemon) {
                return { ...p, ...caughtPokemon, caught: true, everOwned: true, candyCount };
            } else {
                return { ...p, caught: false, everOwned, candyCount };
            }
        });

        return this.allPokemon;
    }

    /**
     * Get collection statistics
     */
    getStats() {
        const total = this.userCollection.length;
        const unique = new Set(this.userCollection.map(p => p.id)).size;
        const everOwnedCount = this.allPokemon ? this.allPokemon.filter(p => p.everOwned).length : 0;
        const completion = ((everOwnedCount / 151) * 100).toFixed(1);
        
        return { total, unique, completion, everOwned: everOwnedCount };
    }

    /**
     * Filter and sort Pokemon data
     */
    filterAndSort(query, sortBy) {
        let filtered = this.allPokemon;

        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                String(p.id).includes(lowerQuery)
            );
        }

        switch (sortBy) {
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'caughtAt':
                filtered.sort((a, b) => {
                    if (a.caught && !b.caught) return -1;
                    if (!a.caught && b.caught) return 1;
                    if (!a.caught && !b.caught) return a.id - b.id;
                    return new Date(b.caughtAt) - new Date(a.caughtAt);
                });
                break;
            case 'id':
            default:
                filtered.sort((a, b) => a.id - b.id);
                break;
        }

        return filtered;
    }

    /**
     * Catch a Pokemon and add it to the collection
     */
    async catchPokemon(pokemon) {
        try {
            const caughtPokemon = { 
                ...pokemon, 
                caughtAt: new Date().toISOString(), 
                site: window.location.hostname, 
                shiny: pokemon.shiny || false 
            };

            // Security: Validate Pokemon data before catching
            const securityCheck = await SecurityValidator.validateRequest('catch_pokemon', caughtPokemon, this.appState.currentUser);
            if (!securityCheck.valid) {
                throw new Error(`Security validation failed: ${securityCheck.error}`);
            }

            // Use sanitized data
            const sanitizedPokemon = securityCheck.sanitizedData;

            // Check collection size limits
            const result = await chrome.storage.local.get(['pokemonCollection']);
            const collection = result.pokemonCollection || [];
            
            if (collection.length >= CONFIG.MAX_POKEMON_PER_USER) {
                throw new Error(`Collection limit reached (${CONFIG.MAX_POKEMON_PER_USER})`);
            }

            collection.push(sanitizedPokemon);
            await chrome.storage.local.set({ pokemonCollection: collection });

            // Background script handles candy addition via POKEMON_CAUGHT message

            return { success: true };
        } catch (error) {
            console.error('Error catching Pokemon:', error);
            throw error;
        }
    }

    /**
     * Release a Pokemon from the collection
     */
    async releasePokemon(pokemonToRelease) {
        try {
            // Remove from cloud if syncing is available
            if (this.appState.canSync()) {
                const { error } = await this.appState.supabase
                    .from('pokemon')
                    .eq('user_id', this.appState.currentUser.id)
                    .eq('pokemon_id', pokemonToRelease.pokemon_id || pokemonToRelease.id)
                    .eq('site_caught', pokemonToRelease.site)
                    .eq('caught_at', pokemonToRelease.caughtAt)
                    .delete();
                if (error) throw error;
            }

            // Remove from local storage
            const removed = await StorageService.removePokemonFromCollection(pokemonToRelease);
            if (!removed) {
                throw new Error('Pokemon not found in collection');
            }

            // Send message to background script for candy addition
            if (chrome.runtime && chrome.runtime.sendMessage) {
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'POKEMON_RELEASED',
                        data: { pokemon: { id: pokemonToRelease.pokemon_id || pokemonToRelease.id } }
                    });
                    
                    if (response && response.success) {
                        console.log('✅ Pokemon released message sent successfully - Candy added!');
                    }
                } catch (candyError) {
                    console.error('❌ Error sending Pokemon released message:', candyError);
                    // Don't fail the release if candy message fails
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error releasing Pokemon:', error);
            throw error;
        }
    }

    /**
     * Open Pokemon detail window
     */
    openPokemonDetail(pokemon) {
        const url = chrome.runtime.getURL('pokemon-detail.html');
        const params = new URLSearchParams({
            id: pokemon.id,
            name: pokemon.name,
            caughtAt: pokemon.caughtAt,
            site: pokemon.site,
            shiny: pokemon.shiny || false
        });

        chrome.windows.create({
            url: `${url}?${params.toString()}`,
            type: 'popup',
            width: 500,
            height: 600,
            focused: true
        });
    }

    /**
     * Refresh candy data for all Pokemon
     */
    async refreshCandyData() {
        if (!this.candyService) return this.allPokemon;

        try {
            const candyData = await this.candyService.getCandyForUser();
            
            this.allPokemon = this.allPokemon.map(p => ({
                ...p,
                candyCount: candyData.get(p.id) || 0
            }));
            
            return this.allPokemon;
        } catch (error) {
            console.error('Error refreshing candy data:', error);
            return this.allPokemon;
        }
    }

    /**
     * Refresh history data for all Pokemon
     */
    async refreshHistoryData() {
        if (!this.historyService) return this.allPokemon;

        try {
            const historyData = await this.historyService.getHistoryForUser();
            
            this.allPokemon = this.allPokemon.map(p => ({
                ...p,
                everOwned: historyData.has(p.id)
            }));
            
            return this.allPokemon;
        } catch (error) {
            console.error('Error refreshing history data:', error);
            return this.allPokemon;
        }
    }

    /**
     * Refresh all data (candy and history) for all Pokemon
     */
    async refreshAllData() {
        try {
            await this.initializeServices();
            
            let candyData = new Map();
            let historyData = new Set();

            if (this.candyService) {
                candyData = await this.candyService.getCandyForUser();
            }

            if (this.historyService) {
                historyData = await this.historyService.getHistoryForUser();
            }
            
            this.allPokemon = this.allPokemon.map(p => ({
                ...p,
                candyCount: candyData.get(p.id) || 0,
                everOwned: historyData.has(p.id)
            }));
            
            return this.allPokemon;
        } catch (error) {
            console.error('Error refreshing all data:', error);
            return this.allPokemon;
        }
    }
}
