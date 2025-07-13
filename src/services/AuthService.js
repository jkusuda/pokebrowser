import { CONFIG } from '../shared/config.js';
import { supabase } from '../shared/supabase-client.js';

// Service for handling authentication.
export class AuthService {
    /**
     * @param {AppState} appState - The application state.
     */
    constructor(appState) {
        this.state = appState;
    }

    /**
     * Initializes the Supabase client.
     * @returns {Promise<SupabaseClient>}
     */
    async initializeSupabase() {
        if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
            throw new Error('Cloud sync not configured');
        }
        if (!supabase?.createClient) {
            throw new Error('Cloud sync library not loaded');
        }

        const client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        if (!client?.from) {
            throw new Error('Failed to initialize Supabase client');
        }

        this.state.setSupabase(client);
        return client;
    }

    /**
     * Initializes authentication and retrieves the current session.
     * @returns {Promise<User|null>}
     */
    async initializeAuth() {
        if (!this.state.supabase) return null;

        try {
            const { data: { session }, error } = await this.state.supabase.auth.getSession();
            if (error) throw error;

            if (session) {
                this.state.setUser(session.user);
                return session.user;
            }
            return null;
        } catch (error) {
            console.error('Auth initialization error:', error);
            throw error;
        }
    }

    /**
     * Opens the authentication popup.
     * @returns {Promise<User|null>}
     */
    openAuthPopup() {
        const popup = window.open(chrome.runtime.getURL('dist/src/auth/index.html'), 'auth', 'width=400,height=500');

        return new Promise((resolve) => {
            const checkAuth = setInterval(async () => {
                if (popup.closed) {
                    clearInterval(checkAuth);
                    const user = await this.initializeAuth();
                    resolve(user);
                }
            }, CONFIG.AUTH_CHECK_INTERVAL);
        });
    }

    /**
     * Handles user logout.
     * @returns {Promise<{success: boolean}>}
     */
    async handleLogout() {
        try {
            console.log('🔄 Starting logout process...');
            
            if (this.state.supabase) {
                const { error } = await this.state.supabase.auth.signOut();
                if (error) throw error;
                console.log('✅ Signed out from Supabase');
            }

            // Reset app state (clears user, supabase cache, etc.)
            this.state.reset();
            console.log('✅ App state reset');

            // Initialize empty local storage for offline mode
            await chrome.storage.local.set({ 
                pokemonCollection: [],
                pokemonHistory: []
            });
            console.log('✅ Local storage initialized for offline mode');

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    /**
     * Sets up a listener for authentication state changes.
     * @param {Function} onAuthChange - The callback to execute on auth state change.
     */
    setupAuthStateListener(onAuthChange) {
        if (!this.state.supabase) return;

        this.state.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            const user = session?.user || null;
            this.state.setUser(user);
            
            // Only notify background script for significant auth events (login/logout)
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                try {
                    if (chrome.runtime && chrome.runtime.sendMessage) {
                        await chrome.runtime.sendMessage({
                            type: 'AUTH_STATE_CHANGED',
                            data: { session }
                        });
                    }
                } catch (error) {
                    // Silently handle connection errors - background script may not be ready
                    console.log('Background script not available for auth notification');
                }
            }
            
            onAuthChange(event, user);
        });

        // Set up periodic session refresh to keep user logged in
        this.setupSessionRefresh();
    }

    /**
     * Sets up periodic session refresh to maintain authentication.
     */
    setupSessionRefresh() {
        if (!this.state.supabase) return;

        // Refresh session every 30 minutes
        setInterval(async () => {
            try {
                const { data: { session }, error } = await this.state.supabase.auth.refreshSession();
                if (error) {
                    console.warn('Session refresh failed:', error.message);
                    // If refresh fails, try to get current session
                    const { data: { session: currentSession } } = await this.state.supabase.auth.getSession();
                    if (!currentSession) {
                        console.log('No valid session found, user may need to re-authenticate');
                        this.state.setUser(null);
                    }
                } else if (session) {
                    console.log('✅ Session refreshed successfully for:', session.user.email);
                    this.state.setUser(session.user);
                    
                    // Don't notify background script during routine refresh - causes connection errors
                    // Background script will get session when needed via storage
                }
            } catch (error) {
                console.error('❌ Error during session refresh:', error);
            }
        }, 30 * 60 * 1000); // 30 minutes
    }

    /**
     * Manually refreshes the current session.
     * @returns {Promise<User|null>}
     */
    async refreshSession() {
        if (!this.state.supabase) return null;

        try {
            const { data: { session }, error } = await this.state.supabase.auth.refreshSession();
            if (error) throw error;

            if (session) {
                this.state.setUser(session.user);
                
                // Update background script
                try {
                    if (chrome.runtime && chrome.runtime.sendMessage) {
                        await chrome.runtime.sendMessage({
                            type: 'AUTH_STATE_CHANGED',
                            data: { session }
                        });
                    }
                } catch (error) {
                    console.error('❌ Failed to update background script:', error);
                }
                
                return session.user;
            }
            return null;
        } catch (error) {
            console.error('Session refresh error:', error);
            return null;
        }
    }
}
