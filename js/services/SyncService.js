import { Utils } from '../utils/Utils.js';
import { StorageService } from './StorageService.js';
import { SecurityValidator } from '../utils/SecurityValidator.js';
import { CONFIG } from '../config.js';

/**
 * Service for handling data synchronization between local storage and the cloud.
 */
export class SyncService {
    /**
     * @param {AppState} appState - The application state.
     */
    constructor(appState) {
        this.state = appState;
        this.syncInProgress = false;
        this.pendingSync = false;
    }

    /**
     * Debounces the synchronization to avoid excessive calls.
     * @param {Array} collection - The Pokémon collection to sync.
     */
    debouncedSync(collection) {
        if (!this.state.canSync()) return;
        if (this.syncInProgress) {
            this.pendingSync = true;
            return;
        }
        this.state.clearSyncTimeout();
        const timeout = setTimeout(() => this.syncToCloud(collection), 1000);
        this.state.setSyncTimeout(timeout);
    }

    /**
     * Performs an immediate synchronization.
     * @param {Array} collection - The Pokémon collection to sync.
     * @returns {Promise<Object>} - The result of the sync operation.
     */
    async immediateSync(collection) {
        if (!this.state.canSync()) return;
        this.state.clearSyncTimeout();
        return await this.syncToCloud(collection, true);
    }

    /**
     * Synchronizes the local collection to the cloud.
     * @param {Array} collection - The Pokémon collection to sync.
     * @param {boolean} force - Whether to force the sync even if the collection is unchanged.
     * @returns {Promise<Object>} - The result of the sync operation.
     */
    async syncToCloud(collection, force = false) {
        if (!this.state.canSync() || (!collection.length && !force)) return;
        if (this.syncInProgress && !force) {
            this.pendingSync = true;
            return;
        }

        this.syncInProgress = true;
        this.pendingSync = false;

        const currentHash = Utils.generateCollectionHash(collection);
        if (!force && this.state.lastSyncHash === currentHash) {
            this.syncInProgress = false;
            return;
        }

        try {
            const { data: existingPokemon, error } = await this.state.supabase
                .from('pokemon')
                .select('pokemon_id, site_caught, caught_at')
                .eq('user_id', this.state.currentUser.id);
            if (error) throw error;

            const existingKeys = new Set(existingPokemon?.map(p => `${p.pokemon_id}|${p.site_caught}|${new Date(p.caught_at).getTime()}`));
            const newPokemon = collection.filter(p => !existingKeys.has(`${p.id}|${p.site}|${new Date(p.caughtAt).getTime()}`));

            if (newPokemon.length > 0) {
                // Security: Validate batch size and rate limiting
                const securityCheck = await SecurityValidator.validateRequest('sync', newPokemon, this.state.currentUser);
                if (!securityCheck.valid) {
                    throw new Error(`Security validation failed: ${securityCheck.error}`);
                }

                const BATCH_SIZE = Math.min(CONFIG.BATCH_SIZE, CONFIG.MAX_BATCH_SIZE);
                const batchPromises = [];
                for (let i = 0; i < newPokemon.length; i += BATCH_SIZE) {
                    const batch = newPokemon.slice(i, i + BATCH_SIZE).map(p => {
                        // Security: Validate each Pokemon before sync
                        const validation = SecurityValidator.validatePokemonData(p);
                        if (!validation.isValid) {
                            console.warn(`Skipping invalid Pokemon:`, validation.errors);
                            return null;
                        }
                        
                        return SecurityValidator.sanitizeForDatabase({
                            user_id: this.state.currentUser.id,
                            pokemon_id: p.id,
                            name: p.name,
                            species: p.species || p.name,
                            level: p.level,
                            shiny: p.shiny || false,
                            site_caught: p.site,
                            caught_at: p.caughtAt
                        });
                    }).filter(Boolean); // Remove null entries
                    
                    if (batch.length > 0) {
                        batchPromises.push(this.state.supabase.from('pokemon').insert(batch));
                    }
                }
                await Promise.all(batchPromises);
                this.state.setLastSyncHash(currentHash);
                return { synced: newPokemon.length, message: `Synced ${newPokemon.length} new Pokémon` };
            } else {
                this.state.setLastSyncHash(currentHash);
                return { synced: 0, message: 'All Pokémon already synced' };
            }
        } catch (error) {
            console.error('Sync to cloud error:', error);
            throw error;
        } finally {
            this.syncInProgress = false;
            if (this.pendingSync) {
                setTimeout(() => this.syncToCloud(collection), 100);
            }
        }
    }

    /**
     * Synchronizes the local collection from the cloud.
     * @returns {Promise<Object>} - The result of the sync operation.
     */
    async syncFromCloud() {
        if (!this.state.canSync()) return;

        try {
            const { data: cloudPokemon, error } = await this.state.supabase
                .from('pokemon')
                .select('pokemon_id, name, species, level, shiny, site_caught, caught_at')
                .eq('user_id', this.state.currentUser.id)
                .order('caught_at', { ascending: false });
            if (error) throw error;

            const localCollection = await StorageService.getPokemonCollection();
            const cloudCollection = cloudPokemon?.map(p => ({
                id: p.pokemon_id, name: p.name, species: p.species, level: p.level,
                shiny: p.shiny, site: p.site_caught, caughtAt: p.caught_at
            }));

            const mergedCollection = this.mergeCollections(localCollection, cloudCollection);
            if (Utils.generateCollectionHash(localCollection) !== Utils.generateCollectionHash(mergedCollection)) {
                await StorageService.setPokemonCollection(mergedCollection);
                return { merged: true, newCount: mergedCollection.length - localCollection.length, collection: mergedCollection };
            }
            return { merged: false, collection: localCollection };
        } catch (error) {
            console.error('Sync from cloud error:', error);
            throw error;
        }
    }

    /**
     * Merges two collections of Pokémon, avoiding duplicates.
     * @param {Array} local - The local Pokémon collection.
     * @param {Array} cloud - The cloud Pokémon collection.
     * @returns {Array} - The merged collection.
     */
    mergeCollections(local, cloud) {
        const merged = [...local];
        const existingKeys = new Set(local.map(p => `${p.id}|${p.site}|${new Date(p.caughtAt).getTime()}`));
        for (const pokemon of cloud) {
            const key = `${pokemon.id}|${pokemon.site}|${new Date(pokemon.caughtAt).getTime()}`;
            if (!existingKeys.has(key)) {
                merged.push(pokemon);
                existingKeys.add(key);
            }
        }
        return merged.sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt));
    }

    /**
     * Forces an immediate synchronization.
     * @param {Array} collection - The Pokémon collection to sync.
     * @returns {Promise<Object>} - The result of the sync operation.
     */
    async forceSyncNow(collection) {
        console.log('Forcing immediate sync...');
        return await this.syncToCloud(collection, true);
    }
}
