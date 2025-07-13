import React, { useState, useEffect } from 'react';
import { APIService } from '../services/ApiService.js';
import { HistoryService } from '../services/HistoryService.js';
import { AuthService } from '../services/AuthService.js';
import { AppState } from '../utils/AppState.js';
import { Utils } from '../utils/Utils.js';
import LoadingState from './components/LoadingState.jsx';
import ErrorState from './components/ErrorState.jsx';
import PokemonDetails from './components/PokemonDetails.jsx';

const PokemonEntryApp = () => {
  const [viewState, setViewState] = useState('loading'); // 'loading', 'error', 'details'
  const [pokemonData, setPokemonData] = useState(null);
  const [speciesData, setSpeciesData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [cache] = useState(() => new Map());
  const [state] = useState(() => new AppState());
  const [auth] = useState(() => new AuthService(state));

  useEffect(() => {
    initializePokemonEntry();
  }, []);

  const initializePokemonEntry = async () => {
    setViewState('loading');
    
    try {
      const params = Utils.parseURLParams();
      const pokemonId = params.id;

      if (!pokemonId) {
        throw new Error('No Pokémon ID provided.');
      }

      console.log('🔧 PokemonEntry: Loading Pokemon', pokemonId);

      // Fetch Pokemon data
      const [pokemon, species] = await Promise.all([
        APIService.fetchPokemonData(pokemonId, cache),
        APIService.fetchSpeciesData(pokemonId, cache)
      ]);

      setPokemonData(pokemon);
      setSpeciesData(species);

      // Initialize authentication and get history data
      let history = null;
      try {
        console.log('🔧 PokemonEntry: Initializing authentication...');
        const client = await auth.initializeSupabase();
        state.setSupabase(client);
        const user = await auth.initializeAuth();
        state.setUser(user);
        
        console.log('🔧 PokemonEntry: Auth initialized, user:', user?.email);
        
        if (user) {
          const historyService = new HistoryService(state);
          history = await historyService.getFirstCaughtData(parseInt(pokemonId));
          console.log('📚 History data:', history);
        } else {
          console.log('🔧 PokemonEntry: No authenticated user found');
        }
      } catch (error) {
        console.error('❌ Error with authentication or history data:', error);
        // Continue without history data
      }

      setHistoryData(history);
      setViewState('details');
      
    } catch (error) {
      console.error('Error initializing Pokémon entry page:', error);
      setViewState('error');
    }
  };

  if (viewState === 'loading') {
    return <LoadingState />;
  }

  if (viewState === 'error') {
    return <ErrorState />;
  }

  return (
    <PokemonDetails 
      pokemonData={pokemonData}
      speciesData={speciesData}
      historyData={historyData}
    />
  );
};

export default PokemonEntryApp;
