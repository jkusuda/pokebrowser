import React, { useState, useEffect } from 'react';
import { AppState } from '../utils/AppState.js';
import { APIService } from '../services/ApiService.js';
import { AuthService } from '../services/AuthService.js';
import { PokemonService } from '../services/PokemonService.js';
import { CandyService } from '../services/CandyService.js';
import { EvolutionService } from '../services/EvolutionService.js';
import { StorageService } from '../services/StorageService.js';
import { Utils } from '../utils/Utils.js';
import LoadingState from './components/LoadingState.jsx';
import ErrorState from './components/ErrorState.jsx';
import PokemonDetailCard from './components/PokemonDetailCard.jsx';

const PokemonDetailApp = () => {
  const [viewState, setViewState] = useState('loading'); // 'loading', 'error', 'details'
  const [pokemon, setPokemon] = useState(null);
  const [pokemonData, setPokemonData] = useState(null);
  const [speciesData, setSpeciesData] = useState(null);
  const [candyCount, setCandyCount] = useState(0);
  const [baseCandyName, setBaseCandyName] = useState(null);
  const [evolutionInfo, setEvolutionInfo] = useState(null);
  const [canEvolve, setCanEvolve] = useState(false);
  const [errorMessage, setErrorMessage] = useState('An error occurred');

  // Services (initialized once)
  const [services] = useState(() => {
    const state = new AppState();
    return {
      state,
      auth: new AuthService(state),
      pokemon: new PokemonService(state),
      evolution: new EvolutionService(state),
      candy: null // Will be initialized after auth
    };
  });

  useEffect(() => {
    initializePokemonDetail();
  }, []);

  const initializePokemonDetail = async () => {
    try {
      setViewState('loading');
      
      // Initialize authentication
      await initializeAuth();
      
      // Get Pokemon from URL params and storage
      const params = Utils.parseURLParams();
      const collection = await StorageService.getPokemonCollection();
      const foundPokemon = collection.find(p =>
        p.id.toString() === params.id.toString() &&
        p.caughtAt === params.caughtAt &&
        p.site === params.site
      ) || params;

      setPokemon(foundPokemon);
      services.state.setPokemon(foundPokemon);

      // Fetch API data
      await fetchApiData(foundPokemon.id);
      
      setViewState('details');
    } catch (error) {
      console.error('Error initializing Pokemon detail:', error);
      setErrorMessage(error.message);
      setViewState('error');
    }
  };

  const initializeAuth = async () => {
    try {
      const client = await services.auth.initializeSupabase();
      services.state.setSupabase(client);
      const user = await services.auth.initializeAuth();
      services.state.setUser(user);
      
      console.log('🔧 PokemonDetail: Auth initialized');
      services.state.logAuthStatus();
      
      // Initialize candy service if user is logged in
      if (user) {
        console.log('🔧 PokemonDetail: Initializing CandyService for user:', user.email);
        services.candy = new CandyService(services.state);
      }
    } catch (error) {
      console.warn('❌ Auth initialization failed:', error);
      services.state.logAuthStatus();
    }
  };

  const fetchApiData = async (pokemonId) => {
    try {
      const cache = services.state.getCache();
      const [pokemonApiData, speciesApiData] = await Promise.all([
        APIService.fetchPokemonData(pokemonId, cache),
        APIService.fetchSpeciesData(pokemonId, cache)
      ]);
      
      setPokemonData(pokemonApiData);
      setSpeciesData(speciesApiData);
      services.state.setPokemonData(pokemonApiData);
      
      // Load candy data if user is logged in
      let currentCandyCount = 0;
      let currentBaseCandyName = null;
      if (services.candy) {
        try {
          const candyData = await services.candy.getCandyForUser();
          const baseCandyId = services.evolution.getBaseCandyId(pokemonId);
          currentCandyCount = candyData.get(baseCandyId) || 0;
          currentBaseCandyName = services.evolution.getBaseCandyName(pokemonId);
        } catch (error) {
          console.error('Error loading candy data:', error);
        }
      }
      
      setCandyCount(currentCandyCount);
      setBaseCandyName(currentBaseCandyName);
      
      // Check evolution availability
      const pokemonCanEvolve = services.evolution.canEvolve(pokemonId);
      const currentEvolutionInfo = pokemonCanEvolve ? services.evolution.getEvolutionInfo(pokemonId) : null;
      
      setCanEvolve(pokemonCanEvolve);
      setEvolutionInfo(currentEvolutionInfo);
      
    } catch (error) {
      console.error('Error fetching API data:', error);
      // Don't throw, as basic info is already displayed
    }
  };

  const handleEvolution = async () => {
    const pokemonId = parseInt(pokemon.id || pokemon.pokemon_id);
    
    // Check if user is authenticated
    if (!services.candy) {
      alert('You must be logged in to evolve Pokemon!');
      return;
    }

    // Get current candy count using base candy ID
    let currentCandy = 0;
    try {
      const candyData = await services.candy.getCandyForUser();
      const baseCandyId = services.evolution.getBaseCandyId(pokemonId);
      currentCandy = candyData.get(baseCandyId) || 0;
    } catch (error) {
      console.error('Error getting candy count:', error);
      alert('Failed to check candy count. Please try again.');
      return;
    }

    // Get evolution info
    const currentEvolutionInfo = services.evolution.getEvolutionInfo(pokemonId);
    if (!currentEvolutionInfo) {
      alert('This Pokemon cannot evolve!');
      return;
    }

    // Validate evolution using base candy
    const validation = services.evolution.validateEvolutionWithBaseCandy(pokemonId, currentCandy);
    if (!validation.success) {
      alert(validation.message);
      return;
    }

    // Show confirmation dialog
    const confirmMessage = `Evolve ${Utils.capitalizeFirst(pokemon.name)} into ${currentEvolutionInfo.name}?\n\nThis will cost ${currentEvolutionInfo.candyCost} candy and cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Perform evolution
      const result = await services.evolution.evolvePokemon(pokemon, currentCandy);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Show success message
      const fromName = Utils.capitalizeFirst(pokemon.name);
      const toName = Utils.capitalizeFirst(result.evolvedPokemon.name);
      showEvolutionSuccess(fromName, toName);

      // Update current Pokemon state
      setPokemon(result.evolvedPokemon);
      services.state.setPokemon(result.evolvedPokemon);

      // Fetch new API data for evolved Pokemon
      const cache = services.state.getCache();
      const evolvedPokemonData = await APIService.fetchPokemonData(result.evolvedPokemon.id, cache);
      setPokemonData(evolvedPokemonData);
      services.state.setPokemonData(evolvedPokemonData);

      // Wait for background script to process candy deduction, then refresh candy data
      console.log('⏳ Waiting for candy deduction to process...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
      
      console.log('🔄 Refreshing candy data after evolution...');
      const newCandyData = await services.candy.refreshCandyData();
      const newBaseCandyId = services.evolution.getBaseCandyId(result.evolvedPokemon.id);
      const newCandyCount = newCandyData.get(newBaseCandyId) || 0;
      const newBaseCandyName = services.evolution.getBaseCandyName(result.evolvedPokemon.id);
      
      setCandyCount(newCandyCount);
      setBaseCandyName(newBaseCandyName);
      
      const newCanEvolve = services.evolution.canEvolve(result.evolvedPokemon.id);
      const newEvolutionInfo = newCanEvolve ? services.evolution.getEvolutionInfo(result.evolvedPokemon.id) : null;
      
      setCanEvolve(newCanEvolve);
      setEvolutionInfo(newEvolutionInfo);
      
      console.log(`✅ UI updated with new candy count: ${newCandyCount} ${newBaseCandyName} candy`);

      // Fetch and update species data for evolved Pokemon
      try {
        const evolvedSpeciesData = await APIService.fetchSpeciesData(result.evolvedPokemon.id, cache);
        setSpeciesData(evolvedSpeciesData);
      } catch (speciesError) {
        console.warn('Could not fetch evolved Pokemon species data:', speciesError);
      }

    } catch (error) {
      console.error('Error evolving Pokemon:', error);
      alert(`Evolution failed: ${error.message}`);
    }
  };

  const handleRelease = async () => {
    if (!confirm('Are you sure you want to release this Pokémon? This action cannot be undone.')) {
      return;
    }

    try {
      await services.pokemon.releasePokemon(pokemon);
      alert('Pokémon released! 💔');
      await Utils.delay(500);
      window.close();
    } catch (error) {
      console.error('Error releasing Pokémon:', error);
      alert(`Failed to release Pokémon: ${error.message}`);
    }
  };

  const handleSummon = () => {
    alert('Summon feature coming soon!');
  };

  const showEvolutionSuccess = (fromName, toName) => {
    // Create a temporary success message
    const successMessage = document.createElement('div');
    successMessage.className = 'evolution-success';
    successMessage.innerHTML = `
      <div class="success-content">
        <div class="success-icon">🎉</div>
        <div class="success-text">${fromName} evolved into ${toName}!</div>
      </div>
    `;
    
    // Add styles
    successMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(76, 175, 80, 0.95);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 1000;
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(successMessage);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage);
      }
    }, 3000);
  };

  if (viewState === 'loading') {
    return <LoadingState />;
  }

  if (viewState === 'error') {
    return <ErrorState message={errorMessage} />;
  }

  return (
    <PokemonDetailCard
      pokemon={pokemon}
      pokemonData={pokemonData}
      speciesData={speciesData}
      candyCount={candyCount}
      baseCandyName={baseCandyName}
      canEvolve={canEvolve}
      evolutionInfo={evolutionInfo}
      onEvolve={handleEvolution}
      onSummon={handleSummon}
      onRelease={handleRelease}
    />
  );
};

export default PokemonDetailApp;
