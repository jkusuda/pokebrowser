import React from 'react';
import { CONFIG } from '../../shared/config.js';
import { Utils } from '../../utils/Utils.js';

const PokemonCollection = ({ collection, onPokemonClick }) => {
  if (collection.length === 0) {
    return (
      <div className="collection card" role="list" aria-label="Pokemon collection">
        <div className="empty-state">
          <h3>POKEDEX EMPTY</h3>
          <p>Scan web pages to detect wild Pokémon and begin data collection...</p>
        </div>
      </div>
    );
  }

  // Sort collection by most recent catches first
  const sortedCollection = [...collection].sort((a, b) => 
    new Date(b.caughtAt) - new Date(a.caughtAt)
  );

  return (
    <div className="collection card" role="list" aria-label="Pokemon collection">
      {sortedCollection.map((pokemon, index) => (
        <div 
          key={`${pokemon.id}-${pokemon.caughtAt}-${index}`}
          className="pokemon-item clickable-pokemon"
          onClick={() => onPokemonClick(pokemon)}
          style={{ cursor: 'pointer' }}
        >
          <div className="pokemon-sprite">
            <img 
              src={`${CONFIG.SPRITE_BASE_URL}/${pokemon.shiny ? 'shiny/' : ''}${pokemon.id}.png`}
              alt={pokemon.name}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="pokemon-info">
            <div className="pokemon-name">{pokemon.name}</div>
            <div className="pokemon-details">
              {pokemon.level && `Lv.${pokemon.level}`}
              {pokemon.level && pokemon.types?.length && ' • '}
              {pokemon.types?.join('/') || ''}
              <br />
              Caught on {pokemon.site} • {Utils.formatDate(pokemon.caughtAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PokemonCollection;
