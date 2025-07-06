import { PokedexDOMManager } from '../dom/PokedexDOMManager.js';
import { PokedexService } from '../services/PokedexService.js';

class PokedexApp {
    constructor() {
        this.dom = new PokedexDOMManager();
        this.service = new PokedexService();
    }

    async init() {
        await this.service.loadPokedex();
        this.render();
        this.setupEventListeners();
    }

    render() {
        const query = this.dom.elements.search.value;
        const sortBy = this.dom.elements.sort.value;
        const pokemonList = this.service.filterAndSort(query, sortBy);
        this.dom.renderGrid(pokemonList);

        const stats = this.service.getStats();
        this.dom.updateStats(stats.total, stats.unique, stats.completion);
    }

    setupEventListeners() {
        this.dom.elements.search.addEventListener('input', () => this.render());
        this.dom.elements.sort.addEventListener('change', () => this.render());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new PokedexApp();
    app.init();
});
