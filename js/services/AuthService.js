import { CONFIG } from '../config.js';

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
        if (typeof window.supabase === 'undefined') {
            throw new Error('Cloud sync library not loaded');
        }

        const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
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
        const popup = window.open(chrome.runtime.getURL('auth.html'), 'auth', 'width=400,height=500');

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
            if (!this.state.supabase) return;

            const { error } = await this.state.supabase.auth.signOut();
            if (error) throw error;

            this.state.reset();
            await chrome.storage.local.set({ pokemonCollection: [] });
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
            
            // Notify background script of authentication state change
            try {
                if (chrome.runtime && chrome.runtime.sendMessage) {
                    await chrome.runtime.sendMessage({
                        type: 'AUTH_STATE_CHANGED',
                        data: { session }
                    });
                }
            } catch (error) {
                console.error('❌ Failed to notify background script of auth change:', error);
            }
            
            onAuthChange(event, user);
        });
    }
}
