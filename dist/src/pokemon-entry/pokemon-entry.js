import { j as jsxRuntimeExports, r as reactExports, A as AppState, c as client, R as React } from "../../supabase-client.js";
import { T as TypeUtils } from "../../TypeUtils.js";
import { U as Utils, A as APIService, H as HistoryService } from "../../HistoryService.js";
import { A as AuthService } from "../../AuthService.js";
import { C as CONFIG } from "../../config.js";
const LoadingState = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "loading", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "loading-text", children: "Loading Pokemon..." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pokeball-spinner" })
  ] }) });
};
const ErrorState = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "error", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "24px", marginBottom: "10px" }, children: "❌" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "18px", fontWeight: "bold" }, children: "Pokemon Not Found" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "14px", marginTop: "5px" }, children: "Please check the Pokemon ID and try again." })
  ] }) });
};
const PokemonDetails = ({ pokemonData, speciesData, historyData }) => {
  const cardFrameRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (pokemonData && cardFrameRef.current) {
      TypeUtils.applyTypeBackground(pokemonData.types, cardFrameRef.current);
    }
  }, [pokemonData]);
  const formatFirstCaughtDate = (historyData2) => {
    console.log("🔧 React: formatFirstCaughtDate called with:", historyData2);
    if (!historyData2) {
      console.log("❌ React: No history data provided");
      return "First catch date not available";
    }
    const dateField = historyData2.first_caught_at || historyData2.created_at || historyData2.caught_at;
    console.log("📅 React: Date field value:", dateField);
    console.log("📅 React: Date field type:", typeof dateField);
    if (!dateField) {
      console.log("❌ React: No date field found in history data");
      return "First catch date not available";
    }
    let date;
    if (typeof dateField === "string") {
      date = new Date(dateField);
    } else if (dateField instanceof Date) {
      date = dateField;
    } else if (typeof dateField === "number") {
      date = new Date(dateField);
    } else {
      console.log("❌ React: Unknown date field type:", typeof dateField);
      return "Unknown date format";
    }
    console.log("📅 React: Parsed date object:", date);
    console.log("📅 React: Date valid?", !isNaN(date.getTime()));
    const now = /* @__PURE__ */ new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    if (!isNaN(date.getTime()) && date <= now && date >= oneYearAgo) {
      try {
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        const formattedTime = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        });
        const finalText = `First caught: ${formattedDate} at ${formattedTime}`;
        console.log("✅ React: Returning formatted date:", finalText);
        return finalText;
      } catch (formatError) {
        console.log("❌ React: Date formatting failed:", formatError);
        return "Date formatting error";
      }
    } else if (!isNaN(date.getTime())) {
      console.log("❌ React: Date outside reasonable range:", date);
      return "Date unavailable";
    } else {
      console.log("❌ React: Date parsing failed - invalid date");
      return "Invalid date";
    }
  };
  const getDescription = (speciesData2) => {
    if (!speciesData2 || !speciesData2.flavor_text_entries) {
      return "No description available.";
    }
    const flavorTextEntry = speciesData2.flavor_text_entries.find((entry) => entry.language.name === "en");
    if (flavorTextEntry) {
      return `"${flavorTextEntry.flavor_text.replace(/[\n\f]/g, " ")}"`;
    }
    return "No description available.";
  };
  if (!pokemonData || !speciesData) {
    return null;
  }
  const spriteUrl = `${CONFIG.ANIMATED_SPRITE_BASE_URL}/${pokemonData.id}.gif`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "pokemon-details", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "card-frame", className: "card-frame", ref: cardFrameRef, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "white-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sprite-container", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        className: "pokemon-img",
        src: spriteUrl,
        alt: pokemonData.name
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "name", children: Utils.capitalizeFirst(pokemonData.name) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "number", children: [
      "#",
      String(pokemonData.id).padStart(3, "0")
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "value", children: [
        pokemonData.height / 10,
        " m"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "types",
          dangerouslySetInnerHTML: {
            __html: TypeUtils.createTypeIconsHTML(pokemonData.types)
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "value", children: [
        pokemonData.weight / 10,
        " kg"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "HEIGHT" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: TypeUtils.formatTypesLabel(pokemonData.types) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "WEIGHT" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "description", children: getDescription(speciesData) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "footer", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
      "FIRST CAUGHT ON",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatFirstCaughtDate(historyData) })
    ] }) })
  ] }) }) }) });
};
const PokemonEntryApp = () => {
  const [viewState, setViewState] = reactExports.useState("loading");
  const [pokemonData, setPokemonData] = reactExports.useState(null);
  const [speciesData, setSpeciesData] = reactExports.useState(null);
  const [historyData, setHistoryData] = reactExports.useState(null);
  const [cache] = reactExports.useState(() => /* @__PURE__ */ new Map());
  const [state] = reactExports.useState(() => new AppState());
  const [auth] = reactExports.useState(() => new AuthService(state));
  reactExports.useEffect(() => {
    initializePokemonEntry();
  }, []);
  const initializePokemonEntry = async () => {
    setViewState("loading");
    try {
      const params = Utils.parseURLParams();
      const pokemonId = params.id;
      if (!pokemonId) {
        throw new Error("No Pokémon ID provided.");
      }
      console.log("🔧 PokemonEntry: Loading Pokemon", pokemonId);
      const [pokemon, species] = await Promise.all([
        APIService.fetchPokemonData(pokemonId, cache),
        APIService.fetchSpeciesData(pokemonId, cache)
      ]);
      setPokemonData(pokemon);
      setSpeciesData(species);
      let history = null;
      try {
        console.log("🔧 PokemonEntry: Initializing authentication...");
        const client2 = await auth.initializeSupabase();
        state.setSupabase(client2);
        const user = await auth.initializeAuth();
        state.setUser(user);
        console.log("🔧 PokemonEntry: Auth initialized, user:", user == null ? void 0 : user.email);
        if (user) {
          const historyService = new HistoryService(state);
          history = await historyService.getFirstCaughtData(parseInt(pokemonId));
          console.log("📚 History data:", history);
        } else {
          console.log("🔧 PokemonEntry: No authenticated user found");
        }
      } catch (error) {
        console.error("❌ Error with authentication or history data:", error);
      }
      setHistoryData(history);
      setViewState("details");
    } catch (error) {
      console.error("Error initializing Pokémon entry page:", error);
      setViewState("error");
    }
  };
  if (viewState === "loading") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingState, {});
  }
  if (viewState === "error") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorState, {});
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PokemonDetails,
    {
      pokemonData,
      speciesData,
      historyData
    }
  );
};
client.createRoot(document.getElementById("pokemon-entry-root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(PokemonEntryApp, {}) })
);
//# sourceMappingURL=pokemon-entry.js.map
