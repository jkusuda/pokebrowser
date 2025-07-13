import { EVOLUTION_DATA, CANDY_FAMILY_MAP, POKEMON_NAMES } from '../shared/evolution-data.js';
import { StorageService } from './StorageService.js';
import { SecurityValidator } from '../utils/SecurityValidator.js';

/**
 * Evolution service that handles Pokemon evolution logic
 */
export class EvolutionService {
    constructor(appState) {
        this.appState = appState;
    }

    /**
     * Check if a Pokemon can evolve
     */
    canEvolve(pokemonId) {
        const id = parseInt(pokemonId);
        return EVOLUTION_DATA.hasOwnProperty(id);
    }

    /**
     * Get evolution information for a Pokemon
     */
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

    /**
     * Get the base candy ID for a Pokemon (what candy type it uses)
     */
    getBaseCandyId(pokemonId) {
        const id = parseInt(pokemonId);
        return CANDY_FAMILY_MAP[id] || id;
    }

    /**
     * Get the base candy name for a Pokemon
     */
    getBaseCandyName(pokemonId) {
        const baseCandyId = this.getBaseCandyId(pokemonId);
        const pokemonName = POKEMON_NAMES[baseCandyId];
        return pokemonName ? `${pokemonName}` : 'Unknown';
    }

    /**
     * Validate evolution requirements using base candy
     */
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

    /**
     * Evolve a Pokemon
     */
    async evolvePokemon(pokemon, currentCandy) {
        try {
            const pokemonId = parseInt(pokemon.id || pokemon.pokemon_id);
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
                id: evolutionInfo.evolvesTo,
                pokemon_id: evolutionInfo.evolvesTo,
                name: evolutionInfo.name.toLowerCase(),
                evolvedAt: new Date().toISOString(),
                evolvedFrom: pokemonId
            };

            // Update in storage
            const collection = await StorageService.getPokemonCollection();
            const pokemonIndex = collection.findIndex(p =>
                p.id.toString() === pokemon.id.toString() &&
                p.caughtAt === pokemon.caughtAt &&
                p.site === pokemon.site
            );

            if (pokemonIndex === -1) {
                throw new Error('Pokemon not found in collection');
            }

            // Replace the old Pokemon with the evolved one
            collection[pokemonIndex] = evolvedPokemon;
            await chrome.storage.local.set({ pokemonCollection: collection });

            // Update cloud storage if syncing is available
            if (this.appState.canSync()) {
                try {
                    // Delete old Pokemon from cloud
                    await this.appState.supabase
                        .from('pokemon')
                        .eq('user_id', this.appState.currentUser.id)
                        .eq('pokemon_id', pokemonId)
                        .eq('site_caught', pokemon.site)
                        .eq('caught_at', pokemon.caughtAt)
                        .delete();

                    // Add evolved Pokemon to cloud
                    const { error } = await this.appState.supabase
                        .from('pokemon')
                        .insert({
                            user_id: this.appState.currentUser.id,
                            pokemon_id: evolvedPokemon.id,
                            name: evolvedPokemon.name,
                            site_caught: evolvedPokemon.site,
                            caught_at: evolvedPokemon.caughtAt,
                            is_shiny: evolvedPokemon.shiny || false,
                            evolved_at: evolvedPokemon.evolvedAt,
                            evolved_from: evolvedPokemon.evolvedFrom
                        });

                    if (error) {
                        console.warn('Error updating cloud storage after evolution:', error);
                    }
                } catch (cloudError) {
                    console.warn('Error with cloud sync during evolution:', cloudError);
                    // Don't fail the evolution if cloud sync fails
                }
            }

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
