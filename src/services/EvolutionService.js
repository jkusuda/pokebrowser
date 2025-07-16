import { EVOLUTION_DATA, CANDY_FAMILY_MAP, POKEMON_NAMES } from '../shared/evolution-data.js';
import { StorageService } from './StorageService.js';
import { SecurityValidator } from '../utils/SecurityValidator.js';
import { Utils } from '../utils/Utils.js';

// Handles Pokemon evolution logic and candy requirements
export class EvolutionService {
    constructor(appState) {
        this.appState = appState;
    }

    // Check if Pokemon has evolution available
    canEvolve(pokemonId) {
        const id = parseInt(pokemonId);
        return EVOLUTION_DATA.hasOwnProperty(id);
    }

    // Get evolution details for Pokemon
    getEvolutionInfo(pokemonId) {
        const id = parseInt(pokemonId);
        const evolutionData = EVOLUTION_DATA[id];
        
        if (!evolutionData) {
            return null;
        }

        // Handle special case for Eevee (multiple evolutions)
        if (evolutionData.evolutions) {
            // For now, return the first evolution (Vaporeon)
            // In a full implementation, you might want to let the user choose
            return evolutionData.evolutions[0];
        }

        return evolutionData;
    }

    // Get which candy type Pokemon uses for evolution
    getBaseCandyId(pokemonId) {
        const id = parseInt(pokemonId);
        return CANDY_FAMILY_MAP[id] || id;
    }

    // Get display name for Pokemon's candy type
    getBaseCandyName(pokemonId) {
        const baseCandyId = this.getBaseCandyId(pokemonId);
        const pokemonName = POKEMON_NAMES[baseCandyId];
        return pokemonName ? `${pokemonName}` : 'Unknown';
    }

    // Check if user has enough candy to evolve Pokemon
    validateEvolutionWithBaseCandy(pokemonId, currentCandy) {
        const evolutionInfo = this.getEvolutionInfo(pokemonId);
        
        if (!evolutionInfo) {
            return { success: false, message: 'This Pokemon cannot evolve!' };
        }

        if (currentCandy < evolutionInfo.candyCost) {
            const baseCandyName = this.getBaseCandyName(pokemonId);
            return { 
                success: false, 
                message: `Not enough candy! Need ${evolutionInfo.candyCost} ${baseCandyName} candy, but you only have ${currentCandy}.` 
            };
        }

        return { success: true };
    }

    // Transform Pokemon into its evolved form
    async evolvePokemon(pokemon, currentCandy) {
        try {
            const pokemonId = parseInt(pokemon.pokemon_id);
            const evolutionInfo = this.getEvolutionInfo(pokemonId);
            
            if (!evolutionInfo) {
                throw new Error('This Pokemon cannot evolve!');
            }

            // Validate evolution requirements
            const validation = this.validateEvolutionWithBaseCandy(pokemonId, currentCandy);
            if (!validation.success) {
                throw new Error(validation.message);
            }

            // Security validation
            const securityCheck = await SecurityValidator.validateRequest('evolve_pokemon', {
                pokemon,
                evolutionInfo,
                currentCandy
            }, this.appState.currentUser);

            if (!securityCheck.valid) {
                throw new Error(`Security validation failed: ${securityCheck.error}`);
            }

            // Create evolved Pokemon
            const evolvedPokemon = {
                ...pokemon,
                pokemon_id: evolutionInfo.evolvesTo,
                name: evolutionInfo.name.toLowerCase(),
                evolved_at: new Date().toISOString(),
                evolved_from: pokemonId
            };

            // Check if user is logged in - evolution requires authentication
            if (!this.appState.canSync()) {
                throw new Error('You must be logged in to evolve Pokemon!');
            }

            // Validate that we have a valid Pokemon object with required fields
            if (!pokemon.id) {
                throw new Error('Invalid Pokemon object: missing primary key (id)');
            }

            if (!pokemon.user_id || pokemon.user_id !== this.appState.currentUser.id) {
                throw new Error('Pokemon does not belong to the current user');
            }

            console.log('✅ Evolving Pokemon from Supabase:', pokemon);

            // Update Pokemon in Supabase database using primary key (much more reliable)
            const { error: updateError } = await this.appState.supabase
                .from('pokemon')
                .update({
                    pokemon_id: evolvedPokemon.pokemon_id,
                    name: evolvedPokemon.name,
                    evolved_at: evolvedPokemon.evolved_at,
                    evolved_from: evolvedPokemon.evolved_from
                })
                .eq('id', pokemon.id); // Use the primary key from the pokemon object

            if (updateError) {
                console.error('❌ Error updating Pokemon in Supabase:', updateError);
                throw new Error('Failed to update Pokemon in database');
            }

            console.log('✅ Pokemon successfully evolved in Supabase');

            // Send message to background script for candy deduction
            if (chrome.runtime && chrome.runtime.sendMessage) {
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'POKEMON_EVOLVED',
                        data: { 
                            pokemon: evolvedPokemon,
                            candyCost: evolutionInfo.candyCost,
                            baseCandyId: this.getBaseCandyId(pokemonId)
                        }
                    });
                    
                    if (response && response.success) {
                        console.log('✅ Evolution message sent successfully - Candy deducted!');
                    }
                } catch (candyError) {
                    console.error('❌ Error sending evolution message:', candyError);
                    // Don't fail the evolution if candy message fails
                }
            }

            return { success: true, evolvedPokemon };

        } catch (error) {
            console.error('Error evolving Pokemon:', error);
            return { success: false, error: error.message };
        }
    }
}
