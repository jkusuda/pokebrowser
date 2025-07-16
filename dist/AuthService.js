import { C as CONFIG } from "./config.js";
import { s as supabase } from "./supabase-client.js";
class AuthService {
  // Initialize auth service with app state
  constructor(appState) {
    this.state = appState;
  }
  // Set up Supabase client for authentication
  async initializeSupabase() {
    var _a;
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
      throw new Error("Cloud sync not configured");
    }
    if (!((_a = supabase) == null ? void 0 : _a.createClient)) {
      throw new Error("Cloud sync library not loaded");
    }
    const client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    if (!(client == null ? void 0 : client.from)) {
      throw new Error("Failed to initialize Supabase client");
    }
    this.state.setSupabase(client);
    return client;
  }
  // Get current user session if exists
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
      console.error("Auth initialization error:", error);
      throw error;
    }
  }
  // Open auth popup and wait for completion
  openAuthPopup() {
    const popup = window.open(chrome.runtime.getURL("dist/src/auth/index.html"), "auth", "width=400,height=500");
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
  // Sign out user and reset app state
  async handleLogout() {
    try {
      console.log("🔄 Starting logout process...");
      if (this.state.supabase) {
        const { error } = await this.state.supabase.auth.signOut();
        if (error) throw error;
        console.log("✅ Signed out from Supabase");
      }
      this.state.reset();
      console.log("✅ App state reset");
      await chrome.storage.local.set({
        pokemonCollection: [],
        pokemonHistory: []
      });
      console.log("✅ Local storage initialized for offline mode");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }
  // Listen for auth state changes and notify background script
  setupAuthStateListener(onAuthChange) {
    if (!this.state.supabase) return;
    this.state.supabase.auth.onAuthStateChange(async (event, session) => {
      var _a;
      console.log("Auth state changed:", event, (_a = session == null ? void 0 : session.user) == null ? void 0 : _a.email);
      const user = (session == null ? void 0 : session.user) || null;
      this.state.setUser(user);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        try {
          if (chrome.runtime && chrome.runtime.sendMessage) {
            await chrome.runtime.sendMessage({
              type: "AUTH_STATE_CHANGED",
              data: { session }
            });
          }
        } catch (error) {
          console.log("Background script not available for auth notification");
        }
      }
      onAuthChange(event, user);
    });
    this.setupSessionRefresh();
  }
  // Refresh session every 30 minutes to keep user logged in
  setupSessionRefresh() {
    if (!this.state.supabase) return;
    setInterval(async () => {
      try {
        const { data: { session }, error } = await this.state.supabase.auth.refreshSession();
        if (error) {
          console.warn("Session refresh failed:", error.message);
          const { data: { session: currentSession } } = await this.state.supabase.auth.getSession();
          if (!currentSession) {
            console.log("No valid session found, user may need to re-authenticate");
            this.state.setUser(null);
          }
        } else if (session) {
          console.log("✅ Session refreshed successfully for:", session.user.email);
          this.state.setUser(session.user);
        }
      } catch (error) {
        console.error("❌ Error during session refresh:", error);
      }
    }, 30 * 60 * 1e3);
  }
  // Manually refresh user session
  async refreshSession() {
    if (!this.state.supabase) return null;
    try {
      const { data: { session }, error } = await this.state.supabase.auth.refreshSession();
      if (error) throw error;
      if (session) {
        this.state.setUser(session.user);
        try {
          if (chrome.runtime && chrome.runtime.sendMessage) {
            await chrome.runtime.sendMessage({
              type: "AUTH_STATE_CHANGED",
              data: { session }
            });
          }
        } catch (error2) {
          console.error("❌ Failed to update background script:", error2);
        }
        return session.user;
      }
      return null;
    } catch (error) {
      console.error("Session refresh error:", error);
      return null;
    }
  }
}
export {
  AuthService as A
};
//# sourceMappingURL=AuthService.js.map
