import { StorageService } from './StorageService.js';


// Service for handling Pokémon-related operations.
export class PokemonService {
    /**
     * @param {AppState} appState - The application state.
     */
    constructor(appState) {
        this.state = appState;
    }

    /**
     * Releases a Pokémon from the collection.
     * @param {Object} pokemonToRelease - The Pokémon to be released.
     * @returns {Promise<{success: boolean}>}
     */
    async releasePokemon(pokemonToRelease) {
        try {
            if (this.state.canSync()) {
                const { error } = await this.state.supabase
                    .from('pokemon')
                    .eq('user_id', this.state.currentUser.id)
                    .eq('pokemon_id', pokemonToRelease.pokemon_id || pokemonToRelease.id)
                    .eq('site_caught', pokemonToRelease.site)
                    .eq('caught_at', pokemonToRelease.caughtAt)
                    .delete();
                if (error) throw error;
            }

            const removed = await StorageService.removePokemonFromCollection(pokemonToRelease);
            if (!removed) {
                throw new Error('Pokemon not found in collection');
            }

            return { success: true };
        } catch (error) {
            console.error('Error releasing Pokemon:', error);
            throw error;
        }
    }

    /**
     * Opens the Pokémon detail page in a new window.
     * @param {Object} pokemon - The Pokémon to display.
     */
    openPokemonDetail(pokemon) {
        const url = chrome.runtime.getURL('pokemon-detail.html');
        const params = new URLSearchParams({
            id: pokemon.id,
            name: pokemon.name,
            caughtAt: pokemon.caughtAt,
            site: pokemon.site
        });

        chrome.windows.create({
            url: `${url}?${params.toString()}`,
            type: 'popup',
            width: 500,
            height: 600,
            focused: true
        });
    }
}
