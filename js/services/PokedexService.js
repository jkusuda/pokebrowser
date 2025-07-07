import { StorageService } from './StorageService.js';
import { APIService } from './ApiService.js';
import { CONFIG } from '../config.js';
import { AppState } from '../AppState.js';
import { CandyService } from './CandyService.js';
import { HistoryService } from './HistoryService.js';

export class PokedexService {
    constructor(sharedAppState = null) {
        // Use shared AppState if provided, otherwise create new one
        this.appState = sharedAppState || new AppState();
        this.candyService = null;
        this.historyService = null;
        this.servicesInitialized = false;
    }

    async initializeServices() {
        if (this.servicesInitialized) {
            return; // Already initialized
        }

        try {
            // Only initialize Supabase if not already initialized
            if (!this.appState.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
                console.log('🔧 PokedexService: Initializing Supabase...');
                const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
                this.appState.setSupabase(client);

                // Check for existing session
                const { data: { session } } = await client.auth.getSession();
                if (session) {
                    console.log('🔧 PokedexService: Found existing session for', session.user.email);
                    this.appState.setUser(session.user);
                } else {
                    console.log('🔧 PokedexService: No existing session found');
                }
            }

            // Initialize services if user is authenticated
            if (this.appState.isLoggedIn()) {
                if (!this.candyService) {
                    console.log('🔧 PokedexService: Initializing CandyService...');
                    this.candyService = new CandyService(this.appState);
                }
                if (!this.historyService) {
                    console.log('🔧 PokedexService: Initializing HistoryService...');
                    this.historyService = new HistoryService(this.appState);
                }
            } else {
                console.log('🔧 PokedexService: User not authenticated, skipping service initialization');
            }

            this.servicesInitialized = true;
            // Log current auth status for debugging
            this.appState.logAuthStatus();
        } catch (error) {
            console.error('❌ Error initializing PokedexService:', error);
        }
    }

    async loadPokedex() {
        // Wait for services to initialize
        await this.initializeServices();

        const [allPokemon, userCollection] = await Promise.all([
            APIService.fetchAllPokemon(151),
            StorageService.getPokemonCollection()
        ]);

        this.allPokemon = allPokemon;
        this.userCollection = userCollection;

        const userCollectionById = new Map(userCollection.map(p => [p.id, p]));

        // Load candy data if user is logged in
        let candyData = new Map();
        if (this.candyService) {
            try {
                candyData = await this.candyService.getCandyForUser();
            } catch (error) {
                console.error('Error loading candy data:', error);
            }
        }

        // Load history data if user is logged in
        let historyData = new Set();
        if (this.historyService) {
            try {
                historyData = await this.historyService.getHistoryForUser();
                console.log(`📚 Loaded history for ${historyData.size} Pokemon`);
            } catch (error) {
                console.error('Error loading history data:', error);
            }
        }

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

    getStats() {
        const total = this.userCollection.length;
        const unique = new Set(this.userCollection.map(p => p.id)).size;
        
        // Calculate completion based on ever-owned Pokemon (history)
        const everOwnedCount = this.allPokemon ? this.allPokemon.filter(p => p.everOwned).length : 0;
        const totalPossible = 151;
        const completion = totalPossible > 0 ? ((everOwnedCount / totalPossible) * 100).toFixed(1) : 0;
        
        return { total, unique, completion, everOwned: everOwnedCount };
    }

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
     * Refreshes candy data for all Pokemon
     */
    async refreshCandyData() {
        if (!this.candyService) {
            return;
        }

        try {
            const candyData = await this.candyService.getCandyForUser();
            
            // Update candy counts for all Pokemon
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
     * Refreshes history data for all Pokemon
     */
    async refreshHistoryData() {
        if (!this.historyService) {
            return;
        }

        try {
            const historyData = await this.historyService.getHistoryForUser();
            
            // Update everOwned status for all Pokemon
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
     * Refreshes both candy and history data for all Pokemon
     */
    async refreshAllData() {
        try {
            // Ensure services are initialized before refreshing
            await this.initializeServices();
            
            await Promise.all([
                this.refreshCandyData(),
                this.refreshHistoryData()
            ]);
            return this.allPokemon;
        } catch (error) {
            console.error('Error refreshing all data:', error);
            return this.allPokemon;
        }
    }
}
