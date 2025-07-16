import { StorageService } from './StorageService.js';
import { APIService } from './ApiService.js';
import { CONFIG } from '../shared/config.js';
import { AppState } from '../utils/AppState.js';
import { CandyService } from './CandyService.js';
import { HistoryService } from './HistoryService.js';
import { SecurityValidator } from '../utils/SecurityValidator.js';
import { supabase } from '../shared/supabase-client.js';

// Main service for all Pokemon operations - catching, releasing, data management
export class PokemonService {
    constructor(sharedAppState = null) {
        this.appState = sharedAppState || new AppState();
        this.candyService = null;
        this.historyService = null;
        this.servicesInitialized = false;
        this.allPokemon = [];
        this.userCollection = [];
    }

    // Set up dependent services and Supabase connection
    async initializeServices() {
        if (this.servicesInitialized) return;

        try {
            // Initialize Supabase if needed
            if (!this.appState.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
                console.log('🔧 PokemonService: Initializing Supabase...');
                const client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
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

    // Load all Pokemon data with user collection, candy counts, and history
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
        let firstCaughtDates = new Map();

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
                
                // Load first caught dates for all Pokemon in history
                for (const pokemonId of historyData) {
                    try {
                        const historyRecord = await this.historyService.getFirstCaughtData(pokemonId);
                        if (historyRecord && historyRecord.first_caught_at) {
                            firstCaughtDates.set(pokemonId, historyRecord.first_caught_at);
                        }
                    } catch (error) {
                        console.error(`Error loading first caught date for Pokemon ${pokemonId}:`, error);
                    }
                }
                console.log(`📅 Loaded first caught dates for ${firstCaughtDates.size} Pokemon`);
            } catch (error) {
                console.error('Error loading history data:', error);
            }
        }

        // Merge all data
        this.allPokemon = this.allPokemon.map(p => {
            const caughtPokemon = userCollectionById.get(p.id);
            const candyCount = candyData.get(p.id) || 0;
            const everOwned = historyData.has(p.id);
            const firstCaughtAt = firstCaughtDates.get(p.id);
            
            if (caughtPokemon) {
                return { 
                    ...p, 
                    ...caughtPokemon, 
                    caught: true, 
                    everOwned: true, 
                    candyCount,
                    firstCaughtAt: firstCaughtAt || caughtPokemon.caughtAt
                };
            } else {
                return { 
                    ...p, 
                    caught: false, 
                    everOwned, 
                    candyCount,
                    firstCaughtAt
                };
            }
        });

        return this.allPokemon;
    }

    // Calculate user's collection statistics
    getStats() {
        const total = this.userCollection.length;
        const unique = new Set(this.userCollection.map(p => p.id)).size;
        const everOwnedCount = this.allPokemon ? this.allPokemon.filter(p => p.everOwned).length : 0;
        const completion = ((everOwnedCount / 151) * 100).toFixed(1);
        
        return { total, unique, completion, everOwned: everOwnedCount };
    }

    // Filter Pokemon by search query and sort by specified criteria
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
                    // Prioritize ever-owned Pokemon
                    if (a.everOwned && !b.everOwned) return -1;
                    if (!a.everOwned && b.everOwned) return 1;
                    if (!a.everOwned && !b.everOwned) return a.id - b.id;
                    
                    // Both have been owned, sort by first caught date
                    const aDate = a.firstCaughtAt || a.caughtAt;
                    const bDate = b.firstCaughtAt || b.caughtAt;
                    
                    if (!aDate && !bDate) return a.id - b.id;
                    if (!aDate) return 1;
                    if (!bDate) return -1;
                    
                    return new Date(bDate) - new Date(aDate); // Most recent first
                });
                break;
            case 'firstCaught':
                filtered.sort((a, b) => {
                    // Prioritize ever-owned Pokemon
                    if (a.everOwned && !b.everOwned) return -1;
                    if (!a.everOwned && b.everOwned) return 1;
                    if (!a.everOwned && !b.everOwned) return a.id - b.id;
                    
                    // Both have been owned, sort by first caught date
                    const aDate = a.firstCaughtAt;
                    const bDate = b.firstCaughtAt;
                    
                    if (!aDate && !bDate) return a.id - b.id;
                    if (!aDate) return 1;
                    if (!bDate) return -1;
                    
                    return new Date(aDate) - new Date(bDate); // Oldest first
                });
                break;
            case 'id':
            default:
                filtered.sort((a, b) => a.id - b.id);
                break;
        }

        return filtered;
    }

    // Add Pokemon to user's collection (cloud or local storage)
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

            // Check if user is logged in and can sync to cloud
            if (this.appState.canSync()) {
                console.log('🔄 User is logged in - saving Pokemon directly to Supabase');
                
                // Save directly to Supabase when logged in
                const pokemonToInsert = {
                    user_id: this.appState.currentUser.id,
                    pokemon_id: sanitizedPokemon.id,
                    name: sanitizedPokemon.name,
                    species: sanitizedPokemon.species || sanitizedPokemon.name,
                    level: sanitizedPokemon.level,
                    shiny: sanitizedPokemon.shiny || false,
                    site_caught: sanitizedPokemon.site,
                    caught_at: sanitizedPokemon.caughtAt
                };

                const { error: insertError } = await this.appState.supabase
                    .from('pokemon')
                    .insert([pokemonToInsert]);

                if (insertError) {
                    throw new Error(`Failed to save Pokemon to Supabase: ${insertError.message}`);
                }

                // Add to pokemon_history table
                if (this.historyService) {
                    await this.historyService.addToHistory(sanitizedPokemon.id);
                }

                console.log('✅ Pokemon saved directly to Supabase');
                
                // Send message to background script for candy addition
                if (chrome.runtime && chrome.runtime.sendMessage) {
                    try {
                        await chrome.runtime.sendMessage({
                            type: 'POKEMON_CAUGHT',
                            data: { pokemon: sanitizedPokemon }
                        });
                    } catch (candyError) {
                        console.error('❌ Error sending Pokemon caught message:', candyError);
                        // Don't fail the catch if candy message fails
                    }
                }
            } else {
                console.log('📱 User is logged out - saving Pokemon to local storage (no candies)');
                
                // Check collection size limits for local storage
                const result = await chrome.storage.local.get(['pokemonCollection']);
                const collection = result.pokemonCollection || [];
                
                if (collection.length >= CONFIG.MAX_POKEMON_PER_USER) {
                    throw new Error(`Collection limit reached (${CONFIG.MAX_POKEMON_PER_USER})`);
                }

                // Save to local storage when logged out (no candies awarded)
                collection.push(sanitizedPokemon);
                await chrome.storage.local.set({ pokemonCollection: collection });
                
                // Add to local history
                await StorageService.addToHistory(sanitizedPokemon.id);
                
                console.log('✅ Pokemon saved to local storage');
            }

            return { success: true };
        } catch (error) {
            console.error('Error catching Pokemon:', error);
            throw error;
        }
    }

    // Remove Pokemon from collection and award candy
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

    // Open Pokemon detail popup window
    openPokemonDetail(pokemon) {
        const url = chrome.runtime.getURL('dist/src/pokemon-detail/index.html');
        const params = new URLSearchParams({
            id: pokemon.id,
            name: pokemon.name,
            caughtAt: pokemon.caughtAt,
            site: pokemon.site,
            shiny: pokemon.shiny || false
        });

        // Include Supabase ID if available (for logged-in users)
        if (pokemon.supabaseId) {
            params.set('supabaseId', pokemon.supabaseId);
        }

        chrome.windows.create({
            url: `${url}?${params.toString()}`,
            type: 'popup',
            width: 500,
            height: 600,
            focused: true
        });
    }

    // Update candy counts for all Pokemon from server
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

    // Update ownership history for all Pokemon from server
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

    // Update both candy and history data for all Pokemon
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
