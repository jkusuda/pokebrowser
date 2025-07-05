// List of Pokemon
// TODO: Probably move this because it will get big
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

// Determines whether to show a Pokémon encounter.
function shouldShowEncounter() {
  return true; // always encounter rn
}

// Selects a random Pokémon based on rarity.
function selectRandomPokemon() {
  const availablePokemon = POKEMON_LIST.filter(p => Math.random() < ENCOUNTER_RATES[p.rarity]);
  
  if (availablePokemon.length === 0) {
    const commonPokemon = POKEMON_LIST.filter(p => p.rarity === 'common');
    return commonPokemon[Math.floor(Math.random() * commonPokemon.length)];
  }
  
  return availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
}

// Creates and displays the encounter popup.
function createEncounterPopup(pokemon) {
  const popup = document.createElement('div');
  popup.id = 'pokebrowser-encounter';
  popup.innerHTML = `
    <div class="encounter-content">
      <div class="grass-platform">
        <div class="pokemon-sprite">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemon.id}.gif" 
               alt="${pokemon.name}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png'">
        </div>
      </div>
      <div class="encounter-text">
        <h3>A wild ${pokemon.name} appeared!</h3>
      </div>
      <div class="button-container">
        <button id="catch-pokemon">Catch</button>
        <button id="run-away">Run</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  const grassPlatform = popup.querySelector('.grass-platform');
  const grassImageUrl = getExtensionURL('grass-platform.webp');
  if (grassImageUrl) {
    grassPlatform.style.backgroundImage = `url('${grassImageUrl}')`;
  }
  
  document.getElementById('catch-pokemon').addEventListener('click', () => catchPokemon(pokemon));
  document.getElementById('run-away').addEventListener('click', closePokemonEncounter);
}

// Catches the Pokémon with pokeball animation.
async function catchPokemon(pokemon) {
  startCatchAnimation(pokemon);
}

// Saves the caught Pokémon and shows success message.
async function savePokemonAndShowSuccess(pokemon) {
  try {
    // Safety check for chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['pokemonCollection']);
      const collection = result.pokemonCollection || [];
      
      const caughtPokemon = { ...pokemon, caughtAt: new Date().toISOString(), site: window.location.hostname };
      collection.push(caughtPokemon);
      
      await chrome.storage.local.set({ pokemonCollection: collection });
    } else {
      console.warn('chrome.storage not available. Skipping save.');
    }
    showCatchSuccess(pokemon);
  } catch (error) {
    console.error('Error catching Pokemon:', error);
    showCatchSuccess(pokemon); // Show success anyway for demo
  }
}

// Displays a success message after catching a Pokémon.
function showCatchSuccess(pokemon) {
  const popup = document.getElementById('pokebrowser-encounter');
  
  // Only replace the encounter text and button container, keep the grass platform
  const encounterText = popup.querySelector('.encounter-text');
  const buttonContainer = popup.querySelector('.button-container');
  
  if (encounterText) {
    encounterText.innerHTML = `
      <h3>Gotcha! ${pokemon.name} was caught!</h3>
      <div class="close-instruction">Click anywhere to close</div>
    `;
  }
  
  if (buttonContainer) {
    buttonContainer.style.display = 'none';
  }
  
  const clickHandler = (e) => {
    if (!popup.contains(e.target)) {
      closePokemonEncounter();
      document.removeEventListener('click', clickHandler);
    }
  };
  
  setTimeout(() => document.addEventListener('click', clickHandler), 100);
  setTimeout(closePokemonEncounter, 5000); // 5 second delay before close
}

// Closes the encounter popup.
function closePokemonEncounter() {
  const popup = document.getElementById('pokebrowser-encounter');
  if (popup) popup.remove();
}

/**
 * Safely gets a URL for a resource within the extension.
 * @param {string} resourcePath - The path to the resource.
 * @returns {string|null} - The full URL or null if the API is unavailable.
 */
function getExtensionURL(resourcePath) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(resourcePath);
  }
  console.warn(`chrome.runtime.getURL not available for resource: ${resourcePath}`);
  return null;
}

// Initializes the Pokémon encounter check.
function initializePokebrowser() {
  if (window.location.protocol.startsWith('chrome')) return;

  // Inject the CSS
  const updatedCSS = `
  /* Throw movement animation - adjusted for scaled pokeball */
  @keyframes throwPokeball {
    0% {
      transform: scale(1.5) translate(0, 0) rotate(0deg);
    }
    33% {
      transform: scale(1.5) translate(50px, -40px) rotate(120deg);
    }
    66% {
      transform: scale(1.5) translate(60px, -50px) rotate(240deg);
    }
    100% {
      transform: scale(1.5) translate(70px, -40px) rotate(360deg);
    }
  }
  `;
  const style = document.createElement('style');
  style.textContent = updatedCSS;
  document.head.appendChild(style);
  
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
