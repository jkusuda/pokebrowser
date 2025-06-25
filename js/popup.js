// POPUP.JS
/*
- Auth Initialization
- Syncing logic
- Displaying collection content
*/
// Import statements
import { generateCollectionHash } from './utils/hash-generator.js';
import { formatDate } from './utils/date-formatter.js';

// Constants
const SUPABASE_URL = 'https://mzoxfiqdhbitwoyspnfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM'; // Empty - this should contain your public API key

// Global variables
let supabase;        // Supabase client instance
let currentUser = null;    // Stores the currently authenticated user object
let lastSyncHash = null;   // Tracks the last synced collection's hash to avoid unnecessary syncs
let syncTimeout = null;    // Stores timeout ID for debounced sync operations

// DOM elements cache - storing references prevents repeated DOM queries (performance optimization)
const elements = {};

// Initialize DOM element references
function initElements() {
    // Array of element IDs
    const ids = ['auth-section', 'logged-out-state', 'logged-in-state', 'login-btn', 
                 'logout-btn', 'user-email', 'sync-status', 'pokemon-collection', 
                 'total-caught', 'unique-count'];
    
    // For each ID, get the DOM element and store it in our cache object
    ids.forEach(id => {
        elements[id.replace(/-/g, '_')] = document.getElementById(id);
    });
}

//Initialize Supabase client
function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        updateSyncStatus('Cloud sync not configured', 'error');
        return false;
    }

    // Check if Supabase library is loaded
    if (typeof window.supabase !== 'undefined') {
        // Create Supabase client instance with URL and anon key
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // Verify the client was created
        return supabase && typeof supabase.from === 'function';
    }
    
    updateSyncStatus('Cloud sync library not loaded', 'error');
    return false;
}

// Initialize authentication system
async function initAuth() {
    if (!supabase) return; // Exit if Supabase isn't initialized

    try {
        const { data: { session }, error } = await supabase.auth.getSession(); 
        if (error) throw error;
        
        if (session) {
            // User is logged in
            currentUser = session.user; // Store user object globally
            showLoggedInState();         // Update UI to show logged-in state
            await syncFromCloud();       // Download Pokemon from cloud
            
            // Check for local Pokemon that might need to be synced up
            const { pokemonCollection = [] } = await chrome.storage.local.get(['pokemonCollection']);
            
            // If there are local Pokemon, sync them to cloud after a delay
            if (pokemonCollection.length > 0) {
                setTimeout(() => syncToCloud(pokemonCollection, true), 2000);
            }
        } else {
            // No active session - user is logged out
            showLoggedOutState();
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
        updateSyncStatus('Auth system offline', 'error');
    }
}

/**
 * Show logged-out UI state
 * DOM manipulation: Adding/removing CSS classes to show/hide elements
 */
function showLoggedOutState() {
    elements.logged_out_state?.classList.remove('hidden');
    elements.logged_in_state?.classList.add('hidden');
    updateSyncStatus('Local storage only', 'local');
}

// Show logged-in UI state
// Updates UI elements and displays user information
function showLoggedInState() {
    elements.logged_out_state?.classList.add('hidden');
    elements.logged_in_state?.classList.remove('hidden');

    if (currentUser && elements.user_email) {
        elements.user_email.textContent = `Trainer: ${currentUser.email}`;
        updateSyncStatus('Cloud sync enabled', 'synced');
    }
}

// Update sync status display
function updateSyncStatus(message, type = 'local') {
    console.log(`Sync status: ${message} (${type})`);
    
    if (elements.sync_status) {
        elements.sync_status.textContent = message;
        elements.sync_status.className = `sync-status ${type}`;
    }
}

// Open authentication popup window
function openAuthPopup() {
    const popup = window.open(
        chrome.runtime.getURL('../html/auth.html'), // Get full URL to extension file
        'auth',                                      // Window name
        'width=400,height=500,scrollbars=yes,resizable=yes' // Window features
    );
    
    // Polling mechanism: Check if popup is closed every second
    const checkAuth = setInterval(async () => {
        if (popup.closed) { // popup.closed is true when window is closed
            clearInterval(checkAuth); // Stop the polling
            
            if (supabase) {
                try {
                    // Check if authentication was successful
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        currentUser = session.user;
                        showLoggedInState();
                        await syncFromCloud();
                    }
                } catch (error) {
                    console.error('Error checking session after popup:', error);
                }
            }
        }
    }, 1000); // Execute every 1000ms (1 second)
}

// Handle user logout
async function handleLogout() {
    try {
        // Disable logout button to prevent multiple clicks
        if (elements.logout_btn) elements.logout_btn.disabled = true;
        updateSyncStatus('Signing out...', 'syncing');
        
        // Supabase signOut(): Clears authentication session
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Reset global state variables
        currentUser = null;
        lastSyncHash = null;
        
        // Clear local Pokemon collection
        await chrome.storage.local.set({ pokemonCollection: [] });

        showLoggedOutState();
        loadCollection(); // Refresh the display (will show empty state)
        
    } catch (error) {
        console.error('Logout error:', error);
        updateSyncStatus('Error signing out', 'error');
    } finally {
        // Re-enable logout button
        if (elements.logout_btn) elements.logout_btn.disabled = false;
    }
}

 // Prevents excessive API calls when user catches many Pokemon quickly
function debouncedSync(collection) {
    if (!canSync()) return; // Early exit if sync isn't possible
    
    // Clear existing timeout to reset the delay
    clearTimeout(syncTimeout);
    // Set new timeout - only executes if no new calls within 3 seconds
    syncTimeout = setTimeout(() => syncToCloud(collection), 3000);
}

// Check if sync is possible
function canSync() {
    return currentUser && navigator.onLine && supabase;
}

/**
 * Sync Pokemon collection to cloud database
 * @param {Array} collection - Local Pokemon collection
 * @param {boolean} force - Force sync even if unchanged
 */
async function syncToCloud(collection, force = false) {
    if (!canSync() || (!collection.length && !force)) return;
    
    // Generate hash of current collection to detect changes
    const currentHash = generateCollectionHash(collection);
    if (!force && lastSyncHash === currentHash) {
        console.log('Collection unchanged, skipping sync');
        return;
    }
    
    try {
        updateSyncStatus('Syncing to cloud...', 'syncing');
        
        // Fetch existing Pokemon from cloud database
        const { data: existingPokemon, error: fetchError } = await supabase
            .from('pokemon')
            .select('pokemon_id, site_caught, caught_at')
            .eq('user_id', currentUser.id);

        if (fetchError) throw fetchError;
        
        // Create Set for fast lookups of existing Pokemon
        const existingKeys = new Set(
            // Map array to create unique keys for each Pokemon
            (existingPokemon || []).map(p => 
                `${p.pokemon_id}|${p.site_caught}|${new Date(p.caught_at).getTime()}`
            )
        );
        
        // Filter to find only new Pokemon not in cloud
        const newPokemon = collection.filter(pokemon => {
            const key = `${pokemon.id}|${pokemon.site}|${new Date(pokemon.caughtAt).getTime()}`;
            return !existingKeys.has(key);
        });
        
        if (newPokemon.length > 0) {
            // Batch processing: Insert Pokemon in groups to avoid overwhelming the database
            const batchSize = 10;
            let totalInserted = 0;
            
            for (let i = 0; i < newPokemon.length; i += batchSize) {
                const batch = newPokemon.slice(i, i + batchSize);
                
                // Transform local Pokemon format to database format
                const pokemonToInsert = batch.map(pokemon => ({
                    user_id: currentUser.id,
                    pokemon_id: pokemon.id,
                    name: pokemon.name,
                    species: pokemon.species || pokemon.name, // Fallback if species not set
                    level: pokemon.level || null,            // null for database compatibility
                    type1: pokemon.types?.[0] || 'normal',   // Optional chaining with fallback
                    type2: pokemon.types?.[1] || null,
                    site_caught: pokemon.site,
                    caught_at: pokemon.caughtAt
                }));
                
                // Insert batch into database
                const { error: insertError } = await supabase
                    .from('pokemon')
                    .insert(pokemonToInsert);
                
                if (insertError) throw insertError;
                totalInserted += batch.length;
            }
            
            updateSyncStatus(`Synced ${totalInserted} new Pokémon`, 'synced');
        } else {
            updateSyncStatus('All Pokémon already synced', 'synced');
        }
        
        // Update hash to prevent redundant syncs
        lastSyncHash = currentHash;
        
    } catch (error) {
        console.error('Sync to cloud error:', error);
        updateSyncStatus(`Sync failed: ${error.message}`, 'error');
    }
}

// Sync Pokemon collection from cloud database
async function syncFromCloud() {
    if (!canSync()) return;
    
    try {
        updateSyncStatus('Syncing from cloud...', 'syncing');
        
        // Fetch all user's Pokemon from cloud, ordered by catch date (newest first)
        const { data: cloudPokemon, error } = await supabase
            .from('pokemon')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('caught_at', { ascending: false }); // Sort by date descending
        
        if (error) throw error;
        
        // Get current local collection
        const { pokemonCollection: localCollection = [] } = await chrome.storage.local.get(['pokemonCollection']);
        
        // Convert cloud database format to local app format
        const cloudCollection = (cloudPokemon || []).map(p => ({
            id: p.pokemon_id,
            name: p.name,
            species: p.species,
            level: p.level,
            types: [p.type1, p.type2].filter(Boolean), // Remove null/undefined types
            site: p.site_caught,
            caughtAt: p.caught_at
        }));
        
        // Merge collections without duplicates
        const mergedCollection = mergeCollections(localCollection, cloudCollection);
        
        // Only update storage if collections actually differ
        const localHash = generateCollectionHash(localCollection);
        const mergedHash = generateCollectionHash(mergedCollection);
        
        if (localHash !== mergedHash) {
            // Update local storage with merged collection
            await chrome.storage.local.set({ pokemonCollection: mergedCollection });
            loadCollection(); // Refresh UI display
            
            const newCount = mergedCollection.length - localCollection.length;
            updateSyncStatus(`Synced from cloud (${newCount} new)`, 'synced');
        } else {
            updateSyncStatus('Already up to date', 'synced');
        }
        
    } catch (error) {
        console.error('Sync from cloud error:', error);
        updateSyncStatus(`Sync failed: ${error.message}`, 'error');
    }
}

// Merge two Pokemon collections without duplicates
function mergeCollections(collection1, collection2) {
    // Spread operator (...): Creates new array with all elements from collection1
    const merged = [...collection1];
    
    // Create set of existing Pokemon keys
    const existingKeys = new Set(
        collection1.map(p => 
            `${p.id}|${p.site}|${new Date(p.caughtAt).getTime()}`
        )
    );
    
    // Add Pokemon from collection2 that don't already exist
    for (const pokemon of collection2) {
        const key = `${pokemon.id}|${pokemon.site}|${new Date(pokemon.caughtAt).getTime()}`;
        if (!existingKeys.has(key)) {
            merged.push(pokemon);
            existingKeys.add(key); // Track this key to prevent future duplicates
        }
    }
    
    // Sort by catch date (newest first)
    return merged.sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt));
}

// Load and display Pokemon collection from local storage
// Main function for updating the UI with current Pokemon data
async function loadCollection() {
    try {
        // Empty array if no collection exists
        const { pokemonCollection: collection = [] } = await chrome.storage.local.get(['pokemonCollection']);
        
        displayCollection(collection); // Update UI display
        updateStats(collection);       // Update statistics counters
        
        // Auto-sync if user is logged in and has Pokemon
        if (currentUser && navigator.onLine && supabase && collection.length > 0) {
            // Slight delay before syncing to avoid conflicts
            setTimeout(() => debouncedSync(collection), 1000);
        }
    } catch (error) {
        console.error('Error loading collection:', error);
    }
}

// Display Pokemon collection in the UI
function displayCollection(collection) {
    if (!elements.pokemon_collection) return;
    
    // Handle empty collection case
    if (collection.length === 0) {
        elements.pokemon_collection.innerHTML = `
            <div class="empty-state">
                <h3>POKEDEX EMPTY</h3>
                <p>Scan web pages to detect wild Pokémon and begin data collection...</p>
            </div>
        `;
        return;
    }
    
    // Sort collection by catch date (newest first)
    const sortedCollection = collection.sort((a, b) => 
        new Date(b.caughtAt) - new Date(a.caughtAt)
    );
    
    // Generate HTML for each Pokemon
    elements.pokemon_collection.innerHTML = sortedCollection.map(pokemon => {
        const typeDisplay = pokemon.types?.length > 0 ? pokemon.types.join('/') : '';
        const levelDisplay = pokemon.level ? `Lv.${pokemon.level}` : '';
        const separator = levelDisplay && typeDisplay ? ' • ' : '';
        
        // Template literal with HTML structure
        return `
            <div class="pokemon-item">
                <div class="pokemon-sprite">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" 
                         alt="${pokemon.name}" onerror="this.style.display='none'">
                </div>
                <div class="pokemon-info">
                    <div class="pokemon-name">${pokemon.name}</div>
                    <div class="pokemon-details">
                        ${levelDisplay}${separator}${typeDisplay}
                        <br>Caught on ${pokemon.site} • ${formatDate(pokemon.caughtAt)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update statistics display
function updateStats(collection) {
    const totalCaught = collection.length;
    const uniquePokemon = new Set(collection.map(p => p.id)).size;
    
    if (elements.total_caught) elements.total_caught.textContent = totalCaught.toString().padStart(3, '0');
    if (elements.unique_count) elements.unique_count.textContent = uniquePokemon.toString().padStart(3, '0');
}

/**
 * Handle online/offline status changes
 * Navigator.onLine: Browser API to detect internet connectivity
 */
function handleOnlineStatus() {
    const isOnline = navigator.onLine;
    console.log('Online status changed:', isOnline);
    
    if (isOnline && currentUser && supabase) {
        // When coming back online, sync from cloud
        updateSyncStatus('Reconnected - checking for updates...', 'syncing');
        setTimeout(() => syncFromCloud(), 1000);
    } else if (!isOnline) {
        updateSyncStatus('Offline mode', 'local');
    }
}

// Event listener for when DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    initElements(); // Cache DOM element references
    
    const supabaseInitialized = initSupabase(); // Initialize database connection
    
    if (supabaseInitialized) {
        // Set up authentication state change listener
        // onAuthStateChange: Supabase event listener for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session) {
                currentUser = session.user;
                showLoggedInState();
                await syncFromCloud();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                lastSyncHash = null;
                showLoggedOutState();
            }
        });
        
        // Click event listeners
        elements.login_btn?.addEventListener('click', openAuthPopup);
        elements.logout_btn?.addEventListener('click', handleLogout);
        
        await initAuth(); // Check initial auth state
    } else {
        showLoggedOutState(); // Fallback if Supabase fails to initialize
    }
    
    await loadCollection(); // Load and display current Pokemon collection
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
});

// Chrome extension storage change listener
// Fires when extension's local storage is modified
chrome.storage.onChanged.addListener((changes, namespace) => {
    // Only react to changes in 'local' storage namespace for pokemonCollection
    if (namespace === 'local' && changes.pokemonCollection) {
        loadCollection(); // Refresh display when collection changes
    }
});
