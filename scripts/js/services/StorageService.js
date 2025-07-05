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
}
