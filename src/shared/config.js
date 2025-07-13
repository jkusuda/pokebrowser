// Unified configuration for all extension contexts
// Works in background scripts, content scripts, and React components

// Environment detection
const getCurrentEnvironment = () => {
    // In production, you might detect this differently
    // For now, we'll use a simple check
    if (typeof chrome !== 'undefined' && chrome?.runtime?.getManifest?.()?.version?.includes('dev')) {
        return 'development';
    }
    return 'production';
};

const ENVIRONMENTS = {
    development: {
        SUPABASE_URL: 'https://mzoxfiqdhbitwoyspnfm.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM',
        ENABLE_DEBUGGING: true,
        RATE_LIMIT_ENABLED: false
    },
    production: {
        SUPABASE_URL: 'https://mzoxfiqdhbitwoyspnfm.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM',
        ENABLE_DEBUGGING: false,
        RATE_LIMIT_ENABLED: true
    }
};

export const ENV_CONFIG = ENVIRONMENTS[getCurrentEnvironment()];
export const IS_PRODUCTION = getCurrentEnvironment() === 'production';

export const CONFIG = {
    // Environment-specific configuration
    SUPABASE_URL: ENV_CONFIG.SUPABASE_URL,
    SUPABASE_ANON_KEY: ENV_CONFIG.SUPABASE_ANON_KEY,
    
    // API Configuration
    POKEAPI_BASE_URL: 'https://pokeapi.co/api/v2/pokemon',
    SPRITE_BASE_URL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon',
    ANIMATED_SPRITE_BASE_URL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated',
    
    // Sync & Performance
    SYNC_DELAY: IS_PRODUCTION ? 2000 : 1000, // Slower sync in production
    BATCH_SIZE: IS_PRODUCTION ? 20 : 25, // Smaller batches in production
    AUTH_CHECK_INTERVAL: 1000,
    IMMEDIATE_SYNC_ACTIONS: ['login', 'new_pokemon', 'user_action'],
    
    // Feature flags
    ANIMATIONS_ENABLED: true,
    DEBUGGING_ENABLED: ENV_CONFIG.ENABLE_DEBUGGING,
    RATE_LIMITING: ENV_CONFIG.RATE_LIMIT_ENABLED,
    
    // Security settings
    MAX_POKEMON_PER_USER: 200, // Prevent data abuse
    MAX_BATCH_SIZE: 50,
    REQUEST_TIMEOUT: 30000
};
