// config.js
import { ENV_CONFIG, IS_PRODUCTION } from './config/environment.js';

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
