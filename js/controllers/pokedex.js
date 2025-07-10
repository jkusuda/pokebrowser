import { PokemonService } from '../services/PokemonService.js';
import { Utils } from '../utils/Utils.js';

class PokedexApp {
    constructor() {
        this.service = new PokemonService();
        this.elements = {
            grid: document.getElementById('pokedex-grid'),
            search: document.getElementById('pokedex-search'),
            sort: document.getElementById('pokedex-sort'),
            total: document.getElementById('pokedex-total'),
            unique: document.getElementById('pokedex-unique'),
            completion: document.getElementById('pokedex-completion'),
            template: document.getElementById('pokedex-entry-template'),
        };
    }

    async init() {
        await this.service.loadPokedex();
        this.render();
        this.setupEventListeners();
    }

    render() {
        const query = this.elements.search.value;
        const sortBy = this.elements.sort.value;
        const pokemonList = this.service.filterAndSort(query, sortBy);
        this.renderGrid(pokemonList);

        const stats = this.service.getStats();
        this.updateStats(stats.total, stats.unique, stats.completion);
    }

    renderGrid(pokemonList) {
        this.elements.grid.innerHTML = '';
        pokemonList.forEach(pokemon => {
            const entry = this.createEntry(pokemon);
            this.elements.grid.appendChild(entry);
        });
    }

    createEntry(pokemon) {
        const template = this.elements.template.content.cloneNode(true);
        const entry = template.querySelector('.pokedex-entry');
        const sprite = entry.querySelector('.pokedex-sprite');
        const id = entry.querySelector('.pokedex-id');
        const name = entry.querySelector('.pokedex-name');
        const candyCount = entry.querySelector('.candy-count');
        const candyContainer = entry.querySelector('.pokedex-candy');

        sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        sprite.alt = pokemon.name;
        id.textContent = `#${String(pokemon.id).padStart(3, '0')}`;

        // Show as "caught" if ever owned (including previously owned)
        if (pokemon.everOwned) {
            entry.classList.add('caught');
            sprite.style.filter = 'none';
            name.textContent = Utils.capitalizeFirst(pokemon.name);
            
            // Display candy count for all ever-owned Pokemon (default to 0 if not provided)
            const candyAmount = pokemon.candyCount || 0;
            candyCount.textContent = candyAmount;
            candyContainer.style.display = 'flex';
            
            // Allow clicking to view details for all ever-owned Pokemon
            entry.addEventListener('click', () => {
                const width = 400;
                const height = 600;
                const left = (screen.width / 2) - (width / 2);
                const top = (screen.height / 2) - (height / 2);
                chrome.windows.create({
                    url: `pokemon-entry.html?id=${pokemon.id}`,
                    type: 'popup',
                    width,
                    height,
                    left,
                    top
                });
            });
        } else {
            entry.classList.add('uncaught');
            sprite.style.filter = 'brightness(0)';
            name.textContent = '???';
            candyContainer.style.display = 'none'; // Hide candy for never-owned Pokemon
        }

        return entry;
    }

    updateStats(total, unique, completion) {
        this.elements.total.textContent = total;
        this.elements.unique.textContent = unique;
        this.elements.completion.textContent = `${completion}%`;
    }

    setupEventListeners() {
        this.elements.search.addEventListener('input', () => this.render());
        this.elements.sort.addEventListener('change', () => this.render());
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
