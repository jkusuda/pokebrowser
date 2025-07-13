import { AuthDebugger } from '../utils/AuthDebugger.js';

// Handles Pokemon candy data - reading only (background script handles modifications)
export class CandyService {
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

    // Get all candy counts for user from database
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

    // Get candy count for specific Pokemon from local state
    getCandyCount(pokemonId) {
        const count = this.state.getCandyCount(pokemonId);
        console.log(`🍬 Candy count for Pokemon ${pokemonId}: ${count}`);
        return count;
    }

    // Reload candy data from database
    async refreshCandyData() {
        console.log('🔄 Refreshing candy data from database');
        return await this.getCandyForUser();
    }
}
