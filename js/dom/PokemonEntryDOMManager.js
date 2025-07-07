import { CONFIG } from '../config.js';
import { Utils } from '../utils/Utils.js';

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
        const spriteUrl = `${CONFIG.SPRITE_BASE_URL}/${pokemonData.id}.png`;
        this.elements.pokemon_sprite.src = spriteUrl;
        this.elements.pokemon_sprite.alt = pokemonData.name;
    }

    updateTypes(pokemonData) {
        this.elements.pokemon_types.innerHTML = pokemonData.types.map(typeInfo => {
            const typeName = typeInfo.type.name;
            return `<img src="${this.getTypeIconPath(typeName)}" alt="${typeName}" class="type-icon">`;
        }).join('');
        this.elements.types_label.textContent = pokemonData.types.map(t => t.type.name.toUpperCase()).join(' / ');
    }

    getTypeIconPath(typeName) {
        const iconMap = {
            normal: 'https://archives.bulbagarden.net/media/upload/2/22/GO_Normal.png',
            fire: 'https://archives.bulbagarden.net/media/upload/0/0e/GO_Fire.png',
            water: 'https://archives.bulbagarden.net/media/upload/a/aa/GO_Water.png',
            electric: 'https://archives.bulbagarden.net/media/upload/4/4a/GO_Electric.png',
            grass: 'https://archives.bulbagarden.net/media/upload/6/61/GO_Grass.png',
            ice: 'https://archives.bulbagarden.net/media/upload/c/c6/GO_Ice.png',
            fighting: 'https://archives.bulbagarden.net/media/upload/1/1e/GO_Fighting.png',
            poison: 'https://archives.bulbagarden.net/media/upload/f/ff/GO_Poison.png',
            ground: 'https://archives.bulbagarden.net/media/upload/2/21/GO_Ground.png',
            flying: 'https://archives.bulbagarden.net/media/upload/8/87/GO_Flying.png',
            psychic: 'https://archives.bulbagarden.net/media/upload/f/f2/GO_Psychic.png',
            bug: 'https://archives.bulbagarden.net/media/upload/9/94/GO_Bug.png',
            rock: 'https://archives.bulbagarden.net/media/upload/1/11/GO_Rock.png',
            ghost: 'https://archives.bulbagarden.net/media/upload/a/a1/GO_Ghost.png',
            dragon: 'https://archives.bulbagarden.net/media/upload/9/90/GO_Dragon.png',
            dark: 'https://archives.bulbagarden.net/media/upload/7/73/GO_Dark.png',
            steel: 'https://archives.bulbagarden.net/media/upload/d/d2/GO_Steel.png',
            fairy: 'https://archives.bulbagarden.net/media/upload/a/ae/GO_Fairy.png'
        };
        return iconMap[typeName] || '';
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
        if (historyData && historyData.first_caught_at) {
            // Format date and time (M/D/YYYY at H:MM AM/PM)
            const date = new Date(historyData.first_caught_at);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            const formattedTime = date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });
            
            this.elements.first_caught_date.textContent = `${formattedDate} at ${formattedTime}`;
        } else {
            this.elements.first_caught_date.textContent = 'Unknown date';
        }
    }

    updateBodyBackground(pokemonData) {
        const primaryType = pokemonData.types[0].type.name;
        const typeColor = this.getTypeColor(primaryType);
        document.body.style.backgroundColor = typeColor.background;
        this.elements.card_frame.style.borderColor = typeColor.border;
    }

    getTypeColor(typeName) {
        const colors = {
            normal: { background: '#A8A878', border: '#8A8A59' },
            fire: { background: '#F08030', border: '#C06020' },
            water: { background: '#6890F0', border: '#4070D0' },
            electric: { background: '#F8D030', border: '#C8A020' },
            grass: { background: '#78C850', border: '#58A030' },
            ice: { background: '#98D8D8', border: '#70B8B8' },
            fighting: { background: '#C03028', border: '#902018' },
            poison: { background: '#A040A0', border: '#803080' },
            ground: { background: '#E0C068', border: '#C0A048' },
            flying: { background: '#A890F0', border: '#8870D0' },
            psychic: { background: '#F85888', border: '#C83868' },
            bug: { background: '#A8B820', border: '#889818' },
            rock: { background: '#B8A038', border: '#988028' },
            ghost: { background: '#705898', border: '#504078' },
            dragon: { background: '#7038F8', border: '#5020C8' },
            dark: { background: '#705848', border: '#504038' },
            steel: { background: '#B8B8D0', border: '#9898B0' },
            fairy: { background: '#EE99AC', border: '#D0708C' }
        };
        return colors[typeName] || { background: '#dff0cb', border: '#4ecf87' };
    }
}
