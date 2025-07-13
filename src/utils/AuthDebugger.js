/**
 * Utility for debugging authentication issues
 */
export class AuthDebugger {
    /**
     * Logs detailed authentication state across all components
     * @param {string} context - Where this debug is being called from
     * @param {AppState} appState - The app state to debug
     */
    static logAuthState(context, appState) {
        console.group(`🔍 Auth Debug - ${context}`);
        
        const status = appState.getAuthStatus();
        console.log('📊 Auth Status:', status);
        
        // Check Supabase client state
        if (appState.supabase) {
            console.log('✅ Supabase client exists');
            console.log('🔗 Supabase URL:', appState.supabase.supabaseUrl);
        } else {
            console.log('❌ Supabase client missing');
        }
        
        // Check user state
        if (appState.currentUser) {
            console.log('✅ User logged in:', {
                id: appState.currentUser.id,
                email: appState.currentUser.email,
                created_at: appState.currentUser.created_at
            });
        } else {
            console.log('❌ No user logged in');
        }
        
        // Check network state
        console.log('🌐 Network status:', navigator.onLine ? 'Online' : 'Offline');
        
        // Check initialization state
        console.log('🚀 App initialized:', appState.isInitialized);
        
        console.groupEnd();
        
        return status;
    }
    
    /**
     * Waits for authentication with detailed logging
     * @param {AppState} appState - The app state to monitor
     * @param {number} maxWaitTime - Maximum time to wait
     * @param {string} context - Context for logging
     */
    static async waitForAuthWithLogging(appState, maxWaitTime = 5000, context = 'Unknown') {
        console.log(`⏳ ${context}: Waiting for authentication...`);
        
        const startTime = Date.now();
        let attempts = 0;
        
        while (Date.now() - startTime < maxWaitTime) {
            attempts++;
            const status = this.logAuthState(`${context} - Attempt ${attempts}`, appState);
            
            if (status.canSync) {
                console.log(`✅ ${context}: Authentication ready after ${attempts} attempts`);
                return true;
            }
            
            // Wait 500ms before next check
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`⏰ ${context}: Authentication timeout after ${attempts} attempts`);
        return false;
    }
    
    /**
     * Tests candy service authentication
     * @param {CandyService} candyService - The candy service to test
     * @param {string} context - Context for logging
     */
    static async testCandyServiceAuth(candyService, context = 'Unknown') {
        console.group(`🍬 Candy Service Auth Test - ${context}`);
        
        try {
            // Log the app state
            this.logAuthState(`${context} - Before Candy Call`, candyService.state);
            
            // Try to get candy data
            console.log('🔄 Attempting to fetch candy data...');
            const candyData = await candyService.getCandyForUser();
            
            console.log('✅ Candy data fetch successful:', {
                size: candyData.size,
                entries: Array.from(candyData.entries()).slice(0, 3) // Show first 3 entries
            });
            
        } catch (error) {
            console.error('❌ Candy data fetch failed:', error);
        }
        
        console.groupEnd();
    }
}
