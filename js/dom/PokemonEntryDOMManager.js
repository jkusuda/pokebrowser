import { CONFIG } from '../config.js';
import { Utils } from '../utils/Utils.js';
import { TypeUtils } from '../utils/TypeUtils.js';

export class PokemonEntryDOMManager {
    constructor() {
        this.elements = this.initializeElements();
    }

    initializeElements() {
        const elementIds = [
            'loading-state', 'error-state', 'pokemon-details', 'pokemon-name',
            'pokemon-id', 'pokemon-sprite', 'pokemon-types', 'pokemon-height', 
            'pokemon-weight', 'types-label', 'pokemon-description', 'card-frame',
            'first-caught-date'
        ];

        return elementIds.reduce((acc, id) => {
            acc[id.replace(/-/g, '_')] = document.getElementById(id);
            return acc;
        }, {});
    }

    setViewState(state) {
        this.elements.loading_state.style.display = state === 'loading' ? 'block' : 'none';
        this.elements.error_state.style.display = state === 'error' ? 'block' : 'none';
        this.elements.pokemon_details.style.display = state === 'details' ? 'block' : 'none';
    }

    render(pokemonData, speciesData, historyData = null) {
        this.updateBasicInfo(pokemonData);
        this.updateSprite(pokemonData);
        this.updateTypes(pokemonData);
        this.updatePhysicalStats(pokemonData);
        this.updateDescription(speciesData);
        this.updateFirstCaught(historyData);
        this.updateBodyBackground(pokemonData);
    }

    updateBasicInfo(pokemonData) {
        this.elements.pokemon_name.textContent = Utils.capitalizeFirst(pokemonData.name);
        this.elements.pokemon_id.textContent = `#${String(pokemonData.id).padStart(3, '0')}`;
    }

    updateSprite(pokemonData) {
        const spriteUrl = `${CONFIG.ANIMATED_SPRITE_BASE_URL}/${pokemonData.id}.gif`;
        this.elements.pokemon_sprite.src = spriteUrl;
        this.elements.pokemon_sprite.alt = pokemonData.name;
    }

    updateTypes(pokemonData) {
        this.elements.pokemon_types.innerHTML = TypeUtils.createTypeIconsHTML(pokemonData.types);
        this.elements.types_label.textContent = TypeUtils.formatTypesLabel(pokemonData.types);
    }

    updatePhysicalStats(pokemonData) {
        this.elements.pokemon_height.textContent = `${pokemonData.height / 10} m`;
        this.elements.pokemon_weight.textContent = `${pokemonData.weight / 10} kg`;
    }

    updateDescription(speciesData) {
        const flavorTextEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
        if (flavorTextEntry) {
            this.elements.pokemon_description.textContent = `"${flavorTextEntry.flavor_text.replace(/[\n\f]/g, ' ')}"`;
        }
    }

    updateFirstCaught(historyData) {
        console.log('🔧 DOM: updateFirstCaught called with:', historyData);
        
        if (historyData) {
            // Try different possible date field names
            const dateField = historyData.first_caught_at || historyData.created_at || historyData.caught_at;
            
            console.log('📅 DOM: Date field value:', dateField);
            console.log('📅 DOM: Date field type:', typeof dateField);
            
            if (dateField) {
                // PostgreSQL timestampz might come as string, try to parse it
                let date;
                if (typeof dateField === 'string') {
                    // Handle PostgreSQL timestampz format
                    date = new Date(dateField);
                } else if (dateField instanceof Date) {
                    date = dateField;
                } else {
                    console.log('❌ DOM: Unknown date field type');
                    this.elements.first_caught_date.textContent = 'Unknown date';
                    return;
                }
                
                console.log('📅 DOM: Parsed date object:', date);
                console.log('📅 DOM: Date valid?', !isNaN(date.getTime()));
                
                // Validate date
                if (!isNaN(date.getTime())) {
                    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                    const formattedTime = date.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                    });
                    
                    const finalText = `${formattedDate} at ${formattedTime}`;
                    console.log('✅ DOM: Setting date text to:', finalText);
                    this.elements.first_caught_date.textContent = finalText;
                    return;
                } else {
                    console.log('❌ DOM: Date parsing failed');
                }
            } else {
                console.log('❌ DOM: No date field found');
            }
        } else {
            console.log('❌ DOM: No history data provided');
        }
        
        console.log('❌ DOM: Falling back to Unknown date');
        this.elements.first_caught_date.textContent = 'Unknown date';
    }

    updateBodyBackground(pokemonData) {
        TypeUtils.applyTypeBackground(pokemonData.types, this.elements.card_frame);
    }
}
