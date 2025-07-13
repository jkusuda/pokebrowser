import { j as jsxRuntimeExports, r as reactExports, c as client, R as React } from "../../supabase-client.js";
import { P as PokemonService } from "../../PokemonService.js";
import { U as Utils } from "../../HistoryService.js";
import "../../config.js";
const PokedexHeader = ({ stats }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "pokedex-header", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "Pokedex" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pokedex-stats", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stat", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-number", children: stats.total }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-label", children: "Total" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stat", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-number", children: stats.unique }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-label", children: "Unique" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stat", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "stat-number", children: [
          stats.completion,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stat-label", children: "Completion" })
      ] })
    ] })
  ] });
};
const PokedexControls = ({ searchQuery, sortBy, onSearch, onSort, onRefresh }) => {
  const handleSearchChange = (e) => {
    onSearch(e.target.value);
  };
  const handleSortChange = (e) => {
    onSort(e.target.value);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pokedex-controls", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "search",
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search by name or ID..."
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: sortBy, onChange: handleSortChange, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "id", children: "Sort by ID" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "name", children: "Sort by Name" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "caughtAt", children: "Sort by Recent Catch" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "firstCaught", children: "Sort by First Caught" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onRefresh, className: "refresh-btn", children: "🔄 Refresh" })
  ] });
};
const PokedexEntry = ({ pokemon, onClick }) => {
  const handleClick = () => {
    if (pokemon.everOwned) {
      onClick();
    }
  };
  const entryClasses = `pokedex-entry ${pokemon.everOwned ? "caught" : "uncaught"}`;
  const spriteStyle = {
    filter: pokemon.everOwned ? "none" : "brightness(0)"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: entryClasses, onClick: handleClick, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        className: "pokedex-sprite",
        src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
        alt: pokemon.everOwned ? pokemon.name : "Unknown Pokemon",
        style: spriteStyle
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pokedex-info", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "pokedex-id", children: [
        "#",
        String(pokemon.id).padStart(3, "0")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "pokedex-name", children: pokemon.everOwned ? Utils.capitalizeFirst(pokemon.name) : "???" }),
      pokemon.everOwned && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pokedex-candy", style: { display: "flex" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "candy-icon", children: "🍬" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "candy-count", children: pokemon.candyCount || 0 })
      ] })
    ] })
  ] });
};
const PokedexGrid = ({ pokemonList, onPokemonClick }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pokedex-grid", children: pokemonList.map((pokemon, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    PokedexEntry,
    {
      pokemon,
      onClick: () => onPokemonClick(pokemon)
    },
    `${pokemon.id}-${pokemon.caughtAt}-${index}`
  )) });
};
const PokedexApp = () => {
  const [pokemonList, setPokemonList] = reactExports.useState([]);
  const [filteredList, setFilteredList] = reactExports.useState([]);
  const [stats, setStats] = reactExports.useState({ total: 0, unique: 0, completion: 0 });
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [sortBy, setSortBy] = reactExports.useState("id");
  const [loading, setLoading] = reactExports.useState(true);
  const [service] = reactExports.useState(() => new PokemonService());
  reactExports.useEffect(() => {
    initializePokedex();
  }, []);
  reactExports.useEffect(() => {
    const filtered = service.filterAndSort(searchQuery, sortBy);
    setFilteredList(filtered);
  }, [searchQuery, sortBy, pokemonList, service]);
  const initializePokedex = async () => {
    try {
      setLoading(true);
      await service.loadPokedex();
      const initialList = service.filterAndSort("", "id");
      const initialStats = service.getStats();
      setPokemonList(initialList);
      setFilteredList(initialList);
      setStats(initialStats);
    } catch (error) {
      console.error("Error initializing Pokedex:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleSearch = (query) => {
    setSearchQuery(query);
  };
  const handleSort = (sortOption) => {
    setSortBy(sortOption);
  };
  const handlePokemonClick = (pokemon) => {
    if (pokemon.everOwned) {
      const width = 400;
      const height = 600;
      const left = screen.width / 2 - width / 2;
      const top = screen.height / 2 - height / 2;
      if (window.chrome && chrome.windows && chrome.runtime) {
        const url = chrome.runtime.getURL(`dist/src/pokemon-entry/index.html?id=${pokemon.id}`);
        chrome.windows.create({
          url,
          type: "popup",
          width,
          height,
          left,
          top
        });
      } else {
        window.open(
          `dist/src/pokemon-entry/index.html?id=${pokemon.id}`,
          "_blank",
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    }
  };
  const refreshData = async () => {
    try {
      console.log("🔄 Pokedex: Refreshing candy and history data...");
      await service.refreshAllData();
      const newList = service.filterAndSort(searchQuery, sortBy);
      const newStats = service.getStats();
      setPokemonList(newList);
      setFilteredList(newList);
      setStats(newStats);
      console.log("✅ Pokedex: Data refreshed successfully");
    } catch (error) {
      console.error("❌ Pokedex: Error refreshing data:", error);
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pokedex-container", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "200px",
      fontSize: "18px"
    }, children: "Loading Pokedex..." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pokedex-container", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PokedexHeader, { stats }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PokedexControls,
      {
        searchQuery,
        sortBy,
        onSearch: handleSearch,
        onSort: handleSort,
        onRefresh: refreshData
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PokedexGrid,
      {
        pokemonList: filteredList,
        onPokemonClick: handlePokemonClick
      }
    )
  ] });
};
client.createRoot(document.getElementById("pokedex-root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(PokedexApp, {}) })
);
//# sourceMappingURL=pokedex.js.map
