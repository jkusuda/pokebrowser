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
        
        // Refresh candy data when page becomes visible (e.g., after catching Pokemon)
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                console.log('Page became visible, refreshing candy data...');
                await this.refreshCandyData();
            }
        });
        
        // Also refresh when window gains focus
        window.addEventListener('focus', async () => {
            console.log('Window gained focus, refreshing candy data...');
            await this.refreshCandyData();
        });
    }

    async refreshCandyData() {
        try {
            console.log('🔄 Pokedex: Refreshing candy and history data...');
            await this.service.refreshAllData();
            this.render(); // Re-render with updated candy counts and history
            console.log('✅ Pokedex: Candy and history data refreshed successfully');
        } catch (error) {
            console.error('❌ Pokedex: Error refreshing data:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new PokedexApp();
    app.init();
});
