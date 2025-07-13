import { C as CONFIG } from "./config.js";
class Utils {
  static capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
  }
  static async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  static parseURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      id: parseInt(urlParams.get("id")) || 25,
      name: urlParams.get("name"),
      caughtAt: urlParams.get("caughtAt"),
      site: urlParams.get("site"),
      shiny: urlParams.get("shiny") === "true"
    };
  }
  // Formats a date string into a relative time format (e.g., "2 days ago").
  static formatDate(dateString) {
    const diffMinutes = Math.floor((/* @__PURE__ */ new Date() - new Date(dateString)) / 6e4);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
  /**
   * Generates a hash for a collection of Pokémon.
   * @param {Array} collection - The collection to hash.
   * @returns {string} - The generated hash.
   */
  static generateCollectionHash(collection) {
    if (!(collection == null ? void 0 : collection.length)) return "empty";
    const sortedString = collection.map((p) => `${p.id}-${p.site}-${new Date(p.caughtAt).getTime()}`).sort().join("|");
    let hash = 0;
    for (let i = 0; i < sortedString.length; i++) {
      hash = (hash << 5) - hash + sortedString.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }
}
class StorageService {
  /**
   * Retrieves the Pokémon collection from local storage.
   * @returns {Promise<Array>} - The Pokémon collection.
   */
  static async getPokemonCollection() {
    const { pokemonCollection = [] } = await chrome.storage.local.get(["pokemonCollection"]);
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
    const updatedCollection = collection.filter(
      (p) => !(p.id === pokemonToRemove.id && p.site === pokemonToRemove.site && new Date(p.caughtAt).getTime() === new Date(pokemonToRemove.caughtAt).getTime())
    );
    await this.setPokemonCollection(updatedCollection);
    return updatedCollection.length < initialLength;
  }
  /**
   * Retrieves the Pokémon history from local storage.
   * @returns {Promise<Array>} - Array of Pokemon IDs that were ever caught.
   */
  static async getPokemonHistory() {
    const { pokemonHistory = [] } = await chrome.storage.local.get(["pokemonHistory"]);
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
    if (history.includes(pokemonId)) {
      return false;
    }
    history.push(pokemonId);
    await this.setPokemonHistory(history);
    return true;
  }
}
class APIService {
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
      console.error("Error fetching all Pokémon:", error);
      throw error;
    }
  }
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
      console.error("Error fetching Pokemon data:", error);
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
      console.error("Error fetching species data:", error);
      throw error;
    }
  }
}
class AuthDebugger {
  /**
   * Logs detailed authentication state across all components
   * @param {string} context - Where this debug is being called from
   * @param {AppState} appState - The app state to debug
   */
  static logAuthState(context, appState) {
    console.group(`🔍 Auth Debug - ${context}`);
    const status = appState.getAuthStatus();
    console.log("📊 Auth Status:", status);
    if (appState.supabase) {
      console.log("✅ Supabase client exists");
      console.log("🔗 Supabase URL:", appState.supabase.supabaseUrl);
    } else {
      console.log("❌ Supabase client missing");
    }
    if (appState.currentUser) {
      console.log("✅ User logged in:", {
        id: appState.currentUser.id,
        email: appState.currentUser.email,
        created_at: appState.currentUser.created_at
      });
    } else {
      console.log("❌ No user logged in");
    }
    console.log("🌐 Network status:", navigator.onLine ? "Online" : "Offline");
    console.log("🚀 App initialized:", appState.isInitialized);
    console.groupEnd();
    return status;
  }
  /**
   * Waits for authentication with detailed logging
   * @param {AppState} appState - The app state to monitor
   * @param {number} maxWaitTime - Maximum time to wait
   * @param {string} context - Context for logging
   */
  static async waitForAuthWithLogging(appState, maxWaitTime = 5e3, context = "Unknown") {
    console.log(`⏳ ${context}: Waiting for authentication...`);
    const startTime = Date.now();
    let attempts = 0;
    while (Date.now() - startTime < maxWaitTime) {
      attempts++;
      const status = this.logAuthState(`${context} - Attempt ${attempts}`, appState);
      if (status.canSync) {
        console.log(`✅ ${context}: Authentication ready after ${attempts} attempts`);
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    console.log(`⏰ ${context}: Authentication timeout after ${attempts} attempts`);
    return false;
  }
  /**
   * Tests candy service authentication
   * @param {CandyService} candyService - The candy service to test
   * @param {string} context - Context for logging
   */
  static async testCandyServiceAuth(candyService, context = "Unknown") {
    console.group(`🍬 Candy Service Auth Test - ${context}`);
    try {
      this.logAuthState(`${context} - Before Candy Call`, candyService.state);
      console.log("🔄 Attempting to fetch candy data...");
      const candyData = await candyService.getCandyForUser();
      console.log("✅ Candy data fetch successful:", {
        size: candyData.size,
        entries: Array.from(candyData.entries()).slice(0, 3)
        // Show first 3 entries
      });
    } catch (error) {
      console.error("❌ Candy data fetch failed:", error);
    }
    console.groupEnd();
  }
}
class HistoryService {
  /**
   * @param {AppState} appState - The application state.
   */
  constructor(appState) {
    this.state = appState;
    this.maxRetries = 3;
    this.retryDelay = 1e3;
  }
  /**
   * Waits for authentication to be ready with retry logic.
   * @param {number} maxWaitTime - Maximum time to wait in milliseconds.
   * @returns {Promise<boolean>} - True if authenticated, false if timeout.
   */
  async waitForAuthentication(maxWaitTime = 5e3) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      if (this.state.canSync()) {
        console.log("✅ Authentication ready for history operations");
        return true;
      }
      const issues = [];
      if (!this.state.currentUser) issues.push("user not logged in");
      if (!this.state.supabase) issues.push("supabase not initialized");
      if (!navigator.onLine) issues.push("browser offline");
      console.log(`⏳ Waiting for authentication... Issues: ${issues.join(", ")}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    console.log("⏰ Authentication wait timeout reached");
    return false;
  }
  /**
   * Retrieves all Pokemon history for the current user from Supabase.
   * @returns {Promise<Set>} - A set of Pokemon IDs that were ever caught.
   */
  async getHistoryForUser() {
    AuthDebugger.logAuthState("HistoryService.getHistoryForUser - Start", this.state);
    if (!this.state.canSync()) {
      console.log("🔄 Authentication not ready, waiting...");
      const authReady = await AuthDebugger.waitForAuthWithLogging(
        this.state,
        5e3,
        "HistoryService.getHistoryForUser"
      );
      if (!authReady) {
        console.log("❌ Cannot sync history data - authentication timeout, using local data");
        AuthDebugger.logAuthState("HistoryService.getHistoryForUser - Timeout", this.state);
        return await this.getLocalHistory();
      }
    }
    try {
      console.log("📚 Fetching Pokemon history for user:", this.state.currentUser.email);
      const { data: historyData, error } = await this.state.supabase.from("pokemon_history").select("pokemon_id").eq("user_id", this.state.currentUser.id);
      if (error) {
        console.error("❌ Error fetching history data:", error);
        console.log("📱 Falling back to local history data");
        return await this.getLocalHistory();
      }
      const historySet = /* @__PURE__ */ new Set();
      if (historyData && historyData.length > 0) {
        historyData.forEach((entry) => {
          historySet.add(entry.pokemon_id);
        });
        console.log(`✅ Loaded history data for ${historyData.length} Pokemon from Supabase`);
        await StorageService.setPokemonHistory(Array.from(historySet));
      } else {
        console.log("📭 No history data found for user in Supabase");
      }
      return historySet;
    } catch (error) {
      console.error("❌ Error fetching history data:", error);
      console.log("📱 Falling back to local history data");
      return await this.getLocalHistory();
    }
  }
  /**
   * Check if a Pokemon was ever caught by the user
   * @param {number} pokemonId - The Pokemon ID to check
   * @returns {Promise<boolean>} - True if ever caught, false otherwise
   */
  async hasEverCaught(pokemonId) {
    try {
      const historySet = await this.getHistoryForUser();
      return historySet.has(pokemonId);
    } catch (error) {
      console.error("❌ Error checking if Pokemon was ever caught:", error);
      return false;
    }
  }
  /**
   * Get the first caught data for a specific Pokemon
   * @param {number} pokemonId - The Pokemon ID to get data for
   * @returns {Promise<Object|null>} - The history record or null if not found
   */
  async getFirstCaughtData(pokemonId) {
    if (!this.state.isLoggedIn() || !this.state.supabase) {
      console.log("❌ Not authenticated, cannot fetch first caught data");
      return null;
    }
    try {
      console.log(`📚 Fetching first caught data for Pokemon ${pokemonId}`);
      console.log(`🔍 Query params: user_id=${this.state.currentUser.id}, pokemon_id=${pokemonId}`);
      const { data, error } = await this.state.supabase.from("pokemon_history").select("*").eq("user_id", this.state.currentUser.id).eq("pokemon_id", pokemonId).order("first_caught_at", { ascending: true }).limit(1).single();
      console.log(`🔍 Raw query result - data:`, data, `error:`, error);
      if (error) {
        if (error.code === "PGRST116") {
          console.log(`📭 No history found for Pokemon ${pokemonId}`);
          return null;
        }
        console.error("❌ Database error:", error);
        return null;
      }
      if (!data) {
        console.log(`📭 No history record found for Pokemon ${pokemonId}`);
        return null;
      }
      console.log(`✅ Found history for Pokemon ${pokemonId}:`, data);
      console.log(`📅 First caught date field:`, data.first_caught_at);
      console.log(`📅 Date type:`, typeof data.first_caught_at);
      return data;
    } catch (error) {
      console.error("❌ Error fetching first caught data:", error);
      return null;
    }
  }
  /**
   * Adds a Pokemon to the user's history both locally and in Supabase.
   * @param {number} pokemonId - The Pokemon ID to add to history.
   * @returns {Promise<boolean>} - True if successfully added.
   */
  async addToHistory(pokemonId) {
    try {
      console.log(`📚 Adding Pokemon ${pokemonId} to history`);
      await StorageService.addToHistory(pokemonId);
      console.log(`✅ Added Pokemon ${pokemonId} to local history`);
      if (this.state.canSync()) {
        try {
          const { error } = await this.state.supabase.from("pokemon_history").upsert({
            user_id: this.state.currentUser.id,
            pokemon_id: pokemonId
          }, {
            onConflict: "user_id,pokemon_id"
          });
          if (error) {
            console.error(`❌ Error syncing Pokemon ${pokemonId} to Supabase:`, error);
          } else {
            console.log(`✅ Synced Pokemon ${pokemonId} to Supabase history`);
          }
        } catch (syncError) {
          console.error(`❌ Error syncing Pokemon ${pokemonId} to Supabase:`, syncError);
        }
      } else {
        console.log(`📱 Not authenticated, Pokemon ${pokemonId} saved locally only`);
      }
      return true;
    } catch (error) {
      console.error(`❌ Error adding Pokemon ${pokemonId} to history:`, error);
      return false;
    }
  }
  /**
   * Syncs local Pokemon history to Supabase.
   * Called when user authenticates or comes online.
   * @returns {Promise<boolean>} - True if sync successful.
   */
  async syncLocalHistory() {
    if (!this.state.canSync()) {
      console.log("❌ Cannot sync history - not authenticated");
      return false;
    }
    try {
      console.log("🔄 Syncing local Pokemon history to Supabase...");
      const localHistory = await StorageService.getPokemonHistory();
      if (localHistory.length === 0) {
        console.log("📭 No local history to sync");
        return true;
      }
      const { data: existingHistory, error: fetchError } = await this.state.supabase.from("pokemon_history").select("pokemon_id").eq("user_id", this.state.currentUser.id);
      if (fetchError) {
        console.error("❌ Error fetching existing history:", fetchError);
        return false;
      }
      const existingPokemonIds = new Set((existingHistory == null ? void 0 : existingHistory.map((h) => h.pokemon_id)) || []);
      const newPokemonIds = localHistory.filter((id) => !existingPokemonIds.has(id));
      if (newPokemonIds.length === 0) {
        console.log("✅ All local history already exists in Supabase, clearing local storage");
        await StorageService.setPokemonHistory([]);
        return true;
      }
      const historyRecords = newPokemonIds.map((pokemonId) => ({
        user_id: this.state.currentUser.id,
        pokemon_id: pokemonId
      }));
      const { error } = await this.state.supabase.from("pokemon_history").insert(historyRecords);
      if (error) {
        console.error("❌ Error syncing local history to Supabase:", error);
        return false;
      }
      console.log(`✅ Successfully synced ${newPokemonIds.length} new Pokemon to Supabase history`);
      await StorageService.setPokemonHistory([]);
      console.log("✅ Cleared local history after successful sync");
      return true;
    } catch (error) {
      console.error("❌ Error syncing local history:", error);
      return false;
    }
  }
  /**
   * Gets local Pokemon history as a fallback.
   * @returns {Promise<Set>} - A set of Pokemon IDs from local storage.
   */
  async getLocalHistory() {
    try {
      const localHistory = await StorageService.getPokemonHistory();
      return new Set(localHistory);
    } catch (error) {
      console.error("❌ Error getting local history:", error);
      return /* @__PURE__ */ new Set();
    }
  }
  /**
   * Gets the count of unique Pokemon ever caught.
   * @returns {Promise<number>} - Count of unique Pokemon in history.
   */
  async getHistoryCount() {
    try {
      const history = await this.getHistoryForUser();
      return history.size;
    } catch (error) {
      console.error("❌ Error getting history count:", error);
      return 0;
    }
  }
  /**
   * Checks if a Pokemon has ever been caught.
   * @param {number} pokemonId - The Pokemon ID to check.
   * @returns {Promise<boolean>} - True if Pokemon was ever caught.
   */
  async hasEverCaught(pokemonId) {
    try {
      const history = await this.getHistoryForUser();
      return history.has(pokemonId);
    } catch (error) {
      console.error(`❌ Error checking if Pokemon ${pokemonId} was ever caught:`, error);
      return false;
    }
  }
}
export {
  APIService as A,
  HistoryService as H,
  StorageService as S,
  Utils as U,
  AuthDebugger as a
};
//# sourceMappingURL=HistoryService.js.map
