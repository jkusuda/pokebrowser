import { CONFIG } from './config.js';
import { Utils } from './utils/Utils.js';

/**
 * Manages DOM manipulations for the Pokémon detail page.
 */
export class PokemonDetailDOMManager {
    /**
     * Initializes the DOMManager.
     */
    constructor() {
        this.elements = this.initializeElements();
    }

    /**
     * Initializes and caches DOM elements.
     * @returns {Object} - A dictionary of DOM elements.
     */
    initializeElements() {
        const elementIds = [
            'loading-state', 'error-state', 'pokemon-details', 'pokemon-name',
            'pokemon-id', 'pokemon-sprite', 'pokemon-types', 'candy-count',
            'candy-label', 'caught-site', 'caught-date', 'evolve-btn',
            'summon-btn', 'release-btn'
        ];

        return elementIds.reduce((acc, id) => {
            const element = document.getElementById(id);
            if (element) {
                acc[id.replace(/-/g, '_')] = element;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
            return acc;
        }, {});
    }

    /**
     * Displays the loading state.
     */
    showLoading() {
        this.elements.loading_state.style.display = 'block';
        this.elements.error_state.style.display = 'none';
        this.elements.pokemon_details.style.display = 'none';
    }

    /**
     * Displays an error message.
     * @param {string} message - The error message to display.
     */
    showError(message = 'An error occurred') {
        this.elements.loading_state.style.display = 'none';
        this.elements.error_state.style.display = 'block';
        this.elements.pokemon_details.style.display = 'none';
        
        const errorMsg = this.elements.error_state.querySelector('.error-message');
        if (errorMsg) errorMsg.textContent = message;
    }

    /**
     * Displays the Pokémon details.
     */
    showDetails() {
        this.elements.loading_state.style.display = 'none';
        this.elements.error_state.style.display = 'none';
        this.elements.pokemon_details.style.display = 'block';
    }

    /**
     * Updates the basic information of the Pokémon.
     * @param {Object} pokemonData - The Pokémon data.
     */
    updateBasicInfo(pokemonData) {
        this.elements.pokemon_name.textContent = Utils.capitalizeFirst(pokemonData.name);
        this.elements.pokemon_id.textContent = `#${String(pokemonData.id).padStart(3, '0')}`;
    }

    /**
     * Updates the Pokémon sprite.
     * @param {Object} pokemonData - The Pokémon data.
     */
    updateSprite(pokemonData) {
        const spriteUrl = pokemonData.sprites.other?.['official-artwork']?.front_default ||
                         pokemonData.sprites.front_default ||
                         `${CONFIG.SPRITE_BASE_URL}/${pokemonData.id}.png`;
        
        this.elements.pokemon_sprite.src = spriteUrl;
        this.elements.pokemon_sprite.alt = pokemonData.name;
        this.elements.pokemon_sprite.onerror = () => {
            this.elements.pokemon_sprite.src = `${CONFIG.SPRITE_BASE_URL}/${pokemonData.id}.png`;
        };
    }

    /**
     * Updates the Pokémon types.
     * @param {Object} pokemonData - The Pokémon data.
     */
    updateTypes(pokemonData) {
        this.elements.pokemon_types.innerHTML = pokemonData.types.map(typeInfo => {
            const typeName = typeInfo.type.name;
            return `<span class="type-badge type-${typeName}">${Utils.capitalizeFirst(typeName)}</span>`;
        }).join('');
    }

    /**
     * Updates the candy count for the Pokémon.
     * @param {Object} pokemonData - The Pokémon data.
     */
    updateCandies(pokemonData) {
        const candyCount = Math.floor(Math.random() * 100) + 1;
        this.elements.candy_count.textContent = candyCount;
        this.elements.candy_label.textContent = `${Utils.capitalizeFirst(pokemonData.name)} Candy`;
    }

    /**
     * Updates the catch information for the Pokémon.
     * @param {Object} pokemon - The Pokémon data.
     */
    updateCatchInfo(pokemon) {
        if (pokemon.site && pokemon.caughtAt) {
            const catchDate = new Date(pokemon.caughtAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            this.elements.caught_site.textContent = `Caught on ${pokemon.site}`;
            this.elements.caught_date.textContent = catchDate;
        }
    }

    /**
     * Sets the state of a button.
     * @param {string} buttonName - The name of the button element.
     * @param {boolean} disabled - Whether the button should be disabled.
     * @param {string} [text] - The text to display on the button.
     */
    setButtonState(buttonName, disabled, text) {
        const button = this.elements[buttonName];
        if (button) {
            button.disabled = disabled;
            if (text) button.textContent = text;
        }
    }
}
