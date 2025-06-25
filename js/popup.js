// popup.js - Simplified version
import { generateCollectionHash } from './utils/hash-generator.js';
import { formatDate } from './utils/date-formatter.js';

const SUPABASE_URL = 'https://mzoxfiqdhbitwoyspnfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM';

let supabase;
let currentUser = null;
let lastSyncHash = null;
let syncTimeout = null;

// DOM elements - get them once during initialization
const elements = {};

function initElements() {
    const ids = ['auth-section', 'logged-out-state', 'logged-in-state', 'login-btn', 
                 'logout-btn', 'user-email', 'sync-status', 'pokemon-collection', 
                 'total-caught', 'unique-count'];
    
    ids.forEach(id => {
        elements[id.replace(/-/g, '_')] = document.getElementById(id);
    });
}

function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        updateSyncStatus('Cloud sync not configured', 'error');
        return false;
    }

    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabase && typeof supabase.from === 'function';
    }
    
    updateSyncStatus('Cloud sync library not loaded', 'error');
    return false;
}

async function initAuth() {
    if (!supabase) return;

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            showLoggedInState();
            await syncFromCloud();
            
            // Check for local Pokemon to sync after cloud sync
            const { pokemonCollection = [] } = await chrome.storage.local.get(['pokemonCollection']);
            if (pokemonCollection.length > 0) {
                setTimeout(() => syncToCloud(pokemonCollection, true), 2000);
            }
        } else {
            showLoggedOutState();
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
        updateSyncStatus('Auth system offline', 'error');
    }
}

function showLoggedOutState() {
    elements.logged_out_state?.classList.remove('hidden');
    elements.logged_in_state?.classList.add('hidden');
    updateSyncStatus('Local storage only', 'local');
}

function showLoggedInState() {
    elements.logged_out_state?.classList.add('hidden');
    elements.logged_in_state?.classList.remove('hidden');
    if (currentUser && elements.user_email) {
        elements.user_email.textContent = `Trainer: ${currentUser.email}`;
        updateSyncStatus('Cloud sync enabled', 'synced');
    }
}

function updateSyncStatus(message, type = 'local') {
    console.log(`Sync status: ${message} (${type})`);
    if (elements.sync_status) {
        elements.sync_status.textContent = message;
        elements.sync_status.className = `sync-status ${type}`;
    }
}

function openAuthPopup() {
    const popup = window.open(
        chrome.runtime.getURL('../html/auth.html'),
        'auth',
        'width=400,height=500,scrollbars=yes,resizable=yes'
    );
    
    const checkAuth = setInterval(async () => {
        if (popup.closed) {
            clearInterval(checkAuth);
            if (supabase) {
                try {
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
    }, 1000);
}

async function handleLogout() {
    try {
        if (elements.logout_btn) elements.logout_btn.disabled = true;
        updateSyncStatus('Signing out...', 'syncing');
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        lastSyncHash = null;
        
        await chrome.storage.local.set({ pokemonCollection: [] });
        showLoggedOutState();
        loadCollection();
        
    } catch (error) {
        console.error('Logout error:', error);
        updateSyncStatus('Error signing out', 'error');
    } finally {
        if (elements.logout_btn) elements.logout_btn.disabled = false;
    }
}

function debouncedSync(collection) {
    if (!canSync()) return;
    
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => syncToCloud(collection), 3000);
}

function canSync() {
    return currentUser && navigator.onLine && supabase;
}

async function syncToCloud(collection, force = false) {
    if (!canSync() || (!collection.length && !force)) return;
    
    const currentHash = generateCollectionHash(collection);
    if (!force && lastSyncHash === currentHash) {
        console.log('Collection unchanged, skipping sync');
        return;
    }
    
    try {
        updateSyncStatus('Syncing to cloud...', 'syncing');
        
        // Get existing cloud Pokemon
        const { data: existingPokemon, error: fetchError } = await supabase
            .from('pokemon')
            .select('pokemon_id, site_caught, caught_at')
            .eq('user_id', currentUser.id);
        
        if (fetchError) throw fetchError;
        
        // Create set of existing Pokemon keys
        const existingKeys = new Set(
            (existingPokemon || []).map(p => 
                `${p.pokemon_id}|${p.site_caught}|${new Date(p.caught_at).getTime()}`
            )
        );
        
        // Filter new Pokemon
        const newPokemon = collection.filter(pokemon => {
            const key = `${pokemon.id}|${pokemon.site}|${new Date(pokemon.caughtAt).getTime()}`;
            return !existingKeys.has(key);
        });
        
        if (newPokemon.length > 0) {
            // Insert in batches
            const batchSize = 10;
            let totalInserted = 0;
            
            for (let i = 0; i < newPokemon.length; i += batchSize) {
                const batch = newPokemon.slice(i, i + batchSize);
                
                const pokemonToInsert = batch.map(pokemon => ({
                    user_id: currentUser.id,
                    pokemon_id: pokemon.id,
                    name: pokemon.name,
                    species: pokemon.species || pokemon.name,
                    level: pokemon.level || null,
                    type1: pokemon.types?.[0] || 'normal',
                    type2: pokemon.types?.[1] || null,
                    site_caught: pokemon.site,
                    caught_at: pokemon.caughtAt
                }));
                
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
        
        lastSyncHash = currentHash;
        
    } catch (error) {
        console.error('Sync to cloud error:', error);
        updateSyncStatus(`Sync failed: ${error.message}`, 'error');
    }
}

async function syncFromCloud() {
    if (!canSync()) return;
    
    try {
        updateSyncStatus('Syncing from cloud...', 'syncing');
        
        const { data: cloudPokemon, error } = await supabase
            .from('pokemon')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('caught_at', { ascending: false });
        
        if (error) throw error;
        
        const { pokemonCollection: localCollection = [] } = await chrome.storage.local.get(['pokemonCollection']);
        
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
        
        const mergedCollection = mergeCollections(localCollection, cloudCollection);
        
        // Only update if collections are different
        const localHash = generateCollectionHash(localCollection);
        const mergedHash = generateCollectionHash(mergedCollection);
        
        if (localHash !== mergedHash) {
            await chrome.storage.local.set({ pokemonCollection: mergedCollection });
            loadCollection();
            
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

function mergeCollections(collection1, collection2) {
    const merged = [...collection1];
    const existingKeys = new Set(
        collection1.map(p => 
            `${p.id}|${p.site}|${new Date(p.caughtAt).getTime()}`
        )
    );
    
    for (const pokemon of collection2) {
        const key = `${pokemon.id}|${pokemon.site}|${new Date(pokemon.caughtAt).getTime()}`;
        if (!existingKeys.has(key)) {
            merged.push(pokemon);
            existingKeys.add(key);
        }
    }
    
    return merged.sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt));
}

async function loadCollection() {
    try {
        const { pokemonCollection: collection = [] } = await chrome.storage.local.get(['pokemonCollection']);
        
        displayCollection(collection);
        updateStats(collection);
        
        if (currentUser && navigator.onLine && supabase && collection.length > 0) {
            setTimeout(() => debouncedSync(collection), 1000);
        }
    } catch (error) {
        console.error('Error loading collection:', error);
    }
}

function displayCollection(collection) {
    if (!elements.pokemon_collection) return;
    
    if (collection.length === 0) {
        elements.pokemon_collection.innerHTML = `
            <div class="empty-state">
                <h3>POKEDEX EMPTY</h3>
                <p>Scan web pages to detect wild Pokémon and begin data collection...</p>
            </div>
        `;
        return;
    }
    
    const sortedCollection = collection.sort((a, b) => 
        new Date(b.caughtAt) - new Date(a.caughtAt)
    );
    
    elements.pokemon_collection.innerHTML = sortedCollection.map(pokemon => {
        const typeDisplay = pokemon.types?.length > 0 ? pokemon.types.join('/') : '';
        const levelDisplay = pokemon.level ? `Lv.${pokemon.level}` : '';
        const separator = levelDisplay && typeDisplay ? ' • ' : '';
        
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

function updateStats(collection) {
    const totalCaught = collection.length;
    const uniquePokemon = new Set(collection.map(p => p.id)).size;
    
    if (elements.total_caught) elements.total_caught.textContent = totalCaught.toString().padStart(3, '0');
    if (elements.unique_count) elements.unique_count.textContent = uniquePokemon.toString().padStart(3, '0');
}



function handleOnlineStatus() {
    const isOnline = navigator.onLine;
    console.log('Online status changed:', isOnline);
    
    if (isOnline && currentUser && supabase) {
        updateSyncStatus('Reconnected - checking for updates...', 'syncing');
        setTimeout(() => syncFromCloud(), 1000);
    } else if (!isOnline) {
        updateSyncStatus('Offline mode', 'local');
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    
    const supabaseInitialized = initSupabase();
    
    if (supabaseInitialized) {
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
        
        elements.login_btn?.addEventListener('click', openAuthPopup);
        elements.logout_btn?.addEventListener('click', handleLogout);
        
        await initAuth();
    } else {
        showLoggedOutState();
    }
    
    await loadCollection();
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.pokemonCollection) {
        loadCollection();
    }
});
