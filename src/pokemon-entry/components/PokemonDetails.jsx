import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../../shared/config.js';
import { Utils } from '../../utils/Utils.js';
import { TypeUtils } from '../../utils/TypeUtils.js';

const PokemonDetails = ({ pokemonData, speciesData, historyData }) => {
  const cardFrameRef = useRef(null);

  useEffect(() => {
    // Apply type background when component mounts or data changes
    if (pokemonData && cardFrameRef.current) {
      TypeUtils.applyTypeBackground(pokemonData.types, cardFrameRef.current);
    }
  }, [pokemonData]);

  const formatFirstCaughtDate = (historyData) => {
    console.log('🔧 React: formatFirstCaughtDate called with:', historyData);
    
    if (!historyData) {
      console.log('❌ React: No history data provided');
      return 'First catch date not available';
    }

    // Try different possible date field names
    const dateField = historyData.first_caught_at || historyData.created_at || historyData.caught_at;
    
    console.log('📅 React: Date field value:', dateField);
    console.log('📅 React: Date field type:', typeof dateField);
    
    if (!dateField) {
      console.log('❌ React: No date field found in history data');
      return 'First catch date not available';
    }

    // Parse the date
    let date;
    if (typeof dateField === 'string') {
      date = new Date(dateField);
    } else if (dateField instanceof Date) {
      date = dateField;
    } else if (typeof dateField === 'number') {
      date = new Date(dateField);
    } else {
      console.log('❌ React: Unknown date field type:', typeof dateField);
      return 'Unknown date format';
    }
    
    console.log('📅 React: Parsed date object:', date);
    console.log('📅 React: Date valid?', !isNaN(date.getTime()));
    
    // Validate date
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    if (!isNaN(date.getTime()) && date <= now && date >= oneYearAgo) {
      try {
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        const formattedTime = date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        
        const finalText = `First caught: ${formattedDate} at ${formattedTime}`;
        console.log('✅ React: Returning formatted date:', finalText);
        return finalText;
      } catch (formatError) {
        console.log('❌ React: Date formatting failed:', formatError);
        return 'Date formatting error';
      }
    } else if (!isNaN(date.getTime())) {
      console.log('❌ React: Date outside reasonable range:', date);
      return 'Date unavailable';
    } else {
      console.log('❌ React: Date parsing failed - invalid date');
      return 'Invalid date';
    }
  };

  const getDescription = (speciesData) => {
    if (!speciesData || !speciesData.flavor_text_entries) {
      return 'No description available.';
    }
    
    const flavorTextEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
    if (flavorTextEntry) {
      return `"${flavorTextEntry.flavor_text.replace(/[\n\f]/g, ' ')}"`;
    }
    
    return 'No description available.';
  };

  if (!pokemonData || !speciesData) {
    return null;
  }

  const spriteUrl = `${CONFIG.ANIMATED_SPRITE_BASE_URL}/${pokemonData.id}.gif`;

  return (
    <div className="container">
      <div id="pokemon-details">
        <div id="card-frame" className="card-frame" ref={cardFrameRef}>
          <div className="white-card">
            <div className="sprite-container">
              <img 
                className="pokemon-img" 
                src={spriteUrl}
                alt={pokemonData.name}
              />
            </div>

            <h2 className="name">{Utils.capitalizeFirst(pokemonData.name)}</h2>
            <p className="number">#{String(pokemonData.id).padStart(3, '0')}</p>

            <div className="divider"></div>

            <div className="info-row">
              <span className="value">{pokemonData.height / 10} m</span>
              <div 
                className="types" 
                dangerouslySetInnerHTML={{ 
                  __html: TypeUtils.createTypeIconsHTML(pokemonData.types) 
                }}
              />
              <span className="value">{pokemonData.weight / 10} kg</span>
              <span className="label">HEIGHT</span>
              <span className="label">{TypeUtils.formatTypesLabel(pokemonData.types)}</span>
              <span className="label">WEIGHT</span>
            </div>

            <div className="divider"></div>

            <div className="description">
              {getDescription(speciesData)}
            </div>

            <div className="footer">
              <p>FIRST CAUGHT ON<br/>
              <span>{formatFirstCaughtDate(historyData)}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonDetails;
