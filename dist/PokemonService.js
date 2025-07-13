import { a as AuthDebugger, H as HistoryService, A as APIService, S as StorageService } from "./HistoryService.js";
import { C as CONFIG } from "./config.js";
import { A as AppState, s as supabase } from "./supabase-client.js";
class CandyService {
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
        console.log("✅ Authentication ready for candy operations");
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
   * Retrieves all candy data for the current user.
   * @returns {Promise<Map>} - A map of pokemon_id -> candy_count.
   */
  async getCandyForUser() {
    AuthDebugger.logAuthState("CandyService.getCandyForUser - Start", this.state);
    if (!this.state.canSync()) {
      console.log("🔄 Authentication not ready, waiting...");
      const authReady = await AuthDebugger.waitForAuthWithLogging(
        this.state,
        5e3,
        "CandyService.getCandyForUser"
      );
      if (!authReady) {
        console.log("❌ Cannot sync candy data - authentication timeout");
        AuthDebugger.logAuthState("CandyService.getCandyForUser - Timeout", this.state);
        return /* @__PURE__ */ new Map();
      }
    }
    try {
      console.log("🍬 Fetching candy data for user:", this.state.currentUser.email);
      const { data: candyData, error } = await this.state.supabase.from("candies").select("pokemon_id, candy_count").eq("user_id", this.state.currentUser.id);
      if (error) {
        console.error("❌ Error fetching candy data:", error);
        throw error;
      }
      const candyMap = /* @__PURE__ */ new Map();
      if (candyData && candyData.length > 0) {
        candyData.forEach((candy) => {
          candyMap.set(candy.pokemon_id, candy.candy_count);
        });
        console.log(`✅ Loaded candy data for ${candyData.length} Pokemon`);
      } else {
        console.log("📭 No candy data found for user");
      }
      this.state.setCandyData(candyMap);
      return candyMap;
    } catch (error) {
      console.error("❌ Error fetching candy data:", error);
      throw error;
    }
  }
  /**
   * Gets the candy count for a specific Pokémon from local state.
   * @param {number} pokemonId - The Pokémon ID.
   * @returns {number} - The candy count (0 if none).
   */
  getCandyCount(pokemonId) {
    const count = this.state.getCandyCount(pokemonId);
    console.log(`🍬 Candy count for Pokemon ${pokemonId}: ${count}`);
    return count;
  }
  /**
   * Refreshes candy data from the database.
   * @returns {Promise<Map>} - Updated candy map.
   */
  async refreshCandyData() {
    console.log("🔄 Refreshing candy data from database");
    return await this.getCandyForUser();
  }
}
class SecurityValidator {
  /**
   * Validates Pokemon data before database operations
   */
  static validatePokemonData(pokemon) {
    const errors = [];
    if (!pokemon.id || !Number.isInteger(pokemon.id) || pokemon.id < 1 || pokemon.id > 1010) {
      errors.push("Invalid Pokemon ID");
    }
    if (!pokemon.name || typeof pokemon.name !== "string" || pokemon.name.length > 50) {
      errors.push("Invalid Pokemon name");
    }
    if (!pokemon.site || typeof pokemon.site !== "string" || pokemon.site.length > 200) {
      errors.push("Invalid site URL");
    }
    const caughtAt = new Date(pokemon.caughtAt);
    if (isNaN(caughtAt.getTime()) || caughtAt > /* @__PURE__ */ new Date()) {
      errors.push("Invalid caught date");
    }
    if (pokemon.level !== void 0 && (!Number.isInteger(pokemon.level) || pokemon.level < 1 || pokemon.level > 100)) {
      errors.push("Invalid Pokemon level");
    }
    if (pokemon.shiny !== void 0 && typeof pokemon.shiny !== "boolean") {
      errors.push("Invalid shiny flag");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  /**
   * Validates candy operations
   */
  static validateCandyOperation(pokemonId, amount) {
    const errors = [];
    if (!pokemonId || !Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 1010) {
      errors.push("Invalid Pokemon ID for candy operation");
    }
    if (!Number.isInteger(amount) || amount < 0 || amount > 1e3) {
      errors.push("Invalid candy amount (must be 0-1000)");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  /**
   * Validates batch operations to prevent abuse
   */
  static validateBatchSize(items) {
    if (!Array.isArray(items)) {
      return {
        isValid: false,
        errors: ["Batch data must be an array"]
      };
    }
    if (items.length > CONFIG.MAX_BATCH_SIZE) {
      return {
        isValid: false,
        errors: [`Batch size too large (max ${CONFIG.MAX_BATCH_SIZE})`]
      };
    }
    return {
      isValid: true,
      errors: []
    };
  }
  /**
   * Rate limiting check (simple client-side implementation)
   */
  static checkRateLimit(operation, userId = "anonymous") {
    if (!CONFIG.RATE_LIMITING) {
      return { allowed: true };
    }
    const key = `rate_limit_${operation}_${userId}`;
    const now = Date.now();
    const stored = localStorage.getItem(key);
    let rateLimitData = stored ? JSON.parse(stored) : { count: 0, windowStart: now };
    const windowDuration = 6e4;
    if (now - rateLimitData.windowStart > windowDuration) {
      rateLimitData = { count: 0, windowStart: now };
    }
    const limits = {
      "sync": 10,
      "catch_pokemon": 50,
      "evolve": 20,
      "release": 30,
      "candy_operation": 100
    };
    const limit = limits[operation] || 30;
    if (rateLimitData.count >= limit) {
      return {
        allowed: false,
        error: `Rate limit exceeded for ${operation}. Try again later.`,
        retryAfter: windowDuration - (now - rateLimitData.windowStart)
      };
    }
    rateLimitData.count++;
    localStorage.setItem(key, JSON.stringify(rateLimitData));
    return { allowed: true };
  }
  /**
   * Sanitizes data before sending to database
   */
  static sanitizeForDatabase(data) {
    if (typeof data !== "object" || data === null) {
      return data;
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.includes("__") || key.includes("$") || key.includes("..")) {
        console.warn(`Skipping potentially malicious key: ${key}`);
        continue;
      }
      if (typeof value === "string") {
        sanitized[key] = value.trim().substring(0, 1e3);
      } else if (typeof value === "number") {
        sanitized[key] = Number.isFinite(value) ? value : 0;
      } else if (typeof value === "boolean") {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 100);
      } else if (typeof value === "object") {
        sanitized[key] = this.sanitizeForDatabase(value);
      }
    }
    return sanitized;
  }
  /**
   * Validates user permissions for operations
   */
  static validateUserPermissions(operation, userData) {
    const permissions = {
      "create_pokemon": true,
      "update_pokemon": true,
      "delete_pokemon": true,
      "manage_candies": true,
      "view_history": true
    };
    return {
      allowed: permissions[operation] !== false,
      error: !permissions[operation] ? `Permission denied for ${operation}` : null
    };
  }
  /**
   * Comprehensive security check wrapper
   */
  static async validateRequest(operation, data, user = null) {
    if (CONFIG.RATE_LIMITING) {
      const rateLimitResult = this.checkRateLimit(operation, user == null ? void 0 : user.id);
      if (!rateLimitResult.allowed) {
        return {
          valid: false,
          error: rateLimitResult.error,
          retryAfter: rateLimitResult.retryAfter
        };
      }
    }
    if (operation === "catch_pokemon" && data) {
      const pokemonValidation = this.validatePokemonData(data);
      if (!pokemonValidation.isValid) {
        return {
          valid: false,
          error: `Invalid Pokemon data: ${pokemonValidation.errors.join(", ")}`
        };
      }
    }
    if (operation === "candy_operation" && data) {
      const candyValidation = this.validateCandyOperation(data.pokemonId, data.amount);
      if (!candyValidation.isValid) {
        return {
          valid: false,
          error: `Invalid candy operation: ${candyValidation.errors.join(", ")}`
        };
      }
    }
    if (Array.isArray(data)) {
      const batchValidation = this.validateBatchSize(data);
      if (!batchValidation.isValid) {
        return {
          valid: false,
          error: `Batch validation failed: ${batchValidation.errors.join(", ")}`
        };
      }
    }
    const permissionResult = this.validateUserPermissions(operation, user);
    if (!permissionResult.allowed) {
      return {
        valid: false,
        error: permissionResult.error
      };
    }
    return {
      valid: true,
      sanitizedData: this.sanitizeForDatabase(data)
    };
  }
}
class PokemonService {
  constructor(sharedAppState = null) {
    this.appState = sharedAppState || new AppState();
    this.candyService = null;
    this.historyService = null;
    this.servicesInitialized = false;
    this.allPokemon = [];
    this.userCollection = [];
  }
  /**
   * Initialize all required services
   */
  async initializeServices() {
    if (this.servicesInitialized) return;
    try {
      if (!this.appState.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
        console.log("🔧 PokemonService: Initializing Supabase...");
        const client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        this.appState.setSupabase(client);
        const { data: { session } } = await client.auth.getSession();
        if (session) {
          console.log("🔧 PokemonService: Found existing session for", session.user.email);
          this.appState.setUser(session.user);
        }
      }
      if (this.appState.isLoggedIn()) {
        if (!this.candyService) {
          this.candyService = new CandyService(this.appState);
        }
        if (!this.historyService) {
          this.historyService = new HistoryService(this.appState);
        }
      }
      this.servicesInitialized = true;
      this.appState.logAuthStatus();
    } catch (error) {
      console.error("❌ Error initializing PokemonService:", error);
    }
  }
  /**
   * Load complete Pokedex data with user collection, candy, and history
   */
  async loadPokedex() {
    await this.initializeServices();
    const [allPokemon, userCollection] = await Promise.all([
      APIService.fetchAllPokemon(151),
      StorageService.getPokemonCollection()
    ]);
    this.allPokemon = allPokemon;
    this.userCollection = userCollection;
    const userCollectionById = new Map(userCollection.map((p) => [p.id, p]));
    let candyData = /* @__PURE__ */ new Map();
    let historyData = /* @__PURE__ */ new Set();
    let firstCaughtDates = /* @__PURE__ */ new Map();
    if (this.candyService) {
      try {
        candyData = await this.candyService.getCandyForUser();
      } catch (error) {
        console.error("Error loading candy data:", error);
      }
    }
    if (this.historyService) {
      try {
        historyData = await this.historyService.getHistoryForUser();
        console.log(`📚 Loaded history for ${historyData.size} Pokemon`);
        for (const pokemonId of historyData) {
          try {
            const historyRecord = await this.historyService.getFirstCaughtData(pokemonId);
            if (historyRecord && historyRecord.first_caught_at) {
              firstCaughtDates.set(pokemonId, historyRecord.first_caught_at);
            }
          } catch (error) {
            console.error(`Error loading first caught date for Pokemon ${pokemonId}:`, error);
          }
        }
        console.log(`📅 Loaded first caught dates for ${firstCaughtDates.size} Pokemon`);
      } catch (error) {
        console.error("Error loading history data:", error);
      }
    }
    this.allPokemon = this.allPokemon.map((p) => {
      const caughtPokemon = userCollectionById.get(p.id);
      const candyCount = candyData.get(p.id) || 0;
      const everOwned = historyData.has(p.id);
      const firstCaughtAt = firstCaughtDates.get(p.id);
      if (caughtPokemon) {
        return {
          ...p,
          ...caughtPokemon,
          caught: true,
          everOwned: true,
          candyCount,
          firstCaughtAt: firstCaughtAt || caughtPokemon.caughtAt
        };
      } else {
        return {
          ...p,
          caught: false,
          everOwned,
          candyCount,
          firstCaughtAt
        };
      }
    });
    return this.allPokemon;
  }
  /**
   * Get collection statistics
   */
  getStats() {
    const total = this.userCollection.length;
    const unique = new Set(this.userCollection.map((p) => p.id)).size;
    const everOwnedCount = this.allPokemon ? this.allPokemon.filter((p) => p.everOwned).length : 0;
    const completion = (everOwnedCount / 151 * 100).toFixed(1);
    return { total, unique, completion, everOwned: everOwnedCount };
  }
  /**
   * Filter and sort Pokemon data
   */
  filterAndSort(query, sortBy) {
    let filtered = this.allPokemon;
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(lowerQuery) || String(p.id).includes(lowerQuery)
      );
    }
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "caughtAt":
        filtered.sort((a, b) => {
          if (a.everOwned && !b.everOwned) return -1;
          if (!a.everOwned && b.everOwned) return 1;
          if (!a.everOwned && !b.everOwned) return a.id - b.id;
          const aDate = a.firstCaughtAt || a.caughtAt;
          const bDate = b.firstCaughtAt || b.caughtAt;
          if (!aDate && !bDate) return a.id - b.id;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return new Date(bDate) - new Date(aDate);
        });
        break;
      case "firstCaught":
        filtered.sort((a, b) => {
          if (a.everOwned && !b.everOwned) return -1;
          if (!a.everOwned && b.everOwned) return 1;
          if (!a.everOwned && !b.everOwned) return a.id - b.id;
          const aDate = a.firstCaughtAt;
          const bDate = b.firstCaughtAt;
          if (!aDate && !bDate) return a.id - b.id;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return new Date(aDate) - new Date(bDate);
        });
        break;
      case "id":
      default:
        filtered.sort((a, b) => a.id - b.id);
        break;
    }
    return filtered;
  }
  /**
   * Catch a Pokemon and add it to the collection
   */
  async catchPokemon(pokemon) {
    try {
      const caughtPokemon = {
        ...pokemon,
        caughtAt: (/* @__PURE__ */ new Date()).toISOString(),
        site: window.location.hostname,
        shiny: pokemon.shiny || false
      };
      const securityCheck = await SecurityValidator.validateRequest("catch_pokemon", caughtPokemon, this.appState.currentUser);
      if (!securityCheck.valid) {
        throw new Error(`Security validation failed: ${securityCheck.error}`);
      }
      const sanitizedPokemon = securityCheck.sanitizedData;
      if (this.appState.canSync()) {
        console.log("🔄 User is logged in - saving Pokemon directly to Supabase");
        const pokemonToInsert = {
          user_id: this.appState.currentUser.id,
          pokemon_id: sanitizedPokemon.id,
          name: sanitizedPokemon.name,
          species: sanitizedPokemon.species || sanitizedPokemon.name,
          level: sanitizedPokemon.level,
          shiny: sanitizedPokemon.shiny || false,
          site_caught: sanitizedPokemon.site,
          caught_at: sanitizedPokemon.caughtAt
        };
        const { error: insertError } = await this.appState.supabase.from("pokemon").insert([pokemonToInsert]);
        if (insertError) {
          throw new Error(`Failed to save Pokemon to Supabase: ${insertError.message}`);
        }
        if (this.historyService) {
          await this.historyService.addToHistory(sanitizedPokemon.id);
        }
        console.log("✅ Pokemon saved directly to Supabase");
        if (chrome.runtime && chrome.runtime.sendMessage) {
          try {
            await chrome.runtime.sendMessage({
              type: "POKEMON_CAUGHT",
              data: { pokemon: sanitizedPokemon }
            });
          } catch (candyError) {
            console.error("❌ Error sending Pokemon caught message:", candyError);
          }
        }
      } else {
        console.log("📱 User is logged out - saving Pokemon to local storage (no candies)");
        const result = await chrome.storage.local.get(["pokemonCollection"]);
        const collection = result.pokemonCollection || [];
        if (collection.length >= CONFIG.MAX_POKEMON_PER_USER) {
          throw new Error(`Collection limit reached (${CONFIG.MAX_POKEMON_PER_USER})`);
        }
        collection.push(sanitizedPokemon);
        await chrome.storage.local.set({ pokemonCollection: collection });
        await StorageService.addToHistory(sanitizedPokemon.id);
        console.log("✅ Pokemon saved to local storage");
      }
      return { success: true };
    } catch (error) {
      console.error("Error catching Pokemon:", error);
      throw error;
    }
  }
  /**
   * Release a Pokemon from the collection
   */
  async releasePokemon(pokemonToRelease) {
    try {
      if (this.appState.canSync()) {
        const { error } = await this.appState.supabase.from("pokemon").eq("user_id", this.appState.currentUser.id).eq("pokemon_id", pokemonToRelease.pokemon_id || pokemonToRelease.id).eq("site_caught", pokemonToRelease.site).eq("caught_at", pokemonToRelease.caughtAt).delete();
        if (error) throw error;
      }
      const removed = await StorageService.removePokemonFromCollection(pokemonToRelease);
      if (!removed) {
        throw new Error("Pokemon not found in collection");
      }
      if (chrome.runtime && chrome.runtime.sendMessage) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: "POKEMON_RELEASED",
            data: { pokemon: { id: pokemonToRelease.pokemon_id || pokemonToRelease.id } }
          });
          if (response && response.success) {
            console.log("✅ Pokemon released message sent successfully - Candy added!");
          }
        } catch (candyError) {
          console.error("❌ Error sending Pokemon released message:", candyError);
        }
      }
      return { success: true };
    } catch (error) {
      console.error("Error releasing Pokemon:", error);
      throw error;
    }
  }
  /**
   * Open Pokemon detail window
   */
  openPokemonDetail(pokemon) {
    const url = chrome.runtime.getURL("dist/src/pokemon-detail/index.html");
    const params = new URLSearchParams({
      id: pokemon.id,
      name: pokemon.name,
      caughtAt: pokemon.caughtAt,
      site: pokemon.site,
      shiny: pokemon.shiny || false
    });
    chrome.windows.create({
      url: `${url}?${params.toString()}`,
      type: "popup",
      width: 500,
      height: 600,
      focused: true
    });
  }
  /**
   * Refresh candy data for all Pokemon
   */
  async refreshCandyData() {
    if (!this.candyService) return this.allPokemon;
    try {
      const candyData = await this.candyService.getCandyForUser();
      this.allPokemon = this.allPokemon.map((p) => ({
        ...p,
        candyCount: candyData.get(p.id) || 0
      }));
      return this.allPokemon;
    } catch (error) {
      console.error("Error refreshing candy data:", error);
      return this.allPokemon;
    }
  }
  /**
   * Refresh history data for all Pokemon
   */
  async refreshHistoryData() {
    if (!this.historyService) return this.allPokemon;
    try {
      const historyData = await this.historyService.getHistoryForUser();
      this.allPokemon = this.allPokemon.map((p) => ({
        ...p,
        everOwned: historyData.has(p.id)
      }));
      return this.allPokemon;
    } catch (error) {
      console.error("Error refreshing history data:", error);
      return this.allPokemon;
    }
  }
  /**
   * Refresh all data (candy and history) for all Pokemon
   */
  async refreshAllData() {
    try {
      await this.initializeServices();
      let candyData = /* @__PURE__ */ new Map();
      let historyData = /* @__PURE__ */ new Set();
      if (this.candyService) {
        candyData = await this.candyService.getCandyForUser();
      }
      if (this.historyService) {
        historyData = await this.historyService.getHistoryForUser();
      }
      this.allPokemon = this.allPokemon.map((p) => ({
        ...p,
        candyCount: candyData.get(p.id) || 0,
        everOwned: historyData.has(p.id)
      }));
      return this.allPokemon;
    } catch (error) {
      console.error("Error refreshing all data:", error);
      return this.allPokemon;
    }
  }
}
export {
  CandyService as C,
  PokemonService as P,
  SecurityValidator as S
};
//# sourceMappingURL=PokemonService.js.map
