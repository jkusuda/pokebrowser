import { CONFIG } from '../config.js';

// Service for handling API requests.
export class APIService {
    /**
     * Fetches Pokémon data from the PokéAPI.
     * @param {number} pokemonId - The ID of the Pokémon to fetch.
     * @param {Map} cache - The cache to store and retrieve data from.
     * @returns {Promise<Object>} - The Pokémon data.
     */
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
