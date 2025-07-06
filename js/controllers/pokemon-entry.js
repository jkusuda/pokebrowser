import { PokemonEntryDOMManager } from '../dom/PokemonEntryDOMManager.js';
import { APIService } from '../services/ApiService.js';
import { Utils } from '../utils/Utils.js';

class PokemonEntryApp {
    constructor() {
        this.dom = new PokemonEntryDOMManager();
        this.cache = new Map();
    }

    async init() {
        this.dom.setViewState('loading');
        try {
            const params = Utils.parseURLParams();
            const pokemonId = params.id;

            if (!pokemonId) {
                throw new Error('No Pokémon ID provided.');
            }

            const pokemonData = await APIService.fetchPokemonData(pokemonId, this.cache);
            const speciesData = await APIService.fetchSpeciesData(pokemonId, this.cache);

            this.dom.render(pokemonData, speciesData);
            this.dom.setViewState('details');
        } catch (error) {
            console.error('Error initializing Pokémon entry page:', error);
            this.dom.setViewState('error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new PokemonEntryApp();
    app.init();
});
