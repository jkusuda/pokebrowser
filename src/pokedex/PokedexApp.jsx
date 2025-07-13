import React, { useState, useEffect } from 'react';
import { PokemonService } from '../services/PokemonService.js';
import PokedexHeader from './components/PokedexHeader.jsx';
import PokedexControls from './components/PokedexControls.jsx';
import PokedexGrid from './components/PokedexGrid.jsx';

const PokedexApp = () => {
  const [pokemonList, setPokemonList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [stats, setStats] = useState({ total: 0, unique: 0, completion: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [loading, setLoading] = useState(true);
  const [service] = useState(() => new PokemonService());

  useEffect(() => {
    initializePokedex();
  }, []);

  useEffect(() => {
    // Filter and sort whenever search query or sort option changes
    const filtered = service.filterAndSort(searchQuery, sortBy);
    setFilteredList(filtered);
  }, [searchQuery, sortBy, pokemonList, service]);

  const initializePokedex = async () => {
    try {
      setLoading(true);
      await service.loadPokedex();
      
      // Get initial data
      const initialList = service.filterAndSort('', 'id');
      const initialStats = service.getStats();
      
      setPokemonList(initialList);
      setFilteredList(initialList);
      setStats(initialStats);
    } catch (error) {
      console.error('Error initializing Pokedex:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleSort = (sortOption) => {
    setSortBy(sortOption);
  };

  const handlePokemonClick = (pokemon) => {
    if (pokemon.everOwned) {
      const width = 400;
      const height = 600;
      const left = (screen.width / 2) - (width / 2);
      const top = (screen.height / 2) - (height / 2);
      
      if (window.chrome && chrome.windows && chrome.runtime) {
        const url = chrome.runtime.getURL(`dist/src/pokemon-entry/index.html?id=${pokemon.id}`);
        chrome.windows.create({
          url: url,
          type: 'popup',
          width,
          height,
          left,
          top
        });
      } else {
        // Fallback for development or non-extension environment
        window.open(`dist/src/pokemon-entry/index.html?id=${pokemon.id}`, '_blank', 
          `width=${width},height=${height},left=${left},top=${top}`);
      }
    }
  };

  const refreshData = async () => {
    try {
      console.log('🔄 Pokedex: Refreshing candy and history data...');
      await service.refreshAllData();
      
      // Update the lists and stats
      const newList = service.filterAndSort(searchQuery, sortBy);
      const newStats = service.getStats();
      
      setPokemonList(newList);
      setFilteredList(newList);
      setStats(newStats);
      
      console.log('✅ Pokedex: Data refreshed successfully');
    } catch (error) {
      console.error('❌ Pokedex: Error refreshing data:', error);
    }
  };

  if (loading) {
    return (
      <div className="pokedex-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          fontSize: '18px'
        }}>
          Loading Pokedex...
        </div>
      </div>
    );
  }

  return (
    <div className="pokedex-container">
      <PokedexHeader stats={stats} />
      <PokedexControls 
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearch={handleSearch}
        onSort={handleSort}
        onRefresh={refreshData}
      />
      <PokedexGrid 
        pokemonList={filteredList}
        onPokemonClick={handlePokemonClick}
      />
    </div>
  );
};

export default PokedexApp;
