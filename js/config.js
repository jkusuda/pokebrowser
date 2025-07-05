// config.js

// TODO: Look at security concerns. I think anyone can get my API Key LOL

export const CONFIG = {
    SUPABASE_URL: 'https://mzoxfiqdhbitwoyspnfm.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM',
    POKEAPI_BASE_URL: 'https://pokeapi.co/api/v2/pokemon',
    SPRITE_BASE_URL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon',
    ANIMATED_SPRITE_BASE_URL: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated',
    SYNC_DELAY: 1000,
    BATCH_SIZE: 25,
    AUTH_CHECK_INTERVAL: 1000,
    IMMEDIATE_SYNC_ACTIONS: ['login', 'new_pokemon', 'user_action'],
    ANIMATIONS_ENABLED: true
};
