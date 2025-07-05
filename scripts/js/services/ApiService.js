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
