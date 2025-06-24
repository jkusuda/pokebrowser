// Pokemon data (simplified list - you can expand this)
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

// Encounter rates by rarity
const ENCOUNTER_RATES = {
  common: 0.15,
  uncommon: 0.08,
  rare: 0.03,
  legendary: 0.01
};

// Check if we should show an encounter
function shouldShowEncounter() {
  // 20% base chance of any encounter per page load
  return true;
}

// Select a random Pokemon based on rarity
function selectRandomPokemon() {
  const availablePokemon = [];
  
  POKEMON_LIST.forEach(pokemon => {
    const rate = ENCOUNTER_RATES[pokemon.rarity];
    if (Math.random() < rate) {
      availablePokemon.push(pokemon);
    }
  });
  
  if (availablePokemon.length === 0) {
    // Fallback to a common Pokemon
    const commonPokemon = POKEMON_LIST.filter(p => p.rarity === 'common');
    return commonPokemon[Math.floor(Math.random() * commonPokemon.length)];
  }
  
  return availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
}

// Create encounter popup
function createEncounterPopup(pokemon) {
  const popup = document.createElement('div');
  popup.id = 'pokebrowser-encounter';
  popup.innerHTML = `
    <div class="pokeball-icon">⚪</div>
    <h3>A wild ${pokemon.name} appeared!</h3>
    <div class="pokemon-sprite">
      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" 
           alt="${pokemon.name}" onerror="this.style.display='none'">
    </div>
    <button id="catch-pokemon">Catch Pokemon!</button>
    <button id="run-away">Run Away</button>
  `;
  
  document.body.appendChild(popup);
  
  // Add event listeners for buttons
  document.getElementById('catch-pokemon').addEventListener('click', (e) => {
    catchPokemon(pokemon);
  });
  
  document.getElementById('run-away').addEventListener('click', (e) => {
    closePokemonEncounter();
  });
}

// Catch the Pokemon and save to storage
async function catchPokemon(pokemon) {
  try {
    // Get existing collection
    const result = await chrome.storage.local.get(['pokemonCollection']);
    const collection = result.pokemonCollection || [];
    
    // Add new Pokemon with timestamp
    const caughtPokemon = {
      ...pokemon,
      caughtAt: new Date().toISOString(),
      site: window.location.hostname
    };
    
    collection.push(caughtPokemon);
    
    // Save updated collection
    await chrome.storage.local.set({ pokemonCollection: collection });
    
    // Show success message
    showCatchSuccess(pokemon);
    
  } catch (error) {
    console.error('Error catching Pokemon:', error);
  }
}

// Show catch success message
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
  
  // Add click-anywhere-to-close for success state only
  const clickHandler = (e) => {
    if (!popup.contains(e.target)) {
      closePokemonEncounter();
      document.removeEventListener('click', clickHandler);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', clickHandler);
  }, 100);
  
  setTimeout(() => closePokemonEncounter(), 3000);
}

// Close encounter popup
function closePokemonEncounter() {
  const popup = document.getElementById('pokebrowser-encounter');
  if (popup) {
    popup.remove();
  }
}

// Initialize encounter check
function initializePokebrowser() {
  // Don't show on extension pages or chrome pages
  if (window.location.protocol === 'chrome-extension:' || 
      window.location.protocol === 'chrome:') {
    return;
  }
  
  // Wait a bit after page load, then check for encounter
  setTimeout(() => {
    if (shouldShowEncounter()) {
      const pokemon = selectRandomPokemon();
      createEncounterPopup(pokemon);
    }
  }, 2000);
}

// Start the extension when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePokebrowser);
} else {
  initializePokebrowser();
}
