// Simplified list of Pokémon with their rarity.
const POKEMON_LIST = [
  { id: 1, name: "Bulbasaur", rarity: "common" },
  { id: 4, name: "Charmander", rarity: "common" },
  { id: 7, name: "Squirtle", rarity: "common" },
  { id: 25, name: "Pikachu", rarity: "uncommon" },
  { id: 39, name: "Jigglypuff", rarity: "uncommon" },
  { id: 104, name: "Cubone", rarity: "uncommon" },
  { id: 131, name: "Lapras", rarity: "rare" },
  { id: 144, name: "Articuno", rarity: "legendary" },
  { id: 150, name: "Mewtwo", rarity: "legendary" }
];

// Encounter rates for each Pokémon rarity.
const ENCOUNTER_RATES = {
  common: 0.15,
  uncommon: 0.08,
  rare: 0.03,
  legendary: 0.01
};

/**
 * Determines whether to show a Pokémon encounter.
 * @returns {boolean} - True if an encounter should be shown, false otherwise.
 */
function shouldShowEncounter() {
  return true; // 20% base chance of any encounter per page load
}

/**
 * Selects a random Pokémon based on rarity.
 * @returns {Object} - The selected Pokémon.
 */
function selectRandomPokemon() {
  const availablePokemon = POKEMON_LIST.filter(p => Math.random() < ENCOUNTER_RATES[p.rarity]);
  
  if (availablePokemon.length === 0) {
    const commonPokemon = POKEMON_LIST.filter(p => p.rarity === 'common');
    return commonPokemon[Math.floor(Math.random() * commonPokemon.length)];
  }
  
  return availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
}

/**
 * Creates and displays the encounter popup.
 * @param {Object} pokemon - The Pokémon to be displayed.
 */
function createEncounterPopup(pokemon) {
  const popup = document.createElement('div');
  popup.id = 'pokebrowser-encounter';
  popup.innerHTML = `
    <div class="encounter-content">
      <div class="pokemon-sprite">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" 
             alt="${pokemon.name}" onerror="this.style.display='none'">
      </div>
      <div class="button-container">
        <button id="catch-pokemon">Catch Pokemon!</button>
        <button id="run-away">Run Away</button>
      </div>
    </div>
    <h3>A wild ${pokemon.name} appeared!</h3>
  `;
  
  document.body.appendChild(popup);
  
  document.getElementById('catch-pokemon').addEventListener('click', () => catchPokemon(pokemon));
  document.getElementById('run-away').addEventListener('click', closePokemonEncounter);
}

/**
 * Catches the Pokémon and saves it to local storage.
 * @param {Object} pokemon - The Pokémon to be caught.
 */
async function catchPokemon(pokemon) {
  try {
    const result = await chrome.storage.local.get(['pokemonCollection']);
    const collection = result.pokemonCollection || [];
    
    const caughtPokemon = { ...pokemon, caughtAt: new Date().toISOString(), site: window.location.hostname };
    collection.push(caughtPokemon);
    
    await chrome.storage.local.set({ pokemonCollection: collection });
    showCatchSuccess(pokemon);
  } catch (error) {
    console.error('Error catching Pokemon:', error);
  }
}

/**
 * Displays a success message after catching a Pokémon.
 * @param {Object} pokemon - The caught Pokémon.
 */
function showCatchSuccess(pokemon) {
  const popup = document.getElementById('pokebrowser-encounter');
  popup.innerHTML = `
    <div class="success-message">
      <div class="pokeball-icon">⚪</div>
      <h3>Gotcha!</h3>
      <p>${pokemon.name} was caught!</p>
      <div class="close-instruction">Click anywhere to close</div>
    </div>
  `;
  
  const clickHandler = (e) => {
    if (!popup.contains(e.target)) {
      closePokemonEncounter();
      document.removeEventListener('click', clickHandler);
    }
  };
  
  setTimeout(() => document.addEventListener('click', clickHandler), 100);
  setTimeout(closePokemonEncounter, 3000);
}

/**
 * Closes the encounter popup.
 */
function closePokemonEncounter() {
  const popup = document.getElementById('pokebrowser-encounter');
  if (popup) popup.remove();
}

/**
 * Initializes the Pokémon encounter check.
 */
function initializePokebrowser() {
  if (window.location.protocol.startsWith('chrome')) return;
  
  setTimeout(() => {
    if (shouldShowEncounter()) {
      const pokemon = selectRandomPokemon();
      createEncounterPopup(pokemon);
    }
  }, 2000);
}

// Initializes the extension when the page loads.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePokebrowser);
} else {
  initializePokebrowser();
}
