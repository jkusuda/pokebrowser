// POKEMON-DETAIL.JS
// Handles fetching and displaying detailed Pokemon information

// Cache for Pokemon data to avoid repeated API calls
const pokemonCache = new Map();

// DOM elements
const elements = {
    loading: document.getElementById('loading-state'),
    error: document.getElementById('error-state'),
    details: document.getElementById('pokemon-details'),
    name: document.getElementById('pokemon-name'),
    id: document.getElementById('pokemon-id'),
    sprite: document.getElementById('pokemon-sprite'),
    types: document.getElementById('pokemon-types'),
    stats: document.getElementById('pokemon-stats'),
    abilities: document.getElementById('pokemon-abilities'),
    pokedexEntry: document.getElementById('pokedex-entry'),
    catchDetails: document.getElementById('catch-details')
};

// Stat display names mapping
const STAT_NAMES = {
    'hp': 'HP',
    'attack': 'Attack',
    'defense': 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    'speed': 'Speed'
};

// Tab switching function for info panel
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.info-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.info-content > div').forEach(content => content.style.display = 'none');
    
    // Add active class to clicked tab
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        document.getElementById(tabName + '-content').style.display = 'block';
    }
}

// Initialize the page
async function initializePage() {
    try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const pokemonId = urlParams.get('id');
        const pokemonName = urlParams.get('name');
        const caughtAt = urlParams.get('caughtAt');
        const site = urlParams.get('site');

        if (!pokemonId) {
            throw new Error('No Pokemon ID provided');
        }

        // Set basic info immediately
        if (pokemonName) {
            elements.name.textContent = capitalizeFirst(pokemonName);
        }
        elements.id.textContent = `#${pokemonId.toString().padStart(3, '0')}`;

        // Set catch details
        if (caughtAt && site) {
            const catchDate = new Date(caughtAt).toLocaleDateString();
            elements.catchDetails.innerHTML = `
                Caught on <strong>${site}</strong><br>
                ${catchDate}
            `;
        }

        // Fetch and display Pokemon data
        await fetchAndDisplayPokemon(pokemonId);

    } catch (error) {
        console.error('Error initializing page:', error);
        showError();
    }
}

// Fetch Pokemon data from PokeAPI
async function fetchPokemonData(pokemonId) {
    // Check cache first
    if (pokemonCache.has(pokemonId)) {
        return pokemonCache.get(pokemonId);
    }

    try {
        // Fetch basic Pokemon data
        const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        if (!pokemonResponse.ok) {
            throw new Error(`Pokemon not found: ${pokemonResponse.status}`);
        }
        const pokemonData = await pokemonResponse.json();

        // Fetch species data for Pokedex entry
        const speciesResponse = await fetch(pokemonData.species.url);
        if (!speciesResponse.ok) {
            throw new Error(`Species data not found: ${speciesResponse.status}`);
        }
        const speciesData = await speciesResponse.json();

        // Combine data
        const combinedData = {
            ...pokemonData,
            species: speciesData
        };

        // Cache the result
        pokemonCache.set(pokemonId, combinedData);
        return combinedData;

    } catch (error) {
        console.error('Error fetching Pokemon data:', error);
        throw error;
    }
}

// Fetch and display all Pokemon information
async function fetchAndDisplayPokemon(pokemonId) {
    try {
        showLoading();

        const pokemonData = await fetchPokemonData(pokemonId);

        // Update all sections
        updateBasicInfo(pokemonData);
        updateSprite(pokemonData);
        updateTypes(pokemonData);
        updateStats(pokemonData);
        updateAbilities(pokemonData);
        updatePokedexEntry(pokemonData);

        showDetails();

    } catch (error) {
        console.error('Error displaying Pokemon:', error);
        showError();
    }
}

// Update basic Pokemon information
function updateBasicInfo(pokemonData) {
    elements.name.textContent = capitalizeFirst(pokemonData.name);
    elements.id.textContent = `#${pokemonData.id.toString().padStart(3, '0')}`;
}

// Update Pokemon sprite
function updateSprite(pokemonData) {
    const spriteUrl = pokemonData.sprites.other?.['showdown']?.front_default ||
                        pokemonData.sprites.front_default ||
                        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.id}.png`;
    
    elements.sprite.src = spriteUrl;
    elements.sprite.alt = pokemonData.name;
    
    // Add error handling for sprite
    elements.sprite.onerror = () => {
        elements.sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.id}.png`;
    };
}

// Update Pokemon types
function updateTypes(pokemonData) {
    elements.types.innerHTML = pokemonData.types.map(typeInfo => {
        const typeName = typeInfo.type.name;
        return `<span class="type-badge type-${typeName}">${capitalizeFirst(typeName)}</span>`;
    }).join('');
}

// Update Pokemon stats
function updateStats(pokemonData) {
    elements.stats.innerHTML = pokemonData.stats.map(statInfo => {
        const statName = STAT_NAMES[statInfo.stat.name] || capitalizeFirst(statInfo.stat.name);
        return `
            <div class="stat-item">
                <div class="stat-name">${statName}</div>
                <div class="stat-value">${statInfo.base_stat}</div>
            </div>
        `;
    }).join('');
}

// Update Pokemon abilities
function updateAbilities(pokemonData) {
    elements.abilities.innerHTML = pokemonData.abilities.map(abilityInfo => {
        const abilityName = abilityInfo.ability.name.replace('-', ' ');
        const isHidden = abilityInfo.is_hidden ? ' (Hidden)' : '';
        return `<span class="ability-tag">${capitalizeFirst(abilityName)}${isHidden}</span>`;
    }).join('');
}

// Update Pokedex entry
function updatePokedexEntry(pokemonData) {
    // Find English flavor text
    const englishEntries = pokemonData.species.flavor_text_entries.filter(
        entry => entry.language.name === 'en'
    );

    if (englishEntries.length > 0) {
        // Get the most recent entry (usually the best one)
        const entry = englishEntries[englishEntries.length - 1];
        const cleanText = entry.flavor_text.replace(/\f|\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
        elements.pokedexEntry.textContent = cleanText;
    } else {
        elements.pokedexEntry.textContent = 'No Pokedex entry available.';
    }
}

// Show loading state
function showLoading() {
    elements.loading.style.display = 'block';
    elements.error.style.display = 'none';
    elements.details.style.display = 'none';
}

// Show error state
function showError() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'block';
    elements.details.style.display = 'none';
}

// Show details state
function showDetails() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';
    elements.details.style.display = 'block';
}

// Utility function to capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the page
    initializePage();

    // Set up tab switching
    document.querySelectorAll('.info-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Add interactive feedback for control buttons
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 100);
        });
    });
});

// Handle window focus for better user experience
window.addEventListener('focus', () => {
    // Optional: refresh data when window gains focus
    // This could be useful if you want to ensure data is always current
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showError();
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError();
});
