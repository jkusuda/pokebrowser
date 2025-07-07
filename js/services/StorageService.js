/**
 * Service for handling interactions with Chrome's local storage.
 */
export class StorageService {
    /**
     * Retrieves the Pokémon collection from local storage.
     * @returns {Promise<Array>} - The Pokémon collection.
     */
    static async getPokemonCollection() {
        const { pokemonCollection = [] } = await chrome.storage.local.get(['pokemonCollection']);
        return pokemonCollection;
    }

    /**
     * Saves the Pokémon collection to local storage.
     * @param {Array} collection - The Pokémon collection to save.
     */
    static async setPokemonCollection(collection) {
        await chrome.storage.local.set({ pokemonCollection: collection });
    }

    /**
     * Removes a Pokémon from the collection in local storage.
     * @param {Object} pokemonToRemove - The Pokémon to remove.
     * @returns {Promise<boolean>} - True if a Pokémon was removed, false otherwise.
     */
    static async removePokemonFromCollection(pokemonToRemove) {
        const collection = await this.getPokemonCollection();
        const initialLength = collection.length;
        
        const updatedCollection = collection.filter(p => 
            !(p.id === pokemonToRemove.id && 
              p.site === pokemonToRemove.site && 
              new Date(p.caughtAt).getTime() === new Date(pokemonToRemove.caughtAt).getTime())
        );
        
        await this.setPokemonCollection(updatedCollection);
        return updatedCollection.length < initialLength;
    }

    /**
     * Retrieves the Pokémon history from local storage.
     * @returns {Promise<Array>} - Array of Pokemon IDs that were ever caught.
     */
    static async getPokemonHistory() {
        const { pokemonHistory = [] } = await chrome.storage.local.get(['pokemonHistory']);
        return pokemonHistory;
    }

    /**
     * Saves the Pokémon history to local storage.
     * @param {Array} history - Array of Pokemon IDs to save.
     */
    static async setPokemonHistory(history) {
        await chrome.storage.local.set({ pokemonHistory: history });
    }

    /**
     * Adds a Pokemon ID to the history in local storage.
     * @param {number} pokemonId - The Pokemon ID to add to history.
     * @returns {Promise<boolean>} - True if Pokemon was added, false if already existed.
     */
    static async addToHistory(pokemonId) {
        const history = await this.getPokemonHistory();
        
        // Check if Pokemon is already in history
        if (history.includes(pokemonId)) {
            return false; // Already exists
        }
        
        // Add to history and save
        history.push(pokemonId);
        await this.setPokemonHistory(history);
        return true; // Successfully added
    }
}
