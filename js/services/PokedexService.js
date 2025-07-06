import { StorageService } from './StorageService.js';
import { APIService } from './ApiService.js';

export class PokedexService {
    constructor() {
        this.allPokemon = [];
        this.userCollection = [];
    }

    async loadPokedex() {
        const [allPokemon, userCollection] = await Promise.all([
            APIService.fetchAllPokemon(151),
            StorageService.getPokemonCollection()
        ]);

        this.allPokemon = allPokemon;
        this.userCollection = userCollection;

        const userCollectionById = new Map(userCollection.map(p => [p.id, p]));

        this.allPokemon = this.allPokemon.map(p => {
            const caughtPokemon = userCollectionById.get(p.id);
            return caughtPokemon ? { ...p, ...caughtPokemon, caught: true } : p;
        });

        return this.allPokemon;
    }

    getStats() {
        const total = this.userCollection.length;
        const unique = new Set(this.userCollection.map(p => p.id)).size;
        const totalPossible = 151;
        const completion = totalPossible > 0 ? ((unique / totalPossible) * 100).toFixed(1) : 0;
        return { total, unique, completion };
    }

    filterAndSort(query, sortBy) {
        let filtered = this.allPokemon;

        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                String(p.id).includes(lowerQuery)
            );
        }

        switch (sortBy) {
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'caughtAt':
                filtered.sort((a, b) => {
                    if (a.caught && !b.caught) return -1;
                    if (!a.caught && b.caught) return 1;
                    if (!a.caught && !b.caught) return a.id - b.id;
                    return new Date(b.caughtAt) - new Date(a.caughtAt);
                });
                break;
            case 'id':
            default:
                filtered.sort((a, b) => a.id - b.id);
                break;
        }

        return filtered;
    }
}
