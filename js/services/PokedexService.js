import { StorageService } from './StorageService.js';
import { APIService } from './ApiService.js';
import { CONFIG } from '../config.js';
import { AppState } from '../AppState.js';
import { CandyService } from './CandyService.js';

export class PokedexService {
    constructor(sharedAppState = null) {
        // Use shared AppState if provided, otherwise create new one
        this.appState = sharedAppState || new AppState();
        this.candyService = null;
        this.initializeServices();
    }

    async initializeServices() {
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
                }
            }

            // Initialize candy service if user is authenticated
            if (this.appState.isLoggedIn() && !this.candyService) {
                console.log('🔧 PokedexService: Initializing CandyService...');
                this.candyService = new CandyService(this.appState);
            }

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

        this.allPokemon = this.allPokemon.map(p => {
            const caughtPokemon = userCollectionById.get(p.id);
            const candyCount = candyData.get(p.id) || 0;
            
            if (caughtPokemon) {
                return { ...p, ...caughtPokemon, caught: true, candyCount };
            } else {
                return { ...p, candyCount };
            }
        });

        return this.allPokemon;
    }

    getStats() {
        const total = this.userCollection.length;
        const unique = new Set(this.userCollection.map(p => p.id)).size;
        const totalPossible = 151;
        const completion = totalPossible > 0 ? ((unique / totalPossible) * 100).toFixed(1) : 0;
        return { total, unique, completion };
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
}
