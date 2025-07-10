import { CONFIG } from '../config.js';
import { Utils } from '../utils/Utils.js';
import { TypeUtils } from '../utils/TypeUtils.js';

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
            'summon-btn', 'release-btn', 'pokemon-height', 'pokemon-weight',
            'types-label', 'pokemon-description', 'card-frame'
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

    setViewState(state, errorMessage = 'An error occurred') {
        const { loading_state, error_state, pokemon_details } = this.elements;
        const states = {
            loading: loading_state,
            error: error_state,
            details: pokemon_details
        };

        Object.entries(states).forEach(([key, element]) => {
            if (element) {
                element.style.display = key === state ? 'block' : 'none';
            }
        });

        if (state === 'error') {
            const errorMessageElement = error_state.querySelector('.error-message');
            if (errorMessageElement) {
                errorMessageElement.textContent = errorMessage;
            }
        }
    }

    /**
     * Updates the Pokémon sprite.
     * @param {Object} pokemon - The Pokémon data from storage.
     * @param {boolean} isShiny - Whether the Pokémon is shiny.
     */
    updateSprite(pokemon, isShiny) {
        const shinyPath = isShiny ? 'shiny/' : '';
        const animatedSpriteUrl = `${CONFIG.ANIMATED_SPRITE_BASE_URL}/${shinyPath}${pokemon.id}.gif`;
        const staticSpriteUrl = `${CONFIG.SPRITE_BASE_URL}/${shinyPath}${pokemon.id}.png`;

        this.elements.pokemon_sprite.src = animatedSpriteUrl;
        this.elements.pokemon_sprite.alt = pokemon.name;
        this.elements.pokemon_sprite.onerror = () => {
            this.elements.pokemon_sprite.src = staticSpriteUrl;
            this.elements.pokemon_sprite.onerror = () => {
                this.elements.pokemon_sprite.style.display = 'none';
            };
        };
    }

    /**
     * Updates the Pokémon types.
     * @param {Object} pokemonData - The Pokémon data.
     */
    updateTypes(pokemonData) {
        this.elements.pokemon_types.innerHTML = TypeUtils.createTypeIconsHTML(pokemonData.types, true);
        TypeUtils.applyTypeBackground(pokemonData.types, this.elements.card_frame);
    }

    updateTypesLabel(pokemonData) {
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

    /**
     * Updates the candy count for the Pokémon.
     * @param {Object} pokemonData - The Pokémon data.
     * @param {number} candyCount - The actual candy count for this Pokémon.
     * @param {Object} evolutionInfo - Evolution information (cost, target, etc.)
     * @param {string} baseCandyName - The name of the base Pokemon whose candy is used.
     */
    updateCandies(pokemonData, candyCount = 0, evolutionInfo = null, baseCandyName = null) {
        this.elements.candy_count.textContent = candyCount;
        
        // Use base candy name if provided, otherwise fall back to current Pokemon name
        const candyName = baseCandyName || Utils.capitalizeFirst(pokemonData.name);
        this.elements.candy_label.textContent = `${candyName} Candy`;
        
        // Update evolve cost display based on actual evolution data
        const evolveCostElement = document.getElementById('evolve-cost');
        if (evolveCostElement && evolutionInfo) {
            const candyNeeded = Math.max(0, evolutionInfo.candyCost - candyCount);
            if (candyNeeded > 0) {
                evolveCostElement.textContent = `${candyNeeded} Candy Needed`;
                evolveCostElement.style.color = '#ff6b6b';
            } else {
                evolveCostElement.textContent = 'Ready to Evolve!';
                evolveCostElement.style.color = '#4CAF50';
            }
        }
    }

    /**
     * Updates the catch information for the Pokémon.
     * @param {Object} pokemon - The Pokémon data.
     */
    updateCatchInfo(pokemon) {
        if (pokemon.site && pokemon.caughtAt) {
            this.elements.caught_site.textContent = `Caught on ${pokemon.site}`;
            this.elements.caught_date.textContent = new Date(pokemon.caughtAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    setButtonState(button, disabled, text) {
        if (button) {
            button.disabled = disabled;
            if (text) {
                button.textContent = text;
            }
        }
    }

    /**
     * Updates the evolution section based on evolution availability.
     * @param {boolean} canEvolve - Whether the Pokemon can evolve.
     * @param {Object} evolutionInfo - Evolution information.
     * @param {number} candyCount - Current candy count.
     */
    updateEvolutionSection(canEvolve, evolutionInfo = null, candyCount = 0) {
        const evolveSection = document.querySelector('.evolve-section');
        const evolveBtn = this.elements.evolve_btn;
        const evolveCostElement = document.getElementById('evolve-cost');

        if (!canEvolve) {
            // Hide the entire evolution section for Pokemon that can't evolve
            if (evolveSection) {
                evolveSection.style.display = 'none';
            }
            return;
        }

        // Show evolution section and update content
        if (evolveSection) {
            evolveSection.style.display = 'block';
        }

        if (evolveBtn && evolutionInfo) {
            const hasEnoughCandy = candyCount >= evolutionInfo.candyCost;
            
            // Keep button text as just "EVOLVE"
            evolveBtn.textContent = 'EVOLVE';
            
            // Enable/disable button based on candy availability
            this.setButtonState(evolveBtn, !hasEnoughCandy);
            
            // Update button styling based on availability
            if (hasEnoughCandy) {
                evolveBtn.classList.remove('disabled');
                evolveBtn.style.opacity = '1';
            } else {
                evolveBtn.classList.add('disabled');
                evolveBtn.style.opacity = '0.6';
            }
        }

        // Update cost display
        if (evolveCostElement && evolutionInfo) {
            const candyNeeded = Math.max(0, evolutionInfo.candyCost - candyCount);
            if (candyNeeded > 0) {
                evolveCostElement.textContent = `${candyNeeded} more candy needed`;
                evolveCostElement.style.color = '#ff6b6b';
            } else {
                evolveCostElement.textContent = `Costs ${evolutionInfo.candyCost} candy`;
                evolveCostElement.style.color = '#4CAF50';
            }
        }
    }

    /**
     * Updates the UI after a successful evolution.
     * @param {Object} evolvedPokemon - The evolved Pokemon data.
     * @param {Object} pokemonData - The API data for the evolved Pokemon.
     */
    updateAfterEvolution(evolvedPokemon, pokemonData) {
        // Update basic info
        const name = evolvedPokemon.name ? Utils.capitalizeFirst(evolvedPokemon.name) : 'Unknown';
        this.elements.pokemon_name.textContent = evolvedPokemon.shiny ? `${name} ⭐` : name;
        this.elements.pokemon_id.textContent = `#${String(evolvedPokemon.id).padStart(3, '0')}`;
        
        // Update sprite
        this.updateSprite(evolvedPokemon, evolvedPokemon.shiny);
        
        // Update types and other data if available
        if (pokemonData) {
            this.updateTypes(pokemonData);
            this.updateTypesLabel(pokemonData);
            this.updatePhysicalStats(pokemonData);
        }
    }

    /**
     * Shows an evolution success message.
     * @param {string} fromName - Original Pokemon name.
     * @param {string} toName - Evolved Pokemon name.
     */
    showEvolutionSuccess(fromName, toName) {
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
    }
}
