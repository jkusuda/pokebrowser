import { j as jsxRuntimeExports, r as reactExports, A as AppState, c as client, R as React } from "../../supabase-client.js";
import { T as TypeUtils } from "../../TypeUtils.js";
import { U as Utils, A as APIService } from "../../HistoryService.js";
import { A as AuthService } from "../../AuthService.js";
import { S as SecurityValidator, P as PokemonService, C as CandyService } from "../../PokemonService.js";
import { E as EVOLUTION_DATA, C as CANDY_FAMILY_MAP, P as POKEMON_NAMES } from "../../evolution-data.js";
import { C as CONFIG } from "../../config.js";
class EvolutionService {
  constructor(appState) {
    this.appState = appState;
  }
  // Check if Pokemon has evolution available
  canEvolve(pokemonId) {
    const id = parseInt(pokemonId);
    return EVOLUTION_DATA.hasOwnProperty(id);
  }
  // Get evolution details for Pokemon
  getEvolutionInfo(pokemonId) {
    const id = parseInt(pokemonId);
    const evolutionData = EVOLUTION_DATA[id];
    if (!evolutionData) {
      return null;
    }
    if (evolutionData.evolutions) {
      return evolutionData.evolutions[0];
    }
    return evolutionData;
  }
  // Get which candy type Pokemon uses for evolution
  getBaseCandyId(pokemonId) {
    const id = parseInt(pokemonId);
    return CANDY_FAMILY_MAP[id] || id;
  }
  // Get display name for Pokemon's candy type
  getBaseCandyName(pokemonId) {
    const baseCandyId = this.getBaseCandyId(pokemonId);
    const pokemonName = POKEMON_NAMES[baseCandyId];
    return pokemonName ? `${pokemonName}` : "Unknown";
  }
  // Check if user has enough candy to evolve Pokemon
  validateEvolutionWithBaseCandy(pokemonId, currentCandy) {
    const evolutionInfo = this.getEvolutionInfo(pokemonId);
    if (!evolutionInfo) {
      return { success: false, message: "This Pokemon cannot evolve!" };
    }
    if (currentCandy < evolutionInfo.candyCost) {
      const baseCandyName = this.getBaseCandyName(pokemonId);
      return {
        success: false,
        message: `Not enough candy! Need ${evolutionInfo.candyCost} ${baseCandyName} candy, but you only have ${currentCandy}.`
      };
    }
    return { success: true };
  }
  // Transform Pokemon into its evolved form
  async evolvePokemon(pokemon, currentCandy) {
    try {
      const pokemonId = parseInt(pokemon.pokemon_id);
      const evolutionInfo = this.getEvolutionInfo(pokemonId);
      if (!evolutionInfo) {
        throw new Error("This Pokemon cannot evolve!");
      }
      const validation = this.validateEvolutionWithBaseCandy(pokemonId, currentCandy);
      if (!validation.success) {
        throw new Error(validation.message);
      }
      const securityCheck = await SecurityValidator.validateRequest("evolve_pokemon", {
        pokemon,
        evolutionInfo,
        currentCandy
      }, this.appState.currentUser);
      if (!securityCheck.valid) {
        throw new Error(`Security validation failed: ${securityCheck.error}`);
      }
      const evolvedPokemon = {
        ...pokemon,
        pokemon_id: evolutionInfo.evolvesTo,
        name: evolutionInfo.name.toLowerCase(),
        evolved_at: (/* @__PURE__ */ new Date()).toISOString(),
        evolved_from: pokemonId
      };
      if (!this.appState.canSync()) {
        throw new Error("You must be logged in to evolve Pokemon!");
      }
      if (!pokemon.id) {
        throw new Error("Invalid Pokemon object: missing primary key (id)");
      }
      if (!pokemon.user_id || pokemon.user_id !== this.appState.currentUser.id) {
        throw new Error("Pokemon does not belong to the current user");
      }
      console.log("✅ Evolving Pokemon from Supabase:", pokemon);
      const { error: updateError } = await this.appState.supabase.from("pokemon").update({
        pokemon_id: evolvedPokemon.pokemon_id,
        name: evolvedPokemon.name,
        evolved_at: evolvedPokemon.evolved_at,
        evolved_from: evolvedPokemon.evolved_from
      }).eq("id", pokemon.id);
      if (updateError) {
        console.error("❌ Error updating Pokemon in Supabase:", updateError);
        throw new Error("Failed to update Pokemon in database");
      }
      console.log("✅ Pokemon successfully evolved in Supabase");
      if (chrome.runtime && chrome.runtime.sendMessage) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: "POKEMON_EVOLVED",
            data: {
              pokemon: evolvedPokemon,
              candyCost: evolutionInfo.candyCost,
              baseCandyId: this.getBaseCandyId(pokemonId)
            }
          });
          if (response && response.success) {
            console.log("✅ Evolution message sent successfully - Candy deducted!");
          }
        } catch (candyError) {
          console.error("❌ Error sending evolution message:", candyError);
        }
      }
      return { success: true, evolvedPokemon };
    } catch (error) {
      console.error("Error evolving Pokemon:", error);
      return { success: false, error: error.message };
    }
  }
}
const LoadingState = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "loading", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "loading-text", children: "Loading Pokemon..." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pokeball-spinner" })
  ] }) });
};
const ErrorState = ({ message = "An error occurred" }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "error", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "error-icon", children: "❌" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "error-title", children: "Pokemon Not Found" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "error-message", children: message })
  ] }) });
};
const PokemonDetailCard = ({
  pokemon,
  pokemonData,
  speciesData,
  candyCount,
  baseCandyName,
  canEvolve,
  evolutionInfo,
  onEvolve,
  onSummon,
  onRelease
}) => {
  const cardFrameRef = reactExports.useRef(null);
  const [isEvolving, setIsEvolving] = reactExports.useState(false);
  const [isReleasing, setIsReleasing] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (pokemonData && cardFrameRef.current) {
      TypeUtils.applyTypeBackground(pokemonData.types, cardFrameRef.current);
    }
  }, [pokemonData]);
  const handleEvolveClick = async () => {
    setIsEvolving(true);
    try {
      await onEvolve();
    } finally {
      setIsEvolving(false);
    }
  };
  const handleReleaseClick = async () => {
    setIsReleasing(true);
    try {
      await onRelease();
    } finally {
      setIsReleasing(false);
    }
  };
  const getSpriteUrl = () => {
    if (!pokemon) return "";
    const shinyPath = pokemon.shiny ? "shiny/" : "";
    return `${CONFIG.ANIMATED_SPRITE_BASE_URL}/${shinyPath}${pokemon.id}.gif`;
  };
  const getStaticSpriteUrl = () => {
    if (!pokemon) return "";
    const shinyPath = pokemon.shiny ? "shiny/" : "";
    return `${CONFIG.SPRITE_BASE_URL}/${shinyPath}${pokemon.id}.png`;
  };
  const getDescription = () => {
    if (!speciesData || !speciesData.flavor_text_entries) {
      return '"Loading description..."';
    }
    const flavorTextEntry = speciesData.flavor_text_entries.find((entry) => entry.language.name === "en");
    if (flavorTextEntry) {
      return `"${flavorTextEntry.flavor_text.replace(/[\n\f]/g, " ")}"`;
    }
    return '"No description available."';
  };
  const getCandyLabel = () => {
    const candyName = baseCandyName || (pokemon ? Utils.capitalizeFirst(pokemon.name) : "Pokemon");
    return `${candyName} Candy`;
  };
  const getEvolveCostText = () => {
    if (!evolutionInfo) return "";
    const candyNeeded = Math.max(0, evolutionInfo.candyCost - candyCount);
    if (candyNeeded > 0) {
      return `${candyNeeded} more candy needed`;
    } else {
      return `Costs ${evolutionInfo.candyCost} candy`;
    }
  };
  const getEvolveCostColor = () => {
    if (!evolutionInfo) return "#666";
    const candyNeeded = Math.max(0, evolutionInfo.candyCost - candyCount);
    return candyNeeded > 0 ? "#ff6b6b" : "#4CAF50";
  };
  const canEvolveNow = () => {
    return canEvolve && evolutionInfo && candyCount >= evolutionInfo.candyCost;
  };
  const getCatchInfo = () => {
    if (!pokemon || !pokemon.site || !pokemon.caughtAt) {
      return { site: "Unknown site", date: "Unknown date" };
    }
    return {
      site: `Caught on ${pokemon.site}`,
      date: new Date(pokemon.caughtAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    };
  };
  if (!pokemon) {
    return null;
  }
  const name = pokemon.name ? Utils.capitalizeFirst(pokemon.name) : "Unknown";
  const displayName = pokemon.shiny ? `${name} ⭐` : name;
  const catchInfo = getCatchInfo();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "pokemon-details", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "card-frame", className: "card-frame", ref: cardFrameRef, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "white-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sprite-container", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        className: "pokemon-img",
        src: getSpriteUrl(),
        alt: pokemon.name,
        onError: (e) => {
          e.target.src = getStaticSpriteUrl();
          e.target.onerror = () => {
            e.target.style.display = "none";
          };
        }
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "name", children: displayName }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "number", children: [
      "#",
      String(pokemon.id).padStart(3, "0")
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "value", children: pokemonData ? `${pokemonData.height / 10} m` : "-- m" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "types",
          dangerouslySetInnerHTML: {
            __html: pokemonData ? TypeUtils.createTypeIconsHTML(pokemonData.types, true) : ""
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "value", children: pokemonData ? `${pokemonData.weight / 10} kg` : "-- kg" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "HEIGHT" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: pokemonData ? TypeUtils.formatTypesLabel(pokemonData.types) : "LOADING" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "WEIGHT" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "candy", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: getCandyLabel() }),
      ":",
      /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
        " ",
        candyCount
      ] })
    ] }),
    canEvolve && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "evolve-section", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "evolve-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `btn evolve-left ${!canEvolveNow() ? "disabled" : ""}`,
            onClick: handleEvolveClick,
            disabled: !canEvolveNow() || isEvolving,
            style: { opacity: canEvolveNow() ? "1" : "0.6" },
            children: isEvolving ? "Evolving..." : "EVOLVE"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "evolve-right",
            style: { color: getEvolveCostColor() },
            children: getEvolveCostText()
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn summon", onClick: onSummon, children: "SUMMON" })
    ] }),
    !canEvolve && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "evolve-section", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn summon", onClick: onSummon, children: "SUMMON" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "description", children: getDescription() }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "footer", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
      "CAUGHT ON",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", style: { textDecoration: "none", color: "inherit" }, children: catchInfo.site }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: catchInfo.date })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "release-container", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn release-button",
        onClick: handleReleaseClick,
        disabled: isReleasing,
        children: isReleasing ? "Releasing..." : "🗑️ RELEASE"
      }
    ) })
  ] }) }) }) });
};
const PokemonDetailApp = () => {
  const [viewState, setViewState] = reactExports.useState("loading");
  const [pokemon, setPokemon] = reactExports.useState(null);
  const [pokemonData, setPokemonData] = reactExports.useState(null);
  const [speciesData, setSpeciesData] = reactExports.useState(null);
  const [candyCount, setCandyCount] = reactExports.useState(0);
  const [baseCandyName, setBaseCandyName] = reactExports.useState(null);
  const [evolutionInfo, setEvolutionInfo] = reactExports.useState(null);
  const [canEvolve, setCanEvolve] = reactExports.useState(false);
  const [errorMessage, setErrorMessage] = reactExports.useState("An error occurred");
  const [services] = reactExports.useState(() => {
    const state = new AppState();
    return {
      state,
      auth: new AuthService(state),
      pokemon: new PokemonService(state),
      evolution: new EvolutionService(state),
      candy: null
      // Will be initialized after auth
    };
  });
  reactExports.useEffect(() => {
    initializePokemonDetail();
  }, []);
  const initializePokemonDetail = async () => {
    try {
      setViewState("loading");
      await initializeAuth();
      const params = Utils.parseURLParams();
      console.log("🔍 Loading Pokemon with params:", {
        id: params.id,
        caughtAt: params.caughtAt,
        site: params.site,
        userLoggedIn: !!services.state.currentUser
      });
      if (!params.supabaseId) {
        throw new Error("No Supabase ID found in URL. Cannot load Pokémon.");
      }
      if (!services.state.currentUser) {
        throw new Error("You must be logged in to view Pokémon details.");
      }
      const { data: fetchedPokemon, error } = await services.state.supabase.from("pokemon").select("*").eq("id", params.supabaseId).single();
      if (error || !fetchedPokemon) {
        console.error("❌ Could not find Pokémon in Supabase:", error);
        throw new Error("Could not find the specified Pokémon.");
      }
      if (fetchedPokemon.user_id !== services.state.currentUser.id) {
        console.error("❌ Pokémon belongs to different user:", {
          pokemonUserId: fetchedPokemon.user_id,
          currentUserId: services.state.currentUser.id
        });
        throw new Error("You don't have permission to view this Pokémon.");
      }
      console.log("📝 Using Pokemon data from Supabase for display:", fetchedPokemon);
      setPokemon(fetchedPokemon);
      services.state.setPokemon(fetchedPokemon);
      await fetchApiData(fetchedPokemon.pokemon_id);
      setViewState("details");
    } catch (error) {
      console.error("Error initializing Pokemon detail:", error);
      setErrorMessage(error.message);
      setViewState("error");
    }
  };
  const initializeAuth = async () => {
    try {
      const client2 = await services.auth.initializeSupabase();
      services.state.setSupabase(client2);
      const user = await services.auth.initializeAuth();
      services.state.setUser(user);
      console.log("🔧 PokemonDetail: Auth initialized");
      services.state.logAuthStatus();
      if (user) {
        console.log("🔧 PokemonDetail: Initializing CandyService for user:", user.email);
        services.candy = new CandyService(services.state);
      }
    } catch (error) {
      console.warn("❌ Auth initialization failed:", error);
      services.state.logAuthStatus();
    }
  };
  const fetchApiData = async (pokemonId) => {
    try {
      const cache = services.state.getCache();
      const [pokemonApiData, speciesApiData] = await Promise.all([
        APIService.fetchPokemonData(pokemonId, cache),
        APIService.fetchSpeciesData(pokemonId, cache)
      ]);
      setPokemonData(pokemonApiData);
      setSpeciesData(speciesApiData);
      services.state.setPokemonData(pokemonApiData);
      let currentCandyCount = 0;
      let currentBaseCandyName = null;
      if (services.candy) {
        try {
          const candyData = await services.candy.getCandyForUser();
          const baseCandyId = services.evolution.getBaseCandyId(pokemonId);
          currentCandyCount = candyData.get(baseCandyId) || 0;
          currentBaseCandyName = services.evolution.getBaseCandyName(pokemonId);
        } catch (error) {
          console.error("Error loading candy data:", error);
        }
      }
      setCandyCount(currentCandyCount);
      setBaseCandyName(currentBaseCandyName);
      const pokemonCanEvolve = services.evolution.canEvolve(pokemonId);
      const currentEvolutionInfo = pokemonCanEvolve ? services.evolution.getEvolutionInfo(pokemonId) : null;
      setCanEvolve(pokemonCanEvolve);
      setEvolutionInfo(currentEvolutionInfo);
      console.log("🔧 Evolution status:", {
        pokemonId,
        userLoggedIn: !!services.state.currentUser,
        pokemonCanEvolve,
        hasEvolutionInfo: !!currentEvolutionInfo,
        candyCount: currentCandyCount
      });
    } catch (error) {
      console.error("Error fetching API data:", error);
    }
  };
  const handleEvolution = async () => {
    const pokemonId = parseInt(pokemon.pokemon_id);
    if (!services.candy) {
      alert("You must be logged in to evolve Pokemon!");
      return;
    }
    let currentCandy = 0;
    try {
      const candyData = await services.candy.getCandyForUser();
      const baseCandyId = services.evolution.getBaseCandyId(pokemonId);
      currentCandy = candyData.get(baseCandyId) || 0;
    } catch (error) {
      console.error("Error getting candy count:", error);
      alert("Failed to check candy count. Please try again.");
      return;
    }
    const currentEvolutionInfo = services.evolution.getEvolutionInfo(pokemonId);
    if (!currentEvolutionInfo) {
      alert("This Pokemon cannot evolve!");
      return;
    }
    const validation = services.evolution.validateEvolutionWithBaseCandy(pokemonId, currentCandy);
    if (!validation.success) {
      alert(validation.message);
      return;
    }
    const confirmMessage = `Evolve ${Utils.capitalizeFirst(pokemon.name)} into ${currentEvolutionInfo.name}?

This will cost ${currentEvolutionInfo.candyCost} candy and cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    try {
      const result = await services.evolution.evolvePokemon(pokemon, currentCandy);
      if (!result.success) {
        throw new Error(result.error);
      }
      const fromName = Utils.capitalizeFirst(pokemon.name);
      const toName = Utils.capitalizeFirst(result.evolvedPokemon.name);
      showEvolutionSuccess(fromName, toName);
      setPokemon(result.evolvedPokemon);
      services.state.setPokemon(result.evolvedPokemon);
      const cache = services.state.getCache();
      const evolvedPokemonData = await APIService.fetchPokemonData(result.evolvedPokemon.pokemon_id, cache);
      setPokemonData(evolvedPokemonData);
      services.state.setPokemonData(evolvedPokemonData);
      console.log("⏳ Waiting for candy deduction to process...");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("🔄 Refreshing candy data after evolution...");
      const newCandyData = await services.candy.refreshCandyData();
      const newBaseCandyId = services.evolution.getBaseCandyId(result.evolvedPokemon.pokemon_id);
      const newCandyCount = newCandyData.get(newBaseCandyId) || 0;
      const newBaseCandyName = services.evolution.getBaseCandyName(result.evolvedPokemon.pokemon_id);
      setCandyCount(newCandyCount);
      setBaseCandyName(newBaseCandyName);
      const newCanEvolve = services.evolution.canEvolve(result.evolvedPokemon.pokemon_id);
      const newEvolutionInfo = newCanEvolve ? services.evolution.getEvolutionInfo(result.evolvedPokemon.pokemon_id) : null;
      setCanEvolve(newCanEvolve);
      setEvolutionInfo(newEvolutionInfo);
      console.log(`✅ UI updated with new candy count: ${newCandyCount} ${newBaseCandyName} candy`);
      try {
        const evolvedSpeciesData = await APIService.fetchSpeciesData(result.evolvedPokemon.pokemon_id, cache);
        setSpeciesData(evolvedSpeciesData);
      } catch (speciesError) {
        console.warn("Could not fetch evolved Pokemon species data:", speciesError);
      }
    } catch (error) {
      console.error("Error evolving Pokemon:", error);
      alert(`Evolution failed: ${error.message}`);
    }
  };
  const handleRelease = async () => {
    if (!confirm("Are you sure you want to release this Pokémon? This action cannot be undone.")) {
      return;
    }
    try {
      await services.pokemon.releasePokemon(pokemon);
      alert("Pokémon released! 💔");
      await Utils.delay(500);
      window.close();
    } catch (error) {
      console.error("Error releasing Pokémon:", error);
      alert(`Failed to release Pokémon: ${error.message}`);
    }
  };
  const handleSummon = () => {
    alert("Summon feature coming soon!");
  };
  const showEvolutionSuccess = (fromName, toName) => {
    const successMessage = document.createElement("div");
    successMessage.className = "evolution-success";
    successMessage.innerHTML = `
      <div class="success-content">
        <div class="success-icon">🎉</div>
        <div class="success-text">${fromName} evolved into ${toName}!</div>
      </div>
    `;
    successMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(76, 175, 80, 0.95);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 1000;
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(successMessage);
    setTimeout(() => {
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage);
      }
    }, 3e3);
  };
  if (viewState === "loading") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingState, {});
  }
  if (viewState === "error") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorState, { message: errorMessage });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PokemonDetailCard,
    {
      pokemon,
      pokemonData,
      speciesData,
      candyCount,
      baseCandyName,
      canEvolve,
      evolutionInfo,
      onEvolve: handleEvolution,
      onSummon: handleSummon,
      onRelease: handleRelease
    }
  );
};
client.createRoot(document.getElementById("pokemon-detail-root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(PokemonDetailApp, {}) })
);
//# sourceMappingURL=pokemon-detail.js.map
