import React, { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../../shared/config.js';
import { Utils } from '../../utils/Utils.js';
import { TypeUtils } from '../../utils/TypeUtils.js';

const PokemonDetailCard = ({
  pokemon,
  pokemonData,
  speciesData,
  candyCount,
  baseCandyName,
  canEvolve,
  evolutionInfo,
  onEvolve,
  onSummon,
  onRelease
}) => {
  const cardFrameRef = useRef(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  useEffect(() => {
    // Apply type background when component mounts or data changes
    if (pokemonData && cardFrameRef.current) {
      TypeUtils.applyTypeBackground(pokemonData.types, cardFrameRef.current);
    }
  }, [pokemonData]);

  const handleEvolveClick = async () => {
    setIsEvolving(true);
    try {
      await onEvolve();
    } finally {
      setIsEvolving(false);
    }
  };

  const handleReleaseClick = async () => {
    setIsReleasing(true);
    try {
      await onRelease();
    } finally {
      setIsReleasing(false);
    }
  };

  const getSpriteUrl = () => {
    if (!pokemon) return '';
    const shinyPath = pokemon.shiny ? 'shiny/' : '';
    return `${CONFIG.ANIMATED_SPRITE_BASE_URL}/${shinyPath}${pokemon.id}.gif`;
  };

  const getStaticSpriteUrl = () => {
    if (!pokemon) return '';
    const shinyPath = pokemon.shiny ? 'shiny/' : '';
    return `${CONFIG.SPRITE_BASE_URL}/${shinyPath}${pokemon.id}.png`;
  };

  const getDescription = () => {
    if (!speciesData || !speciesData.flavor_text_entries) {
      return '"Loading description..."';
    }
    
    const flavorTextEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
    if (flavorTextEntry) {
      return `"${flavorTextEntry.flavor_text.replace(/[\n\f]/g, ' ')}"`;
    }
    
    return '"No description available."';
  };

  const getCandyLabel = () => {
    const candyName = baseCandyName || (pokemon ? Utils.capitalizeFirst(pokemon.name) : 'Pokemon');
    return `${candyName} Candy`;
  };

  const getEvolveCostText = () => {
    if (!evolutionInfo) return '';
    
    const candyNeeded = Math.max(0, evolutionInfo.candyCost - candyCount);
    if (candyNeeded > 0) {
      return `${candyNeeded} more candy needed`;
    } else {
      return `Costs ${evolutionInfo.candyCost} candy`;
    }
  };

  const getEvolveCostColor = () => {
    if (!evolutionInfo) return '#666';
    
    const candyNeeded = Math.max(0, evolutionInfo.candyCost - candyCount);
    return candyNeeded > 0 ? '#ff6b6b' : '#4CAF50';
  };

  const canEvolveNow = () => {
    return canEvolve && evolutionInfo && candyCount >= evolutionInfo.candyCost;
  };

  const getCatchInfo = () => {
    if (!pokemon || !pokemon.site || !pokemon.caughtAt) {
      return { site: 'Unknown site', date: 'Unknown date' };
    }
    
    return {
      site: `Caught on ${pokemon.site}`,
      date: new Date(pokemon.caughtAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  };

  if (!pokemon) {
    return null;
  }

  const name = pokemon.name ? Utils.capitalizeFirst(pokemon.name) : 'Unknown';
  const displayName = pokemon.shiny ? `${name} ⭐` : name;
  const catchInfo = getCatchInfo();

  return (
    <div className="container">
      <div id="pokemon-details">
        <div id="card-frame" className="card-frame" ref={cardFrameRef}>
          <div className="white-card">
            <div className="sprite-container">
              <img 
                className="pokemon-img" 
                src={getSpriteUrl()}
                alt={pokemon.name}
                onError={(e) => {
                  e.target.src = getStaticSpriteUrl();
                  e.target.onerror = () => {
                    e.target.style.display = 'none';
                  };
                }}
              />
            </div>

            <h2 className="name">{displayName}</h2>
            <p className="number">#{String(pokemon.id).padStart(3, '0')}</p>

            <div className="divider"></div>

            <div className="info-row">
              {/* Height */}
              <span className="value">
                {pokemonData ? `${pokemonData.height / 10} m` : '-- m'}
              </span>
              
              {/* Types */}
              <div
                className="types"
                dangerouslySetInnerHTML={{
                  __html: pokemonData ? TypeUtils.createTypeIconsHTML(pokemonData.types, true) : ''
                }}
              />
              
              {/* Weight */}
              <span className="value">
                {pokemonData ? `${pokemonData.weight / 10} kg` : '-- kg'}
              </span>

              {/* Labels */}
              <span className="label">HEIGHT</span>
              <span className="label">
                {pokemonData ? TypeUtils.formatTypesLabel(pokemonData.types) : 'LOADING'}
              </span>
              <span className="label">WEIGHT</span>
            </div>

            <div className="divider"></div>

            <p className="candy">
              <span>{getCandyLabel()}</span>: 
              <strong> {candyCount}</strong>
            </p>

            {canEvolve && (
              <div className="evolve-section">
                <div className="evolve-row">
                  <button 
                    className={`btn evolve-left ${!canEvolveNow() ? 'disabled' : ''}`}
                    onClick={handleEvolveClick}
                    disabled={!canEvolveNow() || isEvolving}
                    style={{ opacity: canEvolveNow() ? '1' : '0.6' }}
                  >
                    {isEvolving ? 'Evolving...' : 'EVOLVE'}
                  </button>
                  <div 
                    className="evolve-right"
                    style={{ color: getEvolveCostColor() }}
                  >
                    {getEvolveCostText()}
                  </div>
                </div>

                <button className="btn summon" onClick={onSummon}>
                  SUMMON
                </button>
              </div>
            )}

            {!canEvolve && (
              <div className="evolve-section">
                <button className="btn summon" onClick={onSummon}>
                  SUMMON
                </button>
              </div>
            )}

            <div className="divider"></div>
            
            <div className="description">
              {getDescription()}
            </div>

            <div className="footer">
              <p>CAUGHT ON<br/>
              <a href="#" style={{ textDecoration: 'none', color: 'inherit' }}>
                {catchInfo.site}
              </a><br/>
              <span>{catchInfo.date}</span></p>
            </div>
            
            <div className="release-container">
              <button 
                className="btn release-button" 
                onClick={handleReleaseClick}
                disabled={isReleasing}
              >
                {isReleasing ? 'Releasing...' : '🗑️ RELEASE'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonDetailCard;
