// pokemon-detail.js - Modular Pokemon Detail Page
// =================================================

// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://mzoxfiqdhbitwoyspnfm.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM', // Replace with your actual key
    POKEAPI_BASE_URL: 'https://pokeapi.co/api/v2/pokemon',
    SPRITE_BASE_URL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
};

// State Management
class AppState {
    constructor() {
        this.currentPokemon = null;
        this.pokemonData = null;
        this.supabase = null;
        this.currentUser = null;
        this.cache = new Map();
    }

    setPokemon(pokemon) {
        this.currentPokemon = pokemon;
    }

    setPokemonData(data) {
        this.pokemonData = data;
    }

    setSupabase(client) {
        this.supabase = client;
    }

    setUser(user) {
        this.currentUser = user;
    }

    getCachedData(key) {
        return this.cache.get(key);
    }

    setCachedData(key, data) {
        this.cache.set(key, data);
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    canSync() {
        return this.isLoggedIn() && this.supabase && navigator.onLine;
    }
}

// DOM Manager
class DOMManager {
    constructor() {
        this.elements = this.initializeElements();
    }

    initializeElements() {
        const elementIds = [
            'loading-state', 'error-state', 'pokemon-details', 'pokemon-name',
            'pokemon-id', 'pokemon-sprite', 'pokemon-types', 'candy-count',
            'candy-label', 'caught-site', 'caught-date', 'evolve-btn',
            'summon-btn', 'release-btn'
        ];

        const elements = {};
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                elements[id.replace(/-/g, '_')] = element;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        });

        return elements;
    }

    showLoading() {
        this.elements.loading_state.style.display = 'block';
        this.elements.error_state.style.display = 'none';
        this.elements.pokemon_details.style.display = 'none';
    }

    showError(message = 'An error occurred') {
        this.elements.loading_state.style.display = 'none';
        this.elements.error_state.style.display = 'block';
        this.elements.pokemon_details.style.display = 'none';
        
        // Update error message if there's an error message element
        const errorMsg = document.querySelector('.error-message');
        if (errorMsg) errorMsg.textContent = message;
    }

    showDetails() {
        this.elements.loading_state.style.display = 'none';
        this.elements.error_state.style.display = 'none';
        this.elements.pokemon_details.style.display = 'block';
    }

    updateBasicInfo(pokemonData) {
        this.elements.pokemon_name.textContent = Utils.capitalizeFirst(pokemonData.name);
        this.elements.pokemon_id.textContent = `#${pokemonData.id.toString().padStart(3, '0')}`;
    }

    updateSprite(pokemonData) {
        const spriteUrl = pokemonData.sprites.other?.['official-artwork']?.front_default ||
                         pokemonData.sprites.front_default ||
                         `${CONFIG.SPRITE_BASE_URL}/${pokemonData.id}.png`;
        
        this.elements.pokemon_sprite.src = spriteUrl;
        this.elements.pokemon_sprite.alt = pokemonData.name;
        
        this.elements.pokemon_sprite.onerror = () => {
            this.elements.pokemon_sprite.src = `${CONFIG.SPRITE_BASE_URL}/${pokemonData.id}.png`;
        };
    }

    updateTypes(pokemonData) {
        this.elements.pokemon_types.innerHTML = pokemonData.types.map(typeInfo => {
            const typeName = typeInfo.type.name;
            return `<span class="type-badge type-${typeName}">${Utils.capitalizeFirst(typeName)}</span>`;
        }).join('');
    }

    updateCandies(pokemonData) {
        const candyCount = Math.floor(Math.random() * 100) + 1;
        this.elements.candy_count.textContent = candyCount;
        this.elements.candy_label.textContent = `${Utils.capitalizeFirst(pokemonData.name)} Candy`;
    }

    updateCatchInfo(pokemon) {
        if (pokemon.site && pokemon.caughtAt) {
            const catchDate = new Date(pokemon.caughtAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            this.elements.caught_site.textContent = `Caught on ${pokemon.site}`;
            this.elements.caught_date.textContent = catchDate;
        }
    }

    setButtonState(buttonName, disabled, text) {
        const button = this.elements[buttonName];
        if (button) {
            button.disabled = disabled;
            if (text) button.textContent = text;
        }
    }
}

// API Service
class APIService {
    static async fetchPokemonData(pokemonId, cache) {
        if (cache.has(pokemonId)) {
            return cache.get(pokemonId);
        }

        try {
            const response = await fetch(`${CONFIG.POKEAPI_BASE_URL}/${pokemonId}`);
            if (!response.ok) {
                throw new Error(`Pokemon not found: ${response.status}`);
            }
            
            const data = await response.json();
            cache.set(pokemonId, data);
            return data;
        } catch (error) {
            console.error('Error fetching Pokemon data:', error);
            throw error;
        }
    }
}

// Storage Service
class StorageService {
    static async getPokemonCollection() {
        const { pokemonCollection = [] } = await chrome.storage.local.get(['pokemonCollection']);
        return pokemonCollection;
    }

    static async setPokemonCollection(collection) {
        await chrome.storage.local.set({ pokemonCollection: collection });
    }

    static async removePokemonFromCollection(pokemonToRemove) {
        const collection = await this.getPokemonCollection();
        const updatedCollection = collection.filter(pokemon => 
            !(pokemon.id === pokemonToRemove.id && 
              pokemon.site === pokemonToRemove.site && 
              new Date(pokemon.caughtAt).getTime() === new Date(pokemonToRemove.caughtAt).getTime())
        );
        
        await this.setPokemonCollection(updatedCollection);
        return updatedCollection.length < collection.length; // Return true if Pokemon was removed
    }
}

// Auth Service
class AuthService {
    static async initializeSupabase() {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase library not loaded');
        }

        const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        
        // Check current auth state
        const { data: { session } } = await client.auth.getSession();
        const user = session?.user || null;
        
        return { client, user };
    }
}

// Pokemon Service
class PokemonService {
    constructor(appState) {
        this.state = appState;
    }

    async releasePokemon(pokemon) {
        if (!pokemon) {
            throw new Error('No Pokemon data provided');
        }

        console.log('Releasing Pokemon:', pokemon);

        // Remove from Supabase if logged in
        if (this.state.canSync()) {
            await this.removeFromSupabase(pokemon);
        }

        // Remove from local storage
        const removed = await StorageService.removePokemonFromCollection(pokemon);
        
        if (!removed) {
            throw new Error('Pokemon not found in collection');
        }

        return { success: true };
    }

    async removeFromSupabase(pokemon) {
        const { error } = await this.state.supabase
            .from('pokemon')
            .delete()
            .eq('user_id', this.state.currentUser.id)
            .eq('pokemon_id', pokemon.id)
            .eq('site_caught', pokemon.site)
            .eq('caught_at', pokemon.caughtAt);
        
        if (error) {
            console.error('Supabase delete error:', error);
            throw error;
        }
    }
}

// URL Parser
class URLParser {
    static parseURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            id: parseInt(urlParams.get('id')) || 25,
            name: urlParams.get('name'),
            caughtAt: urlParams.get('caughtAt'),
            site: urlParams.get('site')
        };
    }
}

// Utilities
class Utils {
    static capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main Application Controller
class PokemonDetailApp {
    constructor() {
        this.state = new AppState();
        this.dom = new DOMManager();
        this.pokemonService = new PokemonService(this.state);
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            this.dom.showLoading();
            
            // Initialize Supabase and auth
            await this.initializeAuth();
            
            // Parse URL parameters and set current Pokemon
            const pokemonParams = URLParser.parseURLParams();
            this.state.setPokemon(pokemonParams);
            
            // Set initial UI state
            this.setInitialUI(pokemonParams);
            
            // Fetch Pokemon data
            await this.fetchPokemonData(pokemonParams.id);
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.dom.showDetails();
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.dom.showError(error.message);
        }
    }

    async initializeAuth() {
        try {
            const { client, user } = await AuthService.initializeSupabase();
            this.state.setSupabase(client);
            this.state.setUser(user);
        } catch (error) {
            console.warn('Auth initialization failed:', error);
            // Continue without auth - app will work in local-only mode
        }
    }

    setInitialUI(pokemon) {
        if (pokemon.name) {
            this.dom.elements.pokemon_name.textContent = Utils.capitalizeFirst(pokemon.name);
        }
        this.dom.elements.pokemon_id.textContent = `#${pokemon.id.toString().padStart(3, '0')}`;
        this.dom.updateCatchInfo(pokemon);
    }

    async fetchPokemonData(pokemonId) {
        try {
            const pokemonData = await APIService.fetchPokemonData(pokemonId, this.state.cache);
            this.state.setPokemonData(pokemonData);
            
            // Update UI with Pokemon data
            this.dom.updateBasicInfo(pokemonData);
            this.dom.updateSprite(pokemonData);
            this.dom.updateTypes(pokemonData);
            this.dom.updateCandies(pokemonData);
            
        } catch (error) {
            console.error('Error fetching Pokemon data:', error);
            throw new Error('Failed to load Pokemon data');
        }
    }

    setupEventListeners() {
        // Evolve button
        this.dom.elements.evolve_btn?.addEventListener('click', () => {
            alert('Evolution feature coming soon!');
        });

        // Summon button
        this.dom.elements.summon_btn?.addEventListener('click', () => {
            alert('Summon feature coming soon!');
        });

        // Release button
        this.dom.elements.release_btn?.addEventListener('click', () => {
            this.handleRelease();
        });
    }

    async handleRelease() {
        const confirmMessage = 'Are you sure you want to release this Pokemon? This action cannot be undone.';
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // Update UI state
            this.dom.setButtonState('release_btn', true, 'Releasing...');
            
            // Release Pokemon
            const result = await this.pokemonService.releasePokemon(this.state.currentPokemon);
            
            if (result.success) {
                alert('Pokemon released! 💔');
                await Utils.delay(500); // Brief delay for user feedback
                window.close();
            }
            
        } catch (error) {
            console.error('Error releasing Pokemon:', error);
            alert(`Failed to release Pokemon: ${error.message}`);
        } finally {
            // Reset button state
            this.dom.setButtonState('release_btn', false, 'Release');
        }
    }
}

// Initialize the application
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new PokemonDetailApp();
    app.initialize();
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PokemonDetailApp,
        AppState,
        DOMManager,
        APIService,
        StorageService,
        AuthService,
        PokemonService,
        URLParser,
        Utils
    };
}
