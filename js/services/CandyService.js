import { AuthDebugger } from '../utils/AuthDebugger.js';

/**
 * Service for handling candy-related operations.
 * Note: Candy modifications (adding candy) are handled by the background script.
 * This service only handles reading candy data.
 */
export class CandyService {
    /**
     * @param {AppState} appState - The application state.
     */
    constructor(appState) {
        this.state = appState;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Waits for authentication to be ready with retry logic.
     * @param {number} maxWaitTime - Maximum time to wait in milliseconds.
     * @returns {Promise<boolean>} - True if authenticated, false if timeout.
     */
    async waitForAuthentication(maxWaitTime = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            if (this.state.canSync()) {
                console.log('✅ Authentication ready for candy operations');
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

    /**
     * Retrieves all candy data for the current user.
     * @returns {Promise<Map>} - A map of pokemon_id -> candy_count.
     */
    async getCandyForUser() {
        // Debug authentication state before attempting candy fetch
        AuthDebugger.logAuthState('CandyService.getCandyForUser - Start', this.state);
        
        // First, try to wait for authentication if not immediately available
        if (!this.state.canSync()) {
            console.log('🔄 Authentication not ready, waiting...');
            const authReady = await AuthDebugger.waitForAuthWithLogging(
                this.state, 
                5000, 
                'CandyService.getCandyForUser'
            );
            
            if (!authReady) {
                console.log('❌ Cannot sync candy data - authentication timeout');
                AuthDebugger.logAuthState('CandyService.getCandyForUser - Timeout', this.state);
                return new Map();
            }
        }

        try {
            console.log('🍬 Fetching candy data for user:', this.state.currentUser.email);

            const { data: candyData, error } = await this.state.supabase
                .from('candies')
                .select('pokemon_id, candy_count')
                .eq('user_id', this.state.currentUser.id);

            if (error) {
                console.error('❌ Error fetching candy data:', error);
                throw error;
            }

            const candyMap = new Map();
            if (candyData && candyData.length > 0) {
                candyData.forEach(candy => {
                    candyMap.set(candy.pokemon_id, candy.candy_count);
                });
                console.log(`✅ Loaded candy data for ${candyData.length} Pokemon`);
            } else {
                console.log('📭 No candy data found for user');
            }

            // Update local state
            this.state.setCandyData(candyMap);
            return candyMap;
        } catch (error) {
            console.error('❌ Error fetching candy data:', error);
            throw error;
        }
    }

    /**
     * Gets the candy count for a specific Pokémon from local state.
     * @param {number} pokemonId - The Pokémon ID.
     * @returns {number} - The candy count (0 if none).
     */
    getCandyCount(pokemonId) {
        const count = this.state.getCandyCount(pokemonId);
        console.log(`🍬 Candy count for Pokemon ${pokemonId}: ${count}`);
        return count;
    }

    /**
     * Refreshes candy data from the database.
     * @returns {Promise<Map>} - Updated candy map.
     */
    async refreshCandyData() {
        console.log('🔄 Refreshing candy data from database');
        return await this.getCandyForUser();
    }
}
