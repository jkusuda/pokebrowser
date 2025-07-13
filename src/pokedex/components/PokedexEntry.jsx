import React from 'react';
import { Utils } from '../../utils/Utils.js';

const PokedexEntry = ({ pokemon, onClick }) => {
  const handleClick = () => {
    if (pokemon.everOwned) {
      onClick();
    }
  };

  const entryClasses = `pokedex-entry ${pokemon.everOwned ? 'caught' : 'uncaught'}`;
  const spriteStyle = {
    filter: pokemon.everOwned ? 'none' : 'brightness(0)'
  };

  return (
    <div className={entryClasses} onClick={handleClick}>
      <img 
        className="pokedex-sprite" 
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
        alt={pokemon.everOwned ? pokemon.name : 'Unknown Pokemon'}
        style={spriteStyle}
      />
      <div className="pokedex-info">
        <span className="pokedex-id">#{String(pokemon.id).padStart(3, '0')}</span>
        <span className="pokedex-name">
          {pokemon.everOwned ? Utils.capitalizeFirst(pokemon.name) : '???'}
        </span>
        {pokemon.everOwned && (
          <div className="pokedex-candy" style={{ display: 'flex' }}>
            <span className="candy-icon">🍬</span>
            <span className="candy-count">{pokemon.candyCount || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PokedexEntry;
