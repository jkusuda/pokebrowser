import { Utils } from '../utils/Utils.js';

export class PokedexDOMManager {
    constructor() {
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

        sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        sprite.alt = pokemon.name;
        id.textContent = `#${String(pokemon.id).padStart(3, '0')}`;

        if (pokemon.caught) {
            entry.classList.add('caught');
            sprite.style.filter = 'none';
            name.textContent = Utils.capitalizeFirst(pokemon.name);
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
        }

        return entry;
    }

    updateStats(total, unique, completion) {
        this.elements.total.textContent = total;
        this.elements.unique.textContent = unique;
        this.elements.completion.textContent = `${completion}%`;
    }
}
