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

            // Send message to background script to handle candy logic
            if (chrome.runtime && chrome.runtime.sendMessage) {
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'POKEMON_RELEASED',
                        data: { pokemon: { id: pokemonToRelease.pokemon_id || pokemonToRelease.id } }
                    });
                    
                    if (response && response.success) {
                        console.log('✅ Pokemon released message sent successfully - Candy added!');
                    } else {
                        console.log('⚠️ Pokemon released but candy not added:', response?.error || 'Unknown error');
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
     * Catches a Pokémon and adds it to the collection.
     * @param {Object} pokemon - The Pokémon to catch.
     * @returns {Promise<{success: boolean}>}
     */
    async catchPokemon(pokemon) {
        try {
            const caughtPokemon = { 
                ...pokemon, 
                caughtAt: new Date().toISOString(), 
                site: window.location.hostname, 
                shiny: pokemon.shiny || false 
            };

            // Save to local storage first
            const result = await chrome.storage.local.get(['pokemonCollection']);
            const collection = result.pokemonCollection || [];
            collection.push(caughtPokemon);
            await chrome.storage.local.set({ pokemonCollection: collection });

            // Candy is handled by the background script via POKEMON_CAUGHT message
            // No need to add candy here to avoid conflicts

            return { success: true };
        } catch (error) {
            console.error('Error catching Pokemon:', error);
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
}
