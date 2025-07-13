import { CONFIG } from '../shared/config.js';

// Handles external API calls to PokeAPI
export class APIService {
    // Get list of all Pokemon from PokeAPI
    static async fetchAllPokemon(limit = 151) {
        try {
            const response = await fetch(`${CONFIG.POKEAPI_BASE_URL}?limit=${limit}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch Pokémon list: ${response.status}`);
            }
            const data = await response.json();
            return data.results.map((p, index) => ({
                id: index + 1,
                name: p.name,
                caught: false
            }));
        } catch (error) {
            console.error('Error fetching all Pokémon:', error);
            throw error;
        }
    }

    // Get detailed Pokemon data from PokeAPI with caching
    static async fetchPokemonData(pokemonId, cache) {
        const cacheKey = `pokemon_${pokemonId}`;
        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        try {
            const response = await fetch(`${CONFIG.POKEAPI_BASE_URL}/${pokemonId}`);
            if (!response.ok) {
                throw new Error(`Pokemon not found: ${response.status}`);
            }
            
            const data = await response.json();
            cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching Pokemon data:', error);
            throw error;
        }
    }

    // Get Pokemon species data from PokeAPI with caching
    static async fetchSpeciesData(pokemonId, cache) {
        const cacheKey = `species_${pokemonId}`;
        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        try {
            const pokemonData = await this.fetchPokemonData(pokemonId, cache);
            const response = await fetch(pokemonData.species.url);
            if (!response.ok) {
                throw new Error(`Species not found: ${response.status}`);
            }

            const data = await response.json();
            cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching species data:', error);
            throw error;
        }
    }
}
