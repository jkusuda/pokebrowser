// Configure your Supabase credentials here
const SUPABASE_URL = 'https://mzoxfiqdhbitwoyspnfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM'; // You need to add your actual key here

// Initialize Supabase client (will be set after DOM loads)
let supabase;

// DOM elements
let authSection, loggedOutState, loggedInState, loginBtn, logoutBtn;
let userEmailDiv, syncStatusDiv;

// State
let currentUser = null;
let isOnline = navigator.onLine;
let isSyncing = false;
let lastSyncHash = null;
let syncTimeout = null;

// Initialize DOM elements
function initElements() {
    authSection = document.getElementById('auth-section');
    loggedOutState = document.getElementById('logged-out-state');
    loggedInState = document.getElementById('logged-in-state');
    loginBtn = document.getElementById('login-btn');
    logoutBtn = document.getElementById('logout-btn');
    userEmailDiv = document.getElementById('user-email');
    syncStatusDiv = document.getElementById('sync-status');
}

// Generate hash of collection for change detection
function generateCollectionHash(collection) {
    if (!collection || collection.length === 0) return 'empty';
    
    const sortedCollection = collection
        .map(p => `${p.id}-${p.site}-${new Date(p.caughtAt).getTime()}`)
        .sort()
        .join('|');
    
    // Use a simple hash function instead of btoa for better compatibility
    let hash = 0;
    for (let i = 0; i < sortedCollection.length; i++) {
        const char = sortedCollection.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
}

// Initialize Supabase client
function initSupabase() {
    try {
        // Check if we have the required credentials
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === '' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
            console.error('Supabase credentials not configured properly');
            updateSyncStatus('Cloud sync not configured', 'error');
            return false;
        }

        // For Chrome extensions, we need to load Supabase differently
        // Make sure you've included the Supabase client in your manifest.json
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            console.error('Supabase library not loaded');
            updateSyncStatus('Cloud sync library not loaded', 'error');
            return false;
        }
        
        // Test the client
        if (!supabase || typeof supabase.from !== 'function') {
            console.error('Failed to create Supabase client');
            updateSyncStatus('Cloud sync unavailable', 'error');
            return false;
        }

        console.log('Supabase client initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        updateSyncStatus('Cloud sync unavailable', 'error');
        return false;
    }
}

// Initialize the authentication system
async function initAuth() {
    try {
        if (!supabase) {
            console.log('Supabase not initialized');
            updateSyncStatus('Cloud sync unavailable', 'error');
            return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error);
            updateSyncStatus('Error checking auth', 'error');
        } else if (session) {
            currentUser = session.user;
            showLoggedInState();
            
            // FIXED: First sync from cloud, then check if we need to sync to cloud
            await syncCollectionFromCloud();
            
            // After syncing from cloud, check if we have local Pokemon to sync up
            const result = await chrome.storage.local.get(['pokemonCollection']);
            const localCollection = result.pokemonCollection || [];
            if (localCollection.length > 0) {
                console.log('Found local Pokemon after cloud sync, checking if upload needed');
                setTimeout(() => {
                    syncCollectionToCloud(localCollection, true); // Force sync check
                }, 2000);
            }
        } else {
            showLoggedOutState();
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
        updateSyncStatus('Auth system offline', 'error');
    }
}

// Show logged out state
function showLoggedOutState() {
    if (loggedOutState) loggedOutState.classList.remove('hidden');
    if (loggedInState) loggedInState.classList.add('hidden');
    updateSyncStatus('Local storage only', 'local');
}

// Show logged in state
function showLoggedInState() {
    if (loggedOutState) loggedOutState.classList.add('hidden');
    if (loggedInState) loggedInState.classList.remove('hidden');
    if (currentUser && userEmailDiv) {
        userEmailDiv.textContent = `Trainer: ${currentUser.email}`;
        updateSyncStatus('Cloud sync enabled', 'synced');
    }
}

// Update sync status display
function updateSyncStatus(message, type = 'local') {
    console.log(`Sync status: ${message} (${type})`);
    if (syncStatusDiv) {
        syncStatusDiv.textContent = message;
        syncStatusDiv.className = `sync-status ${type}`;
    }
}

// Open authentication popup
function openAuthPopup() {
    const popup = window.open(
        chrome.runtime.getURL('auth.html'),
        'auth',
        'width=400,height=500,scrollbars=yes,resizable=yes'
    );
    
    // Listen for auth completion
    const checkAuth = setInterval(async () => {
        if (popup.closed) {
            clearInterval(checkAuth);
            // Check if user is now authenticated
            if (supabase && typeof supabase.auth.getSession === 'function') {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        currentUser = session.user;
                        showLoggedInState();
                        await syncCollectionFromCloud();
                    }
                } catch (error) {
                    console.error('Error checking session after popup:', error);
                }
            }
        }
    }, 1000);
}

// Handle logout
async function handleLogout() {
    try {
        if (logoutBtn) logoutBtn.disabled = true;
        updateSyncStatus('Signing out...', 'syncing');
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        // Clear current user and sync state
        currentUser = null;
        lastSyncHash = null;
        
        // Clear local Pokemon collection on logout
        await chrome.storage.local.set({ pokemonCollection: [] });
        console.log('Local collection cleared on logout');
        
        // Update UI
        showLoggedOutState();
        loadCollection(); // This will refresh the display to show empty state
        
    } catch (error) {
        console.error('Logout error:', error);
        updateSyncStatus('Error signing out', 'error');
    } finally {
        if (logoutBtn) logoutBtn.disabled = false;
    }
}

// Debounced sync function
function debouncedSync(collection) {
    if (!currentUser || !isOnline || isSyncing || !supabase) {
        console.log('Skipping sync - not ready:', { currentUser: !!currentUser, isOnline, isSyncing, supabase: !!supabase });
        return;
    }
    
    // Clear existing timeout
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    
    // Set new timeout
    syncTimeout = setTimeout(async () => {
        await syncCollectionToCloud(collection);
    }, 3000); // Increased to 3 seconds to reduce API calls
}

// Sync collection to cloud
async function syncCollectionToCloud(collection, force = false) {
    if (!currentUser || !isOnline || isSyncing || !supabase) {
        console.log('Cannot sync to cloud - not ready:', {
            currentUser: !!currentUser,
            isOnline,
            isSyncing,
            supabase: !!supabase
        });
        return;
    }
    
    if (collection.length === 0 && !force) {
        console.log('No Pokemon to sync');
        return;
    }
    
    // Check if collection has actually changed
    const currentHash = generateCollectionHash(collection);
    if (!force && lastSyncHash === currentHash) {
        console.log('Collection unchanged, skipping sync. Hash:', currentHash);
        return;
    }
    
    console.log('Collection changed or forced sync. Current hash:', currentHash, 'Last hash:', lastSyncHash);
    
    isSyncing = true;
    console.log('Starting sync to cloud...');
    
    try {
        updateSyncStatus('Syncing to cloud...', 'syncing');
        
        // Get existing cloud Pokemon
        const { data: existingPokemon, error: fetchError } = await supabase
            .from('pokemon')
            .select('pokemon_id, site_caught, caught_at')
            .eq('user_id', currentUser.id);
        
        if (fetchError) {
            console.error('Error fetching existing Pokemon:', fetchError);
            throw fetchError;
        }
        
        console.log(`Found ${existingPokemon?.length || 0} existing Pokemon in cloud`);
        
        // Create set of existing Pokemon keys
        const existingKeys = new Set(
            (existingPokemon || []).map(p => {
                const timestamp = new Date(p.caught_at).getTime();
                return `${p.pokemon_id}|${p.site_caught}|${timestamp}`;
            })
        );
        
        // Filter out Pokemon that already exist in cloud
        const newPokemon = collection.filter(pokemon => {
            const timestamp = new Date(pokemon.caughtAt).getTime();
            const key = `${pokemon.id}|${pokemon.site}|${timestamp}`;
            const exists = existingKeys.has(key);
            if (exists) {
                console.log(`Pokemon already exists in cloud: ${pokemon.name} (${key})`);
            }
            return !exists;
        });
        
        console.log(`Found ${newPokemon.length} new Pokemon to sync`);
        
        if (newPokemon.length > 0) {
            // Insert new Pokemon in batches
            const batchSize = 10;
            let totalInserted = 0;
            
            for (let i = 0; i < newPokemon.length; i += batchSize) {
                const batch = newPokemon.slice(i, i + batchSize);
                console.log(`Syncing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newPokemon.length/batchSize)}`);
                
                const pokemonToInsert = batch.map(pokemon => ({
                    user_id: currentUser.id,
                    pokemon_id: pokemon.id,
                    name: pokemon.name,
                    species: pokemon.species || pokemon.name,
                    level: pokemon.level || null,
                    type1: pokemon.types && pokemon.types[0] ? pokemon.types[0] : 'normal',
                    type2: pokemon.types && pokemon.types[1] ? pokemon.types[1] : null,
                    site_caught: pokemon.site,
                    caught_at: pokemon.caughtAt
                }));
                
                const { error: insertError } = await supabase
                    .from('pokemon')
                    .insert(pokemonToInsert);
                
                if (insertError) {
                    console.error('Error inserting Pokemon batch:', insertError);
                    throw insertError;
                }
                
                totalInserted += batch.length;
            }
            
            updateSyncStatus(`Synced ${totalInserted} new Pokémon`, 'synced');
            lastSyncHash = currentHash;
            console.log(`Successfully synced ${totalInserted} Pokemon`);
        } else {
            updateSyncStatus('All Pokémon already synced', 'synced');
            lastSyncHash = currentHash;
            console.log('All Pokemon already synced');
        }
        
    } catch (error) {
        console.error('Sync to cloud error:', error);
        updateSyncStatus(`Sync failed: ${error.message}`, 'error');
    } finally {
        isSyncing = false;
    }
}

// Sync collection from cloud
async function syncCollectionFromCloud() {
    if (!currentUser || !isOnline || isSyncing || !supabase) {
        console.log('Cannot sync from cloud - not ready');
        return;
    }
    
    isSyncing = true;
    console.log('Starting sync from cloud...');
    
    try {
        updateSyncStatus('Syncing from cloud...', 'syncing');
        
        const { data: cloudPokemon, error } = await supabase
            .from('pokemon')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('caught_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching from cloud:', error);
            throw error;
        }
        
        console.log(`Found ${cloudPokemon?.length || 0} Pokemon in cloud`);
        
        // Get local collection
        const result = await chrome.storage.local.get(['pokemonCollection']);
        const localCollection = result.pokemonCollection || [];
        
        console.log(`Found ${localCollection.length} Pokemon locally`);
        
        // Convert cloud data to local format
        const cloudCollection = (cloudPokemon || []).map(p => ({
            id: p.pokemon_id,
            name: p.name,
            species: p.species,
            level: p.level,
            types: [p.type1, p.type2].filter(Boolean),
            site: p.site_caught,
            caughtAt: p.caught_at
        }));
        
        // Merge collections
        const mergedCollection = mergeCollections(localCollection, cloudCollection);
        
        console.log(`Merged collection has ${mergedCollection.length} Pokemon`);
        
        // Only update storage if there are actual changes
        const localHash = generateCollectionHash(localCollection);
        const mergedHash = generateCollectionHash(mergedCollection);
        
        if (localHash !== mergedHash) {
            console.log('Collections different, updating local storage');
            await chrome.storage.local.set({ pokemonCollection: mergedCollection });
            
            // Refresh display
            loadCollection();
            
            const newCount = mergedCollection.length - localCollection.length;
            updateSyncStatus(`Synced from cloud (${newCount} new)`, 'synced');
        } else {
            console.log('Collections identical, no update needed');
            updateSyncStatus('Already up to date', 'synced');
        }
        
        // FIXED: Don't set lastSyncHash here - let the upload sync handle it
        // This was preventing upload sync from detecting changes
        
    } catch (error) {
        console.error('Sync from cloud error:', error);
        updateSyncStatus(`Sync failed: ${error.message}`, 'error');
    } finally {
        isSyncing = false;
    }
}

// Merge two collections, avoiding duplicates
function mergeCollections(collection1, collection2) {
    const merged = [...collection1];
    const existingKeys = new Set(
        collection1.map(p => {
            const timestamp = new Date(p.caughtAt).getTime();
            return `${p.id}|${p.site}|${timestamp}`;
        })
    );
    
    let addedCount = 0;
    for (const pokemon of collection2) {
        const timestamp = new Date(pokemon.caughtAt).getTime();
        const key = `${pokemon.id}|${pokemon.site}|${timestamp}`;
        if (!existingKeys.has(key)) {
            merged.push(pokemon);
            existingKeys.add(key);
            addedCount++;
        }
    }
    
    console.log(`Merged ${addedCount} new Pokemon from cloud`);
    return merged.sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt));
}

// Load and display Pokemon collection
async function loadCollection() {
    try {
        const result = await chrome.storage.local.get(['pokemonCollection']);
        const collection = result.pokemonCollection || [];
        
        console.log(`Loading collection with ${collection.length} Pokemon`);
        
        displayCollection(collection);
        updateStats(collection);
        
        // FIXED: Only trigger sync if we have Pokemon and user is logged in
        // Don't check lastSyncHash here as it prevents initial sync
        if (currentUser && isOnline && supabase && collection.length > 0) {
            console.log('Collection has Pokemon and user logged in, triggering sync check');
            // Use a small delay to ensure auth is fully ready
            setTimeout(() => {
                debouncedSync(collection);
            }, 1000);
        }
    } catch (error) {
        console.error('Error loading collection:', error);
    }
}

// Display Pokemon collection in the popup
function displayCollection(collection) {
    const container = document.getElementById('pokemon-collection');
    if (!container) return;
    
    if (collection.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>POKEDEX EMPTY</h3>
                <p>Scan web pages to detect wild Pokémon and begin data collection...</p>
            </div>
        `;
        return;
    }
    
    // Sort by catch time (newest first)
    const sortedCollection = collection.sort((a, b) => 
        new Date(b.caughtAt) - new Date(a.caughtAt)
    );
    
    container.innerHTML = sortedCollection.map(pokemon => {
        const typeDisplay = pokemon.types && pokemon.types.length > 0 
            ? pokemon.types.join('/') 
            : '';
        const levelDisplay = pokemon.level ? `Lv.${pokemon.level}` : '';
        
        return `
            <div class="pokemon-item">
                <div class="pokemon-sprite">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" 
                         alt="${pokemon.name}" onerror="this.style.display='none'">
                </div>
                <div class="pokemon-info">
                    <div class="pokemon-name">${pokemon.name}</div>
                    <div class="pokemon-details">
                        ${levelDisplay} ${typeDisplay && levelDisplay ? '•' : ''} ${typeDisplay}
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
    
    const totalElement = document.getElementById('total-caught');
    const uniqueElement = document.getElementById('unique-count');
    
    if (totalElement) totalElement.textContent = totalCaught.toString().padStart(3, '0');
    if (uniqueElement) uniqueElement.textContent = uniquePokemon.toString().padStart(3, '0');
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

// Clear collection with confirmation
// Clear collection with confirmation - clears both local and cloud data
async function clearCollection() {
    const confirmMessage = currentUser ? 
        'Are you sure you want to clear your entire Pokémon collection? This will also clear your cloud data and cannot be undone.' :
        'Are you sure you want to clear your entire Pokémon collection? This cannot be undone.';
    
    if (confirm(confirmMessage)) {
        try {
            updateSyncStatus('Clearing data...', 'syncing');
            
            // Clear local storage first
            await chrome.storage.local.set({ pokemonCollection: [] });
            console.log('Local collection cleared');
            
            // Clear cloud storage if user is logged in
            if (currentUser && isOnline && supabase) {
                console.log('Clearing cloud data for user:', currentUser.id);
                
                // ✅ Correct order: filters first, then delete()
                const { data: deletedRows, error } = await supabase
                    .from('pokemon')
                    .eq('user_id', currentUser.id)
                    .delete();
                
                if (error) {
                    console.error('Error clearing cloud data:', error);
                    throw error;
                }
                
                console.log(`Cleared ${deletedRows?.length || 0} Pokemon from cloud`);
                updateSyncStatus(`Cleared all data (${deletedRows?.length || 0} from cloud)`, 'synced');
            } else {
                updateSyncStatus('Local data cleared', 'local');
            }
            
            // Reset sync state
            lastSyncHash = null;
            
            // Refresh the display
            loadCollection();
            
        } catch (error) {
            console.error('Error clearing collection:', error);
            updateSyncStatus(`Error clearing data: ${error.message}`, 'error');
            
            // Show user-friendly error message
            alert(`Error clearing data: ${error.message}\n\nPlease try again or check your connection.`);
        }
    }
}

// Handle online/offline status
function handleOnlineStatus() {
    isOnline = navigator.onLine;
    console.log('Online status changed:', isOnline);
    
    if (isOnline && currentUser && supabase && !isSyncing) {
        updateSyncStatus('Reconnected - checking for updates...', 'syncing');
        setTimeout(async () => {
            await syncCollectionFromCloud();
        }, 1000);
    } else if (!isOnline) {
        updateSyncStatus('Offline mode', 'local');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing...');
    
    // Initialize DOM elements first
    initElements();
    
    // Initialize Supabase client
    const supabaseInitialized = initSupabase();
    
    if (supabaseInitialized) {
        // Set up auth state listener
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session) {
                currentUser = session.user;
                showLoggedInState();
                await syncCollectionFromCloud();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                lastSyncHash = null;
                showLoggedOutState();
            }
        });
        
        // Set up event listeners
        if (loginBtn) loginBtn.addEventListener('click', openAuthPopup);
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        
        // Initialize auth
        await initAuth();
    } else {
        showLoggedOutState();
    }
    
    // Load collection regardless of Supabase status
    await loadCollection();
    
    // Set up other event listeners
    const clearBtn = document.getElementById('clear-collection');
    if (clearBtn) clearBtn.addEventListener('click', clearCollection);
    
    // Handle online/offline events
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    console.log('Initialization complete');
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.pokemonCollection) {
        console.log('Pokemon collection changed in storage');
        loadCollection();
    }
});
