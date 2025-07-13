// Handles Chrome extension local storage operations
export class StorageService {
    // Get user's Pokemon collection from local storage
    static async getPokemonCollection() {
        const { pokemonCollection = [] } = await chrome.storage.local.get(['pokemonCollection']);
        return pokemonCollection;
    }

    // Save Pokemon collection to local storage
    static async setPokemonCollection(collection) {
        await chrome.storage.local.set({ pokemonCollection: collection });
    }

    // Remove specific Pokemon from local collection
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

    // Get Pokemon ownership history from local storage
    static async getPokemonHistory() {
        const { pokemonHistory = [] } = await chrome.storage.local.get(['pokemonHistory']);
        return pokemonHistory;
    }

    // Save Pokemon history to local storage
    static async setPokemonHistory(history) {
        await chrome.storage.local.set({ pokemonHistory: history });
    }

    // Add Pokemon ID to ownership history
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
