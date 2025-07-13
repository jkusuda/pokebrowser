import { Utils } from '../utils/Utils.js';
import { StorageService } from './StorageService.js';

// Handles syncing Pokemon data between local storage and cloud database
export class SyncService {
    constructor(appState) {
        this.state = appState;
        this.syncInProgress = false;
    }

    // Sync collection to cloud immediately without delay
    async immediateSync(collection) {
        if (!this.state.canSync()) return;
        return await this.syncToCloud(collection);
    }

    // Upload local Pokemon collection to Supabase database
    async syncToCloud(collection) {
        if (!this.state.canSync() || !collection.length) return;
        if (this.syncInProgress) return;

        this.syncInProgress = true;

        try {
            console.log('🔄 Starting sync to cloud for', collection.length, 'Pokemon');
            
            const { data: existingPokemon, error } = await this.state.supabase
                .from('pokemon')
                .select('pokemon_id, site_caught, caught_at')
                .eq('user_id', this.state.currentUser.id);
            if (error) throw error;

            const existingKeys = new Set(existingPokemon?.map(p => `${p.pokemon_id}|${p.site_caught}|${new Date(p.caught_at).getTime()}`));
            const newPokemon = collection.filter(p => !existingKeys.has(`${p.id}|${p.site}|${new Date(p.caughtAt).getTime()}`));

            if (newPokemon.length > 0) {
                console.log('📤 Syncing', newPokemon.length, 'new Pokemon to cloud');
                
                const pokemonToInsert = newPokemon.map(p => ({
                    user_id: this.state.currentUser.id,
                    pokemon_id: p.id,
                    name: p.name,
                    species: p.species || p.name,
                    level: p.level,
                    shiny: p.shiny || false,
                    site_caught: p.site,
                    caught_at: p.caughtAt
                }));

                const { error: insertError } = await this.state.supabase.from('pokemon').insert(pokemonToInsert);
                if (insertError) throw insertError;

                // Also sync to pokemon_history table
                const uniquePokemonIds = [...new Set(newPokemon.map(p => p.id))];
                const historyRecords = uniquePokemonIds.map(pokemonId => ({
                    user_id: this.state.currentUser.id,
                    pokemon_id: pokemonId
                }));

                const { error: historyError } = await this.state.supabase
                    .from('pokemon_history')
                    .upsert(historyRecords, {
                        onConflict: 'user_id,pokemon_id'
                    });

                if (historyError) {
                    console.error('❌ Error syncing to pokemon_history:', historyError);
                    // Don't fail the entire sync if history fails
                }

                console.log('✅ Successfully synced Pokemon and history to cloud');
                return { synced: newPokemon.length, message: `Synced ${newPokemon.length} new Pokémon` };
            } else {
                console.log('✅ All Pokemon already synced');
                return { synced: 0, message: 'All Pokémon already synced' };
            }
        } catch (error) {
            console.error('Sync to cloud error:', error);
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }
}
