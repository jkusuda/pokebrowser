import React from 'react';
import PokedexEntry from './PokedexEntry.jsx';

const PokedexGrid = ({ pokemonList, onPokemonClick }) => {
  return (
    <div className="pokedex-grid">
      {pokemonList.map((pokemon, index) => (
        <PokedexEntry 
          key={`${pokemon.id}-${pokemon.caughtAt}-${index}`}
          pokemon={pokemon}
          onClick={() => onPokemonClick(pokemon)}
        />
      ))}
    </div>
  );
};

export default PokedexGrid;
