import { EVOLUTION_DATA, POKEMON_NAMES, CANDY_FAMILY_MAP } from '../data/EvolutionData.js';
import { StorageService } from './StorageService.js';

/**
 * Service for handling Pokemon evolution operations.
 */
export class EvolutionService {
    /**
     * @param {AppState} appState - The application state.
     */
    constructor(appState) {
        this.state = appState;
    }

    /**
     * Checks if a Pokemon can evolve.
     * @param {number} pokemonId - The Pokemon ID to check.
     * @returns {boolean} - True if the Pokemon can evolve.
     */
    canEvolve(pokemonId) {
        return EVOLUTION_DATA.hasOwnProperty(pokemonId);
    }

    /**
     * Gets evolution information for a Pokemon.
     * @param {number} pokemonId - The Pokemon ID.
     * @returns {Object|null} - Evolution info or null if cannot evolve.
     */
    getEvolutionInfo(pokemonId) {
        return EVOLUTION_DATA[pokemonId] || null;
    }

    /**
     * Gets the candy cost for evolving a Pokemon.
     * @param {number} pokemonId - The Pokemon ID.
     * @returns {number} - Candy cost, or 0 if cannot evolve.
     */
    getEvolutionCost(pokemonId) {
        const evolutionInfo = this.getEvolutionInfo(pokemonId);
        return evolutionInfo ? evolutionInfo.candyCost : 0;
    }

    /**
     * Gets the target Pokemon ID that this Pokemon evolves into.
     * @param {number} pokemonId - The Pokemon ID.
     * @returns {number|null} - Target Pokemon ID or null if cannot evolve.
     */
    getEvolutionTarget(pokemonId) {
        const evolutionInfo = this.getEvolutionInfo(pokemonId);
        return evolutionInfo ? evolutionInfo.evolvesTo : null;
    }

    /**
     * Gets the name of the Pokemon this evolves into.
     * @param {number} pokemonId - The Pokemon ID.
     * @returns {string|null} - Evolution target name or null if cannot evolve.
     */
    getEvolutionTargetName(pokemonId) {
        const evolutionInfo = this.getEvolutionInfo(pokemonId);
        return evolutionInfo ? evolutionInfo.name : null;
    }

    /**
     * Validates if evolution is possible with current candy count.
     * @param {number} pokemonId - The Pokemon ID.
     * @param {number} currentCandy - Current candy count.
     * @returns {Object} - Validation result with success flag and message.
     */
    validateEvolution(pokemonId, currentCandy) {
        if (!this.canEvolve(pokemonId)) {
            return {
                success: false,
                message: 'This Pokemon cannot evolve.'
            };
        }

        const cost = this.getEvolutionCost(pokemonId);
        if (currentCandy < cost) {
            return {
                success: false,
                message: `Not enough candy! Need ${cost}, have ${currentCandy}.`
            };
        }

        return {
            success: true,
            message: 'Evolution is possible!'
        };
    }

    /**
     * Evolves a Pokemon by updating its data and handling candy deduction.
     * @param {Object} pokemon - The Pokemon object to evolve.
     * @param {number} currentCandy - Current candy count.
     * @returns {Promise<Object>} - Result with success flag and evolved Pokemon data.
     */
    async evolvePokemon(pokemon, currentCandy) {
        try {
            const pokemonId = parseInt(pokemon.id || pokemon.pokemon_id);
            
            // Validate evolution
            const validation = this.validateEvolution(pokemonId, currentCandy);
            if (!validation.success) {
                return {
                    success: false,
                    error: validation.message
                };
            }

            const evolutionInfo = this.getEvolutionInfo(pokemonId);
            const evolvedPokemonId = evolutionInfo.evolvesTo;
            const candyCost = evolutionInfo.candyCost;

            // Create evolved Pokemon object
            const evolvedPokemon = {
                ...pokemon,
                id: evolvedPokemonId,
                pokemon_id: evolvedPokemonId,
                name: POKEMON_NAMES[evolvedPokemonId] || `Pokemon ${evolvedPokemonId}`
            };

            // Update Pokemon in storage
            const collection = await StorageService.getPokemonCollection();
            const pokemonIndex = collection.findIndex(p => 
                p.id.toString() === pokemon.id.toString() &&
                p.caughtAt === pokemon.caughtAt &&
                p.site === pokemon.site
            );

            if (pokemonIndex === -1) {
                throw new Error('Pokemon not found in collection');
            }

            // Update the Pokemon in the collection
            collection[pokemonIndex] = evolvedPokemon;
            await chrome.storage.local.set({ pokemonCollection: collection });

            // Update in Supabase if user can sync
            if (this.state.canSync()) {
                const { error } = await this.state.supabase
                    .from('pokemon')
                    .eq('user_id', this.state.currentUser.id)
                    .eq('pokemon_id', pokemonId)
                    .eq('site_caught', pokemon.site)
                    .eq('caught_at', pokemon.caughtAt)
                    .update({
                        pokemon_id: evolvedPokemonId
                    });

                if (error) {
                    console.error('Error updating Pokemon in database:', error);
                    // Don't fail the evolution if database update fails
                }
            }

            // Deduct candy through background script using base candy ID (fire-and-forget)
            if (chrome.runtime && chrome.runtime.sendMessage) {
                try {
                    const baseCandyId = this.getBaseCandyId(pokemonId);
                    console.log(`🍬 Sending candy deduction request for base Pokemon ID ${baseCandyId}, cost: ${candyCost}`);
                    
                    chrome.runtime.sendMessage({
                        type: 'POKEMON_EVOLVED',
                        data: { 
                            pokemon: { id: baseCandyId }, // Use base candy ID for deduction
                            candyCost: candyCost
                        }
                    });
                    
                    console.log(`📤 Candy deduction message sent for Pokemon ${baseCandyId}`);
                } catch (candyError) {
                    console.error('Error sending candy deduction message:', candyError);
                    // Don't fail evolution if candy message fails
                }
            }

            return {
                success: true,
                evolvedPokemon: evolvedPokemon,
                candyUsed: candyCost
            };

        } catch (error) {
            console.error('Error evolving Pokemon:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Gets the base candy ID for a Pokemon (what candy type it uses).
     * @param {number} pokemonId - The Pokemon ID.
     * @returns {number} - The base candy ID for this Pokemon's family.
     */
    getBaseCandyId(pokemonId) {
        return CANDY_FAMILY_MAP[pokemonId] || pokemonId;
    }

    /**
     * Gets the base candy Pokemon name for display purposes.
     * @param {number} pokemonId - The Pokemon ID.
     * @returns {string} - The name of the base Pokemon whose candy is used.
     */
    getBaseCandyName(pokemonId) {
        const baseCandyId = this.getBaseCandyId(pokemonId);
        return POKEMON_NAMES[baseCandyId] || `Pokemon ${baseCandyId}`;
    }

    /**
     * Validates evolution using the base candy ID.
     * @param {number} pokemonId - The Pokemon ID.
     * @param {number} currentCandy - Current candy count for the base candy.
     * @returns {Object} - Validation result.
     */
    validateEvolutionWithBaseCandy(pokemonId, currentCandy) {
        if (!this.canEvolve(pokemonId)) {
            return {
                success: false,
                message: 'This Pokemon cannot evolve.'
            };
        }

        const cost = this.getEvolutionCost(pokemonId);
        const baseCandyName = this.getBaseCandyName(pokemonId);
        
        if (currentCandy < cost) {
            return {
                success: false,
                message: `Not enough ${baseCandyName} candy! Need ${cost}, have ${currentCandy}.`
            };
        }

        return {
            success: true,
            message: 'Evolution is possible!'
        };
    }

    /**
     * Gets Pokemon name by ID.
     * @param {number} pokemonId - The Pokemon ID.
     * @returns {string} - Pokemon name.
     */
    getPokemonName(pokemonId) {
        return POKEMON_NAMES[pokemonId] || `Pokemon ${pokemonId}`;
    }
}
