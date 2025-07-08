// background.js - Manages the service worker and persists authentication state.

// Configuration constants
const CONFIG = {
    SUPABASE_URL: 'https://mzoxfiqdhbitwoyspnfm.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM'
};

let currentUser = null;
let authToken = null;

// Initialize authentication state on startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('Extension startup - checking for existing session');
    await initializeAuthState();
});

chrome.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed - checking for existing session');
    await initializeAuthState();
});

// Initialize authentication state
async function initializeAuthState() {
    try {
        const result = await chrome.storage.local.get('auth_session');
        console.log('🔍 Background: Checking for stored auth session:', result);
        
        if (result.auth_session && result.auth_session.user) {
            currentUser = result.auth_session.user;
            authToken = result.auth_session.access_token;
            console.log('✅ Background: User session restored for:', currentUser.email);
        } else {
            console.log('📭 Background: No stored auth session found');
        }
    } catch (error) {
        console.error('❌ Background: Error initializing auth state:', error);
    }
}

// Simple history addition function
async function addToHistory(pokemonId) {
    if (!currentUser) {
        console.log('❌ User not authenticated, skipping history addition');
        return { success: false, error: 'User not authenticated' };
    }

    try {
        console.log(`📚 Adding Pokemon ${pokemonId} to history for user ${currentUser.email}`);

        // First, check if Pokemon is already in history to avoid duplicate key error
        console.log(`🔍 Checking if Pokemon ${pokemonId} already exists in history`);
        const checkResponse = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/pokemon_history?user_id=eq.${currentUser.id}&pokemon_id=eq.${pokemonId}`, {
            method: 'GET',
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${authToken || CONFIG.SUPABASE_ANON_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (checkResponse.ok) {
            const existingRecords = await checkResponse.json();
            if (existingRecords && existingRecords.length > 0) {
                console.log(`📋 Pokemon ${pokemonId} already exists in history, skipping database insert`);
                
                // Still ensure it's in local storage
                const { pokemonHistory = [] } = await chrome.storage.local.get(['pokemonHistory']);
                if (!pokemonHistory.includes(pokemonId)) {
                    pokemonHistory.push(pokemonId);
                    await chrome.storage.local.set({ pokemonHistory });
                    console.log(`✅ Added Pokemon ${pokemonId} to local history`);
                }
                
                return { success: true, alreadyExists: true };
            }
        }

        // Pokemon doesn't exist in history, safe to insert
        console.log(`🔗 Making request to: ${CONFIG.SUPABASE_URL}/rest/v1/pokemon_history`);
        console.log(`📝 Request body:`, { user_id: currentUser.id, pokemon_id: pokemonId });
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/pokemon_history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${authToken || CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                pokemon_id: pokemonId,
                first_caught_at: new Date().toISOString()
            })
        });

        console.log(`📊 Response status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            console.log(`✅ Added Pokemon ${pokemonId} to history`);
            
            // Also add to local storage
            const { pokemonHistory = [] } = await chrome.storage.local.get(['pokemonHistory']);
            if (!pokemonHistory.includes(pokemonId)) {
                pokemonHistory.push(pokemonId);
                await chrome.storage.local.set({ pokemonHistory });
                console.log(`✅ Added Pokemon ${pokemonId} to local history`);
            }
            
            return { success: true };
        } else {
            const errorText = await response.text();
            console.error(`❌ Failed to add to history (${response.status}): ${errorText}`);
            
            // Still try to add to local storage as fallback
            const { pokemonHistory = [] } = await chrome.storage.local.get(['pokemonHistory']);
            if (!pokemonHistory.includes(pokemonId)) {
                pokemonHistory.push(pokemonId);
                await chrome.storage.local.set({ pokemonHistory });
                console.log(`✅ Added Pokemon ${pokemonId} to local history (fallback)`);
            }
            
            return { success: true }; // Don't fail the operation for history issues
        }
    } catch (error) {
        console.error('❌ Error adding to history:', error);
        
        // Try to add to local storage as fallback
        try {
            const { pokemonHistory = [] } = await chrome.storage.local.get(['pokemonHistory']);
            if (!pokemonHistory.includes(pokemonId)) {
                pokemonHistory.push(pokemonId);
                await chrome.storage.local.set({ pokemonHistory });
                console.log(`✅ Added Pokemon ${pokemonId} to local history (fallback)`);
            }
        } catch (localError) {
            console.error('❌ Error adding to local history:', localError);
        }
        
        return { success: true }; // Don't fail the operation for history issues
    }
}

// Simple candy addition function
async function addCandy(pokemonId, amount) {
    if (!currentUser) {
        console.log('❌ User not authenticated, skipping candy addition');
        return { success: false, error: 'User not authenticated' };
    }

    try {
        console.log(`🍬 Adding ${amount} candies for Pokemon ${pokemonId} to user ${currentUser.email}`);

        // Step 1: Get current candy count
        const getCurrentResponse = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/candies?user_id=eq.${currentUser.id}&pokemon_id=eq.${pokemonId}`, {
            method: 'GET',
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${authToken || CONFIG.SUPABASE_ANON_KEY}`,
                'Accept': 'application/vnd.pgrst.object+json'
            }
        });

        let currentCount = 0;
        let recordExists = false;

        if (getCurrentResponse.ok) {
            const existingRecord = await getCurrentResponse.json();
            if (existingRecord && existingRecord.candy_count !== undefined) {
                currentCount = existingRecord.candy_count;
                recordExists = true;
                console.log(`📊 Current candy count: ${currentCount}`);
            }
        }

        const newCount = currentCount + amount;

        // Step 2: Update or Insert
        if (recordExists) {
            // Update existing record
            const updateResponse = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/candies?user_id=eq.${currentUser.id}&pokemon_id=eq.${pokemonId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${authToken || CONFIG.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    candy_count: newCount,
                    updated_at: new Date().toISOString()
                })
            });

            if (updateResponse.ok) {
                console.log(`✅ Updated candy count to ${newCount} for Pokemon ${pokemonId}`);
                return { success: true, newCount };
            } else {
                const errorText = await updateResponse.text();
                throw new Error(`Update failed: ${errorText}`);
            }
        } else {
            // Insert new record
            const insertResponse = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/candies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${authToken || CONFIG.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    pokemon_id: pokemonId,
                    candy_count: newCount,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });

            if (insertResponse.ok) {
                console.log(`✅ Inserted new candy record with count ${newCount} for Pokemon ${pokemonId}`);
                return { success: true, newCount };
            } else {
                const errorText = await insertResponse.text();
                throw new Error(`Insert failed: ${errorText}`);
            }
        }
    } catch (error) {
        console.error('❌ Error adding candy:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Listens for messages from popup or content scripts.
 */
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === 'AUTH_STATE_CHANGED') {
        console.log('🔐 Background: Received AUTH_STATE_CHANGED message');
        console.log('🔍 Background: Session data:', request.data.session);
        
        // Store or remove the authentication session from local storage.
        if (request.data.session) {
            await chrome.storage.local.set({ 'auth_session': request.data.session });
            currentUser = request.data.session.user;
            authToken = request.data.session.access_token;
            console.log('✅ Background: Auth state updated for user:', currentUser.email);
        } else {
            await chrome.storage.local.remove('auth_session');
            currentUser = null;
            authToken = null;
            console.log('🚪 Background: User logged out, auth state cleared');
        }
        sendResponse({ success: true });
        
    } else if (request.type === 'POKEMON_CAUGHT') {
        console.log('🎯 Background: Received POKEMON_CAUGHT message');
        console.log('🔍 Background: Current auth state - User:', currentUser ? currentUser.email : 'null', 'Token:', authToken ? 'present' : 'null');
        
        // Re-check auth state if not available
        if (!currentUser) {
            console.log('🔄 Background: Re-initializing auth state...');
            await initializeAuthState();
        }
        
        // Add to history first (this should always succeed)
        await addToHistory(request.data.pokemon.id);
        
        // Then add candy
        const result = await addCandy(request.data.pokemon.id, 3);
        sendResponse(result);
        
    } else if (request.type === 'POKEMON_RELEASED') {
        const result = await addCandy(request.data.pokemon.id, 1);
        sendResponse(result);
        
    } else {
        sendResponse({ success: false, error: 'Unknown message type' });
    }
    
    return true; // Keep the message channel open for async responses
});

// Initialize auth state when script loads
initializeAuthState();
