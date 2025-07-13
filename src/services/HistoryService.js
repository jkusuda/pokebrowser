import { AuthDebugger } from '../utils/AuthDebugger.js';
import { StorageService } from './StorageService.js';

// Tracks Pokemon ownership history - which Pokemon user has ever caught
export class HistoryService {
    constructor(appState) {
        this.state = appState;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Wait for user authentication with timeout
    async waitForAuthentication(maxWaitTime = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            if (this.state.canSync()) {
                console.log('✅ Authentication ready for history operations');
                return true;
            }
            
            // Check what's missing for better debugging
            const issues = [];
            if (!this.state.currentUser) issues.push('user not logged in');
            if (!this.state.supabase) issues.push('supabase not initialized');
            if (!navigator.onLine) issues.push('browser offline');
            
            console.log(`⏳ Waiting for authentication... Issues: ${issues.join(', ')}`);
            
            // Wait 500ms before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('⏰ Authentication wait timeout reached');
        return false;
    }

    // Get all Pokemon IDs that user has ever caught
    async getHistoryForUser() {
        // Debug authentication state before attempting history fetch
        AuthDebugger.logAuthState('HistoryService.getHistoryForUser - Start', this.state);
        
        // First, try to wait for authentication if not immediately available
        if (!this.state.canSync()) {
            console.log('🔄 Authentication not ready, waiting...');
            const authReady = await AuthDebugger.waitForAuthWithLogging(
                this.state, 
                5000, 
                'HistoryService.getHistoryForUser'
            );
            
            if (!authReady) {
                console.log('❌ Cannot sync history data - authentication timeout, using local data');
                AuthDebugger.logAuthState('HistoryService.getHistoryForUser - Timeout', this.state);
                return await this.getLocalHistory();
            }
        }

        try {
            console.log('📚 Fetching Pokemon history for user:', this.state.currentUser.email);

            const { data: historyData, error } = await this.state.supabase
                .from('pokemon_history')
                .select('pokemon_id')
                .eq('user_id', this.state.currentUser.id);

            if (error) {
                console.error('❌ Error fetching history data:', error);
                console.log('📱 Falling back to local history data');
                return await this.getLocalHistory();
            }

            const historySet = new Set();
            if (historyData && historyData.length > 0) {
                historyData.forEach(entry => {
                    historySet.add(entry.pokemon_id);
                });
                console.log(`✅ Loaded history data for ${historyData.length} Pokemon from Supabase`);
                
                // Update local storage with server data
                await StorageService.setPokemonHistory(Array.from(historySet));
            } else {
                console.log('📭 No history data found for user in Supabase');
            }

            return historySet;
        } catch (error) {
            console.error('❌ Error fetching history data:', error);
            console.log('📱 Falling back to local history data');
            return await this.getLocalHistory();
        }
    }

    // Check if user has ever caught this Pokemon
    async hasEverCaught(pokemonId) {
        try {
            const historySet = await this.getHistoryForUser();
            return historySet.has(pokemonId);
        } catch (error) {
            console.error('❌ Error checking if Pokemon was ever caught:', error);
            return false;
        }
    }

    // Get when Pokemon was first caught by user
    async getFirstCaughtData(pokemonId) {
        // Quick check - if not authenticated, return null immediately
        if (!this.state.isLoggedIn() || !this.state.supabase) {
            console.log('❌ Not authenticated, cannot fetch first caught data');
            return null;
        }

        try {
            console.log(`📚 Fetching first caught data for Pokemon ${pokemonId}`);
            console.log(`🔍 Query params: user_id=${this.state.currentUser.id}, pokemon_id=${pokemonId}`);

            const { data, error } = await this.state.supabase
                .from('pokemon_history')
                .select('*')
                .eq('user_id', this.state.currentUser.id)
                .eq('pokemon_id', pokemonId)
                .order('first_caught_at', { ascending: true })
                .limit(1)
                .single();

            console.log(`🔍 Raw query result - data:`, data, `error:`, error);

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log(`📭 No history found for Pokemon ${pokemonId}`);
                    return null;
                }
                console.error('❌ Database error:', error);
                return null;
            }

            // Check if data is null (no records found)
            if (!data) {
                console.log(`📭 No history record found for Pokemon ${pokemonId}`);
                return null;
            }

            console.log(`✅ Found history for Pokemon ${pokemonId}:`, data);
            console.log(`📅 First caught date field:`, data.first_caught_at);
            console.log(`📅 Date type:`, typeof data.first_caught_at);
            return data;
        } catch (error) {
            console.error('❌ Error fetching first caught data:', error);
            return null;
        }
    }

    // Add Pokemon to user's ownership history
    async addToHistory(pokemonId) {
        try {
            console.log(`📚 Adding Pokemon ${pokemonId} to history`);

            // Always add to local storage first
            await StorageService.addToHistory(pokemonId);
            console.log(`✅ Added Pokemon ${pokemonId} to local history`);

            // Try to sync to Supabase if authenticated
            if (this.state.canSync()) {
                try {
                    const { error } = await this.state.supabase
                        .from('pokemon_history')
                        .upsert({
                            user_id: this.state.currentUser.id,
                            pokemon_id: pokemonId
                        }, {
                            onConflict: 'user_id,pokemon_id'
                        });

                    if (error) {
                        console.error(`❌ Error syncing Pokemon ${pokemonId} to Supabase:`, error);
                        // Don't fail the operation, local storage succeeded
                    } else {
                        console.log(`✅ Synced Pokemon ${pokemonId} to Supabase history`);
                    }
                } catch (syncError) {
                    console.error(`❌ Error syncing Pokemon ${pokemonId} to Supabase:`, syncError);
                    // Don't fail the operation, local storage succeeded
                }
            } else {
                console.log(`📱 Not authenticated, Pokemon ${pokemonId} saved locally only`);
            }

            return true;
        } catch (error) {
            console.error(`❌ Error adding Pokemon ${pokemonId} to history:`, error);
            return false;
        }
    }

    // Upload local history to cloud when user logs in
    async syncLocalHistory() {
        if (!this.state.canSync()) {
            console.log('❌ Cannot sync history - not authenticated');
            return false;
        }

        try {
            console.log('🔄 Syncing local Pokemon history to Supabase...');
            
            const localHistory = await StorageService.getPokemonHistory();
            if (localHistory.length === 0) {
                console.log('📭 No local history to sync');
                return true;
            }

            // First, check which Pokemon are already in the cloud to avoid duplicates
            const { data: existingHistory, error: fetchError } = await this.state.supabase
                .from('pokemon_history')
                .select('pokemon_id')
                .eq('user_id', this.state.currentUser.id);

            if (fetchError) {
                console.error('❌ Error fetching existing history:', fetchError);
                return false;
            }

            const existingPokemonIds = new Set(existingHistory?.map(h => h.pokemon_id) || []);
            const newPokemonIds = localHistory.filter(id => !existingPokemonIds.has(id));

            if (newPokemonIds.length === 0) {
                console.log('✅ All local history already exists in Supabase, clearing local storage');
                await StorageService.setPokemonHistory([]);
                return true;
            }

            // Prepare batch insert data for only new Pokemon
            const historyRecords = newPokemonIds.map(pokemonId => ({
                user_id: this.state.currentUser.id,
                pokemon_id: pokemonId
            }));

            const { error } = await this.state.supabase
                .from('pokemon_history')
                .insert(historyRecords);

            if (error) {
                console.error('❌ Error syncing local history to Supabase:', error);
                return false;
            }

            console.log(`✅ Successfully synced ${newPokemonIds.length} new Pokemon to Supabase history`);
            
            // Clear local history after successful sync
            await StorageService.setPokemonHistory([]);
            console.log('✅ Cleared local history after successful sync');
            
            return true;
        } catch (error) {
            console.error('❌ Error syncing local history:', error);
            return false;
        }
    }

    // Get Pokemon history from local storage only
    async getLocalHistory() {
        try {
            const localHistory = await StorageService.getPokemonHistory();
            return new Set(localHistory);
        } catch (error) {
            console.error('❌ Error getting local history:', error);
            return new Set();
        }
    }

    // Count how many unique Pokemon user has ever caught
    async getHistoryCount() {
        try {
            const history = await this.getHistoryForUser();
            return history.size;
        } catch (error) {
            console.error('❌ Error getting history count:', error);
            return 0;
        }
    }

    // Check if Pokemon exists in user's history (duplicate method)
    async hasEverCaught(pokemonId) {
        try {
            const history = await this.getHistoryForUser();
            return history.has(pokemonId);
        } catch (error) {
            console.error(`❌ Error checking if Pokemon ${pokemonId} was ever caught:`, error);
            return false;
        }
    }
}
