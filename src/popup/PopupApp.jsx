import React, { useState, useEffect, useCallback } from 'react';
import { AppState } from '../utils/AppState.js';
import { AuthService } from '../services/AuthService.js';
import { SyncService } from '../services/SyncService.js';
import { PokemonService } from '../services/PokemonService.js';
import { StorageService } from '../services/StorageService.js';
import { CONFIG } from '../shared/config.js';
import { Utils } from '../utils/Utils.js';

import AuthSection from './components/AuthSection.jsx';
import StatsSection from './components/StatsSection.jsx';
import PokemonCollection from './components/PokemonCollection.jsx';
import SyncIndicator from './components/SyncIndicator.jsx';

const PopupApp = ({ appState }) => {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [collection, setCollection] = useState([]);
  const [syncStatus, setSyncStatus] = useState({ message: 'Local storage only', type: 'local' });
  const [showSyncIndicator, setShowSyncIndicator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Services (initialized once)
  const [services] = useState(() => {
    const auth = new AuthService(appState);
    const sync = new SyncService(appState);
    const pokemon = new PokemonService(appState);
    appState.auth = auth;
    appState.sync = sync;
    appState.pokemon = pokemon;
    return { state: appState, auth, sync, pokemon };
  });

  // Update sync status helper
  const updateSyncStatus = useCallback((message, type = 'local') => {
    console.log(`Sync status: ${message} (${type})`);
    setSyncStatus({ message, type });
    setShowSyncIndicator(type === 'syncing');
  }, []);

  // Load collection from storage
  const loadCollection = useCallback(async () => {
    try {
      const pokemonCollection = await StorageService.getPokemonCollection();
      setCollection(pokemonCollection);
    } catch (error) {
      console.error('Error loading collection:', error);
    }
  }, []);

  // Fetch collection from Supabase
  const fetchCloudCollection = useCallback(async (user) => {
    if (!user) return;
    try {
      const { data, error } = await services.state.supabase
        .from('pokemon')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      setCollection(data.map(p => ({
        id: p.pokemon_id,
        name: p.name,
        species: p.species,
        level: p.level,
        shiny: p.shiny,
        site: p.site_caught,
        caughtAt: p.caught_at
      })));
    } catch (error) {
      console.error('Error fetching cloud collection:', error);
    }
  }, [services.state]);

  // Handle login
  const handleLogin = useCallback(async () => {
    try {
      console.log('🔄 Starting login process...');
      const authUser = await services.auth.openAuthPopup();
      if (authUser) {
        setUser(authUser);
        updateSyncStatus('Syncing local data to cloud...', 'syncing');
        
        // First, sync local collection to cloud
        const localCollection = await StorageService.getPokemonCollection();
        if (localCollection.length > 0) {
          console.log(`📤 Syncing ${localCollection.length} local Pokemon to cloud...`);
          await services.sync.immediateSync(localCollection);
        }
        
        // Sync local history to cloud
        try {
          await services.pokemon.initializeServices();
          if (services.pokemon.historyService) {
            await services.pokemon.historyService.syncLocalHistory();
          }
        } catch (historyError) {
          console.error('Error syncing local history:', historyError);
          // Don't fail login if history sync fails
        }
        
        // COMPLETELY clear local storage - we're now in cloud mode
        await chrome.storage.local.set({ 
          pokemonCollection: [],
          pokemonHistory: []
        });
        console.log('✅ Local storage cleared - now using cloud data only');
        
        // Fetch and display cloud collection
        await fetchCloudCollection(authUser);
        updateSyncStatus('Connected to cloud', 'synced');
        console.log('✅ Login complete - switched to cloud mode');
      }
    } catch (error) {
      console.error('Login error:', error);
      updateSyncStatus('Login failed', 'error');
    }
  }, [services.auth, services.sync, services.pokemon, fetchCloudCollection, updateSyncStatus]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      console.log('🔄 Starting logout process...');
      updateSyncStatus('Signing out...', 'syncing');
      
      // Clear the current collection display immediately
      setCollection([]);
      
      // Handle logout (clears Supabase session and app state)
      await services.auth.handleLogout();
      setUser(null);
      
      // Load local collection for offline mode
      await loadCollection();
      updateSyncStatus('Local storage only', 'local');
      console.log('✅ Logout complete - switched to local mode');
    } catch (error) {
      console.error('Logout error:', error);
      updateSyncStatus('Error signing out', 'error');
    }
  }, [services.auth, loadCollection, updateSyncStatus]);

  // Initialize Supabase
  const initializeSupabase = useCallback(async () => {
    try {
      await services.auth.initializeSupabase();
      console.log('Supabase initialized successfully');
    } catch (error) {
      console.warn('Supabase initialization failed:', error);
      updateSyncStatus(error.message, 'error');
    }
  }, [services.auth, updateSyncStatus]);

  // Initialize authentication
  const initializeAuth = useCallback(async () => {
    if (!services.state.supabase) return;

    try {
      const currentUser = await services.auth.initializeAuth();
      
      if (currentUser) {
        setUser(currentUser);
        updateSyncStatus('Connected to cloud', 'synced');
        await fetchCloudCollection(currentUser);
      } else {
        await loadCollection();
        updateSyncStatus('Local storage only', 'local');
      }

      // Setup auth state listener
      services.auth.setupAuthStateListener(async (event, authUser) => {
        if (event === 'SIGNED_IN') {
          console.log('🔄 Auth listener: User signed in');
          setUser(authUser);
          updateSyncStatus('Syncing local data to cloud...', 'syncing');
          
          // Sync local collection to cloud
          const localCollection = await StorageService.getPokemonCollection();
          if (localCollection.length > 0) {
            console.log(`📤 Auth listener: Syncing ${localCollection.length} local Pokemon to cloud...`);
            await services.sync.immediateSync(localCollection);
          }
          
          // Sync local history to cloud
          try {
            await services.pokemon.initializeServices();
            if (services.pokemon.historyService) {
              await services.pokemon.historyService.syncLocalHistory();
            }
          } catch (historyError) {
            console.error('Error syncing local history:', historyError);
            // Don't fail login if history sync fails
          }
          
          // COMPLETELY clear local storage - we're now in cloud mode
          await chrome.storage.local.set({ 
            pokemonCollection: [],
            pokemonHistory: []
          });
          console.log('✅ Auth listener: Local storage cleared - now using cloud data only');
          
          await fetchCloudCollection(authUser);
          updateSyncStatus('Connected to cloud', 'synced');
          console.log('✅ Auth listener: Login complete - switched to cloud mode');
        } else if (event === 'SIGNED_OUT') {
          console.log('🔄 Auth listener: User signed out - switching to local mode');
          setUser(null);
          await loadCollection();
          updateSyncStatus('Local storage only', 'local');
          console.log('✅ Auth listener: Logout complete - switched to local mode');
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      updateSyncStatus('Auth system offline', 'error');
    }
  }, [services.auth, services.state, fetchCloudCollection, loadCollection, updateSyncStatus, services.sync]);

  // Handle view Pokedex
  const handleViewPokedex = useCallback(() => {
    if (services.state.currentUser) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dist/src/pokedex/index.html') });
    } else {
      alert('Please log in to view the Pokedex.');
    }
  }, [services.state.currentUser]);

  // Handle Pokemon click
  const handlePokemonClick = useCallback((pokemon) => {
    services.pokemon.openPokemonDetail(pokemon);
  }, [services.pokemon]);

  // Initialize app
  useEffect(() => {
    const initialize = async () => {
      if (isInitialized) return;

      try {
        await initializeSupabase();
        await initializeAuth();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        updateSyncStatus('Local storage only', 'local');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [isInitialized, initializeSupabase, initializeAuth, updateSyncStatus]);

  // Listen for collection updates from background script
  useEffect(() => {
    const handleMessage = (message, sender, sendResponse) => {
      if (message.type === 'COLLECTION_UPDATED') {
        console.log('🔄 Popup: Received collection update notification from:', message.data?.source || 'unknown');
        console.log('🔄 Popup: Pokemon caught:', message.data?.pokemon?.name || 'unknown');
        
        // Refresh the collection based on current user state
        if (user) {
          console.log('🔄 Refreshing cloud collection...');
          fetchCloudCollection(user);
        } else {
          console.log('🔄 Refreshing local collection...');
          loadCollection();
        }
        
        sendResponse({ success: true });
      }
    };

    // Add message listener
    chrome.runtime.onMessage.addListener(handleMessage);

    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [user, fetchCloudCollection, loadCollection]);

  // Add storage listener as fallback for local storage changes
  useEffect(() => {
    if (!user) { // Only listen for storage changes when not logged in
      const handleStorageChange = (changes, areaName) => {
        if (areaName === 'local' && changes.pokemonCollection) {
          console.log('🔄 Popup: Local storage changed, refreshing collection...');
          loadCollection();
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);

      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [user, loadCollection]);

  // Calculate stats
  const stats = {
    totalCaught: collection.length,
    uniquePokemon: new Set(collection.map(p => p.id)).size
  };

  if (isLoading) {
    return (
      <div className="popup-loading">
        <div className="top-section">
          <div className="indicators">
            <div className="indicator red"></div>
            <div className="indicator yellow"></div>
            <div className="indicator green"></div>
          </div>
        </div>
        <div className="header">
          <h1>POKÉBROWSER</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      {showSyncIndicator && <SyncIndicator />}
      
      <div className="top-section">
        <div className="indicators">
          <div className="indicator red"></div>
          <div className="indicator yellow"></div>
          <div className="indicator green"></div>
        </div>
      </div>
      
      <div className="header">
        <h1>POKÉBROWSER</h1>
      </div>
      
      <StatsSection stats={stats} />
      
      <div className="section-title">
        <h2>Recent Catches</h2>
      </div>
      
      <PokemonCollection 
        collection={collection}
        onPokemonClick={handlePokemonClick}
      />
      
      <div className="action-section">
        <button 
          className="btn secondary" 
          onClick={handleViewPokedex}
          aria-label="View full Pokédex"
        >
          VIEW POKÉDEX
        </button>
      </div>
      
      <AuthSection
        user={user}
        syncStatus={syncStatus}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      
      <div className="bottom-section"></div>
    </>
  );
};

export default PopupApp;
