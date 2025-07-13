import { j as jsxRuntimeExports, r as reactExports, c as client, R as React, A as AppState } from "../../supabase-client.js";
import { A as AuthService } from "../../AuthService.js";
import { P as PokemonService } from "../../PokemonService.js";
import { U as Utils, S as StorageService } from "../../HistoryService.js";
import { C as CONFIG } from "../../config.js";
class SyncService {
  /**
   * @param {AppState} appState - The application state.
   */
  constructor(appState2) {
    this.state = appState2;
    this.syncInProgress = false;
  }
  /**
   * Performs an immediate synchronization.
   * @param {Array} collection - The Pokémon collection to sync.
   * @returns {Promise<Object>} - The result of the sync operation.
   */
  async immediateSync(collection) {
    if (!this.state.canSync()) return;
    return await this.syncToCloud(collection);
  }
  /**
   * Synchronizes the local collection to the cloud.
   * @param {Array} collection - The Pokémon collection to sync.
   * @returns {Promise<Object>} - The result of the sync operation.
   */
  async syncToCloud(collection) {
    if (!this.state.canSync() || !collection.length) return;
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    try {
      console.log("🔄 Starting sync to cloud for", collection.length, "Pokemon");
      const { data: existingPokemon, error } = await this.state.supabase.from("pokemon").select("pokemon_id, site_caught, caught_at").eq("user_id", this.state.currentUser.id);
      if (error) throw error;
      const existingKeys = new Set(existingPokemon == null ? void 0 : existingPokemon.map((p) => `${p.pokemon_id}|${p.site_caught}|${new Date(p.caught_at).getTime()}`));
      const newPokemon = collection.filter((p) => !existingKeys.has(`${p.id}|${p.site}|${new Date(p.caughtAt).getTime()}`));
      if (newPokemon.length > 0) {
        console.log("📤 Syncing", newPokemon.length, "new Pokemon to cloud");
        const pokemonToInsert = newPokemon.map((p) => ({
          user_id: this.state.currentUser.id,
          pokemon_id: p.id,
          name: p.name,
          species: p.species || p.name,
          level: p.level,
          shiny: p.shiny || false,
          site_caught: p.site,
          caught_at: p.caughtAt
        }));
        const { error: insertError } = await this.state.supabase.from("pokemon").insert(pokemonToInsert);
        if (insertError) throw insertError;
        const uniquePokemonIds = [...new Set(newPokemon.map((p) => p.id))];
        const historyRecords = uniquePokemonIds.map((pokemonId) => ({
          user_id: this.state.currentUser.id,
          pokemon_id: pokemonId
        }));
        const { error: historyError } = await this.state.supabase.from("pokemon_history").upsert(historyRecords, {
          onConflict: "user_id,pokemon_id"
        });
        if (historyError) {
          console.error("❌ Error syncing to pokemon_history:", historyError);
        }
        console.log("✅ Successfully synced Pokemon and history to cloud");
        return { synced: newPokemon.length, message: `Synced ${newPokemon.length} new Pokémon` };
      } else {
        console.log("✅ All Pokemon already synced");
        return { synced: 0, message: "All Pokémon already synced" };
      }
    } catch (error) {
      console.error("Sync to cloud error:", error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }
}
const AuthSection = ({ user, syncStatus, onLogin, onLogout }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-section card", children: !user ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { id: "logged-out-state", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "CLOUD STORAGE" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Log in to collect candies and sync your collection across devices!" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn secondary",
        onClick: onLogin,
        "aria-label": "Login or sign up",
        children: "LOGIN"
      }
    )
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { id: "logged-in-state", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "user-info", "aria-live": "polite", children: [
      "Trainer: ",
      user.email
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `sync-status ${syncStatus.type}`, "aria-live": "polite", children: syncStatus.message }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn",
        onClick: onLogout,
        "aria-label": "Logout",
        children: "LOGOUT"
      }
    )
  ] }) });
};
const StatsSection = ({ stats }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stats-section", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stats card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stat", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-number", children: String(stats.totalCaught).padStart(3, "0") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-label", children: "Caught" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stat", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-number", children: String(stats.uniquePokemon).padStart(3, "0") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-label", children: "Species" })
    ] })
  ] }) });
};
const PokemonCollection = ({ collection, onPokemonClick }) => {
  if (collection.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "collection card", role: "list", "aria-label": "Pokemon collection", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "empty-state", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "POKEDEX EMPTY" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Scan web pages to detect wild Pokémon and begin data collection..." })
    ] }) });
  }
  const sortedCollection = [...collection].sort(
    (a, b) => new Date(b.caughtAt) - new Date(a.caughtAt)
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "collection card", role: "list", "aria-label": "Pokemon collection", children: sortedCollection.map((pokemon, index) => {
    var _a, _b;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "pokemon-item clickable-pokemon",
        onClick: () => onPokemonClick(pokemon),
        style: { cursor: "pointer" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pokemon-sprite", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: `${CONFIG.SPRITE_BASE_URL}/${pokemon.shiny ? "shiny/" : ""}${pokemon.id}.png`,
              alt: pokemon.name,
              onError: (e) => {
                e.target.style.display = "none";
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pokemon-info", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pokemon-name", children: pokemon.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pokemon-details", children: [
              pokemon.level && `Lv.${pokemon.level}`,
              pokemon.level && ((_a = pokemon.types) == null ? void 0 : _a.length) && " • ",
              ((_b = pokemon.types) == null ? void 0 : _b.join("/")) || "",
              /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
              "Caught on ",
              pokemon.site,
              " • ",
              Utils.formatDate(pokemon.caughtAt)
            ] })
          ] })
        ]
      },
      `${pokemon.id}-${pokemon.caughtAt}-${index}`
    );
  }) });
};
const SyncIndicator = () => {
  const indicatorStyle = {
    position: "fixed",
    top: "10px",
    right: "10px",
    background: "rgba(0,0,0,0.8)",
    color: "white",
    padding: "5px 10px",
    borderRadius: "15px",
    fontSize: "12px",
    zIndex: 1e4,
    animation: "pulse 1s infinite"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: indicatorStyle, children: "🔄" });
};
const PopupApp = ({ appState: appState2 }) => {
  const [isInitialized, setIsInitialized] = reactExports.useState(false);
  const [user, setUser] = reactExports.useState(null);
  const [collection, setCollection] = reactExports.useState([]);
  const [syncStatus, setSyncStatus] = reactExports.useState({ message: "Local storage only", type: "local" });
  const [showSyncIndicator, setShowSyncIndicator] = reactExports.useState(false);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [services] = reactExports.useState(() => {
    const auth = new AuthService(appState2);
    const sync = new SyncService(appState2);
    const pokemon = new PokemonService(appState2);
    appState2.auth = auth;
    appState2.sync = sync;
    appState2.pokemon = pokemon;
    return { state: appState2, auth, sync, pokemon };
  });
  const updateSyncStatus = reactExports.useCallback((message, type = "local") => {
    console.log(`Sync status: ${message} (${type})`);
    setSyncStatus({ message, type });
    setShowSyncIndicator(type === "syncing");
  }, []);
  const loadCollection = reactExports.useCallback(async () => {
    try {
      const pokemonCollection = await StorageService.getPokemonCollection();
      setCollection(pokemonCollection);
    } catch (error) {
      console.error("Error loading collection:", error);
    }
  }, []);
  const fetchCloudCollection = reactExports.useCallback(async (user2) => {
    if (!user2) return;
    try {
      const { data, error } = await services.state.supabase.from("pokemon").select("*").eq("user_id", user2.id);
      if (error) throw error;
      setCollection(data.map((p) => ({
        id: p.pokemon_id,
        name: p.name,
        species: p.species,
        level: p.level,
        shiny: p.shiny,
        site: p.site_caught,
        caughtAt: p.caught_at
      })));
    } catch (error) {
      console.error("Error fetching cloud collection:", error);
    }
  }, [services.state]);
  const handleLogin = reactExports.useCallback(async () => {
    try {
      console.log("🔄 Starting login process...");
      const authUser = await services.auth.openAuthPopup();
      if (authUser) {
        setUser(authUser);
        updateSyncStatus("Syncing local data to cloud...", "syncing");
        const localCollection = await StorageService.getPokemonCollection();
        if (localCollection.length > 0) {
          console.log(`📤 Syncing ${localCollection.length} local Pokemon to cloud...`);
          await services.sync.immediateSync(localCollection);
        }
        try {
          await services.pokemon.initializeServices();
          if (services.pokemon.historyService) {
            await services.pokemon.historyService.syncLocalHistory();
          }
        } catch (historyError) {
          console.error("Error syncing local history:", historyError);
        }
        await chrome.storage.local.set({
          pokemonCollection: [],
          pokemonHistory: []
        });
        console.log("✅ Local storage cleared - now using cloud data only");
        await fetchCloudCollection(authUser);
        updateSyncStatus("Connected to cloud", "synced");
        console.log("✅ Login complete - switched to cloud mode");
      }
    } catch (error) {
      console.error("Login error:", error);
      updateSyncStatus("Login failed", "error");
    }
  }, [services.auth, services.sync, services.pokemon, fetchCloudCollection, updateSyncStatus]);
  const handleLogout = reactExports.useCallback(async () => {
    try {
      console.log("🔄 Starting logout process...");
      updateSyncStatus("Signing out...", "syncing");
      setCollection([]);
      await services.auth.handleLogout();
      setUser(null);
      await loadCollection();
      updateSyncStatus("Local storage only", "local");
      console.log("✅ Logout complete - switched to local mode");
    } catch (error) {
      console.error("Logout error:", error);
      updateSyncStatus("Error signing out", "error");
    }
  }, [services.auth, loadCollection, updateSyncStatus]);
  const initializeSupabase = reactExports.useCallback(async () => {
    try {
      await services.auth.initializeSupabase();
      console.log("Supabase initialized successfully");
    } catch (error) {
      console.warn("Supabase initialization failed:", error);
      updateSyncStatus(error.message, "error");
    }
  }, [services.auth, updateSyncStatus]);
  const initializeAuth = reactExports.useCallback(async () => {
    if (!services.state.supabase) return;
    try {
      const currentUser = await services.auth.initializeAuth();
      if (currentUser) {
        setUser(currentUser);
        updateSyncStatus("Connected to cloud", "synced");
        await fetchCloudCollection(currentUser);
      } else {
        await loadCollection();
        updateSyncStatus("Local storage only", "local");
      }
      services.auth.setupAuthStateListener(async (event, authUser) => {
        if (event === "SIGNED_IN") {
          console.log("🔄 Auth listener: User signed in");
          setUser(authUser);
          updateSyncStatus("Syncing local data to cloud...", "syncing");
          const localCollection = await StorageService.getPokemonCollection();
          if (localCollection.length > 0) {
            console.log(`📤 Auth listener: Syncing ${localCollection.length} local Pokemon to cloud...`);
            await services.sync.immediateSync(localCollection);
          }
          try {
            await services.pokemon.initializeServices();
            if (services.pokemon.historyService) {
              await services.pokemon.historyService.syncLocalHistory();
            }
          } catch (historyError) {
            console.error("Error syncing local history:", historyError);
          }
          await chrome.storage.local.set({
            pokemonCollection: [],
            pokemonHistory: []
          });
          console.log("✅ Auth listener: Local storage cleared - now using cloud data only");
          await fetchCloudCollection(authUser);
          updateSyncStatus("Connected to cloud", "synced");
          console.log("✅ Auth listener: Login complete - switched to cloud mode");
        } else if (event === "SIGNED_OUT") {
          console.log("🔄 Auth listener: User signed out - switching to local mode");
          setUser(null);
          await loadCollection();
          updateSyncStatus("Local storage only", "local");
          console.log("✅ Auth listener: Logout complete - switched to local mode");
        }
      });
    } catch (error) {
      console.error("Auth initialization error:", error);
      updateSyncStatus("Auth system offline", "error");
    }
  }, [services.auth, services.state, fetchCloudCollection, loadCollection, updateSyncStatus, services.sync]);
  const handleViewPokedex = reactExports.useCallback(() => {
    if (services.state.currentUser) {
      chrome.tabs.create({ url: chrome.runtime.getURL("dist/src/pokedex/index.html") });
    } else {
      alert("Please log in to view the Pokedex.");
    }
  }, [services.state.currentUser]);
  const handlePokemonClick = reactExports.useCallback((pokemon) => {
    services.pokemon.openPokemonDetail(pokemon);
  }, [services.pokemon]);
  reactExports.useEffect(() => {
    const initialize = async () => {
      if (isInitialized) return;
      try {
        await initializeSupabase();
        await initializeAuth();
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing app:", error);
        updateSyncStatus("Local storage only", "local");
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [isInitialized, initializeSupabase, initializeAuth, updateSyncStatus]);
  reactExports.useEffect(() => {
    const handleMessage = (message, sender, sendResponse) => {
      var _a, _b, _c;
      if (message.type === "COLLECTION_UPDATED") {
        console.log("🔄 Popup: Received collection update notification from:", ((_a = message.data) == null ? void 0 : _a.source) || "unknown");
        console.log("🔄 Popup: Pokemon caught:", ((_c = (_b = message.data) == null ? void 0 : _b.pokemon) == null ? void 0 : _c.name) || "unknown");
        if (user) {
          console.log("🔄 Refreshing cloud collection...");
          fetchCloudCollection(user);
        } else {
          console.log("🔄 Refreshing local collection...");
          loadCollection();
        }
        sendResponse({ success: true });
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [user, fetchCloudCollection, loadCollection]);
  reactExports.useEffect(() => {
    if (!user) {
      const handleStorageChange = (changes, areaName) => {
        if (areaName === "local" && changes.pokemonCollection) {
          console.log("🔄 Popup: Local storage changed, refreshing collection...");
          loadCollection();
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [user, loadCollection]);
  const stats = {
    totalCaught: collection.length,
    uniquePokemon: new Set(collection.map((p) => p.id)).size
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "popup-loading", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "top-section", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "indicators", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "indicator red" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "indicator yellow" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "indicator green" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "POKÉBROWSER" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "20px" }, children: "Loading..." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    showSyncIndicator && /* @__PURE__ */ jsxRuntimeExports.jsx(SyncIndicator, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "top-section", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "indicators", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "indicator red" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "indicator yellow" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "indicator green" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "POKÉBROWSER" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatsSection, { stats }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "section-title", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Recent Catches" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PokemonCollection,
      {
        collection,
        onPokemonClick: handlePokemonClick
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "action-section", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn secondary",
        onClick: handleViewPokedex,
        "aria-label": "View full Pokédex",
        children: "VIEW POKÉDEX"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AuthSection,
      {
        user,
        syncStatus,
        onLogin: handleLogin,
        onLogout: handleLogout
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bottom-section" })
  ] });
};
const appState = new AppState();
client.createRoot(document.getElementById("popup-root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(PopupApp, { appState }) })
);
//# sourceMappingURL=popup.js.map
