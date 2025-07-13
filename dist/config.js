const getCurrentEnvironment = () => {
  var _a, _b, _c, _d;
  if (typeof chrome !== "undefined" && ((_d = (_c = (_b = (_a = chrome == null ? void 0 : chrome.runtime) == null ? void 0 : _a.getManifest) == null ? void 0 : _b.call(_a)) == null ? void 0 : _c.version) == null ? void 0 : _d.includes("dev"))) {
    return "development";
  }
  return "production";
};
const ENVIRONMENTS = {
  development: {
    SUPABASE_URL: "https://mzoxfiqdhbitwoyspnfm.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM",
    ENABLE_DEBUGGING: true,
    RATE_LIMIT_ENABLED: false
  },
  production: {
    SUPABASE_URL: "https://mzoxfiqdhbitwoyspnfm.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM",
    ENABLE_DEBUGGING: false,
    RATE_LIMIT_ENABLED: true
  }
};
const ENV_CONFIG = ENVIRONMENTS[getCurrentEnvironment()];
const IS_PRODUCTION = getCurrentEnvironment() === "production";
const CONFIG = {
  // Environment-specific configuration
  SUPABASE_URL: ENV_CONFIG.SUPABASE_URL,
  SUPABASE_ANON_KEY: ENV_CONFIG.SUPABASE_ANON_KEY,
  // API Configuration
  POKEAPI_BASE_URL: "https://pokeapi.co/api/v2/pokemon",
  SPRITE_BASE_URL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon",
  ANIMATED_SPRITE_BASE_URL: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated",
  // Sync & Performance
  SYNC_DELAY: IS_PRODUCTION ? 2e3 : 1e3,
  // Slower sync in production
  BATCH_SIZE: IS_PRODUCTION ? 20 : 25,
  // Smaller batches in production
  AUTH_CHECK_INTERVAL: 1e3,
  IMMEDIATE_SYNC_ACTIONS: ["login", "new_pokemon", "user_action"],
  // Feature flags
  ANIMATIONS_ENABLED: true,
  DEBUGGING_ENABLED: ENV_CONFIG.ENABLE_DEBUGGING,
  RATE_LIMITING: ENV_CONFIG.RATE_LIMIT_ENABLED,
  // Security settings
  MAX_POKEMON_PER_USER: 200,
  // Prevent data abuse
  MAX_BATCH_SIZE: 50,
  REQUEST_TIMEOUT: 3e4
};
export {
  CONFIG as C
};
//# sourceMappingURL=config.js.map
