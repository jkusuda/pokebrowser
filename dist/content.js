function startCatchAnimation(pokemon) {
  const popup = document.getElementById("pokebrowser-encounter");
  const pokemonSprite = popup.querySelector(".pokemon-sprite img");
  const buttonContainer = popup.querySelector(".button-container");
  buttonContainer.style.display = "none";
  const pokeball = document.createElement("div");
  pokeball.className = "pokeball";
  pokeball.innerHTML = '<div class="pokeball-sprite"></div>';
  pokeball.style.position = "absolute";
  pokeball.style.width = "64px";
  pokeball.style.height = "64px";
  pokeball.style.bottom = "-32px";
  pokeball.style.left = "-32px";
  pokeball.style.zIndex = "3";
  pokeball.style.opacity = "0";
  pokeball.style.transform = "scale(1.5)";
  pokeball.style.transition = "transform 0.1s ease-out, filter 0.2s ease-out";
  const pokeballSprite = pokeball.querySelector(".pokeball-sprite");
  const pokeballImageUrl = getExtensionURL("pokeball-spritesheet.png");
  if (pokeballImageUrl) {
    pokeballSprite.style.backgroundImage = `url('${pokeballImageUrl}')`;
  }
  pokeballSprite.style.backgroundSize = "1792px 2048px";
  pokeballSprite.style.backgroundRepeat = "no-repeat";
  pokeballSprite.style.imageRendering = "pixelated";
  pokeballSprite.style.width = "100%";
  pokeballSprite.style.height = "100%";
  pokeballSprite.style.backgroundPosition = "0 0";
  const grassPlatform = popup.querySelector(".grass-platform");
  grassPlatform.appendChild(pokeball);
  setTimeout(() => {
    throwPokeballWithFrames(pokeball, pokeballSprite, pokemonSprite, pokemon);
  }, 500);
}
function throwPokeballWithFrames(pokeball, pokeballSprite, pokemonSprite, pokemon) {
  pokeball.style.opacity = "1";
  const throwFrames = [0, -64, -128];
  let currentFrame = 0;
  pokeball.style.animation = "throwPokeball 0.8s ease-out forwards";
  const frameInterval = setInterval(() => {
    pokeballSprite.style.backgroundPosition = `0 ${throwFrames[currentFrame]}px`;
    currentFrame = (currentFrame + 1) % throwFrames.length;
  }, 100);
  setTimeout(() => {
    clearInterval(frameInterval);
    startCatchSequence(pokeball, pokeballSprite, pokemonSprite, pokemon);
  }, 800);
}
function startCatchSequence(pokeball, pokeballSprite, pokemonSprite, pokemon) {
  pokemonSprite.style.opacity = "0";
  const flashFrames = [-192, -256, -320];
  let flashFrame = 0;
  pokeball.style.filter = "brightness(3) drop-shadow(0 0 20px white)";
  const flashInterval = setInterval(() => {
    pokeballSprite.style.backgroundPosition = `0 ${flashFrames[flashFrame]}px`;
    flashFrame++;
    if (flashFrame >= flashFrames.length) {
      clearInterval(flashInterval);
      pokeballSprite.style.backgroundPosition = "0 0px";
      pokeball.style.filter = "brightness(1)";
      setTimeout(() => {
        startShakingAnimation(pokeball, pokeballSprite, pokemon);
      }, 100);
    }
  }, 100);
}
function startShakingAnimation(pokeball, pokeballSprite, pokemon) {
  const shakeFrames = [-960, -1024, -1088, -1152, -1216];
  let shakeCount = 0;
  const maxShakes = 3;
  function performShake() {
    if (shakeCount >= maxShakes) {
      showSuccessParticles(pokeball, pokeballSprite, pokemon);
      return;
    }
    let frameIndex = 0;
    const shakeInterval = setInterval(() => {
      pokeballSprite.style.backgroundPosition = `0 ${shakeFrames[frameIndex]}px`;
      const shakeAmount = 5 + shakeCount * 2;
      const xOffset = Math.sin(frameIndex * 0.5) * shakeAmount;
      const rotation = Math.sin(frameIndex * 0.3) * (5 + shakeCount * 3);
      pokeball.style.transform = `scale(1.5) translate(70px, -40px) rotate(${rotation}deg) translateX(${xOffset}px)`;
      frameIndex++;
      if (frameIndex >= shakeFrames.length) {
        clearInterval(shakeInterval);
        shakeCount++;
        setTimeout(() => {
          performShake();
        }, 200);
      }
    }, 150);
  }
  performShake();
}
function showSuccessParticles(pokeball, pokeballSprite, pokemon) {
  const particleFrames = [-1728, -1792, -1856, -1920, -1984];
  let particleFrame = 0;
  pokeball.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))";
  const particleInterval = setInterval(() => {
    pokeballSprite.style.backgroundPosition = `0 ${particleFrames[particleFrame]}px`;
    particleFrame++;
    if (particleFrame >= particleFrames.length) {
      clearInterval(particleInterval);
      setTimeout(() => {
        savePokemonAndShowSuccess(pokemon);
      }, 500);
    }
  }, 200);
}
const POKEMON_LIST = [
  { id: 1, name: "Bulbasaur", rarity: "common", types: ["grass", "poison"] },
  { id: 2, name: "Ivysaur", rarity: "uncommon", types: ["grass", "poison"] },
  { id: 3, name: "Venusaur", rarity: "rare", types: ["grass", "poison"] },
  { id: 4, name: "Charmander", rarity: "common", types: ["fire"] },
  { id: 5, name: "Charmeleon", rarity: "uncommon", types: ["fire"] },
  { id: 6, name: "Charizard", rarity: "rare", types: ["fire", "flying"] },
  { id: 7, name: "Squirtle", rarity: "common", types: ["water"] },
  { id: 8, name: "Wartortle", rarity: "uncommon", types: ["water"] },
  { id: 9, name: "Blastoise", rarity: "rare", types: ["water"] },
  { id: 10, name: "Caterpie", rarity: "common", types: ["bug"] },
  { id: 11, name: "Metapod", rarity: "common", types: ["bug"] },
  { id: 12, name: "Butterfree", rarity: "uncommon", types: ["bug", "flying"] },
  { id: 13, name: "Weedle", rarity: "common", types: ["bug", "poison"] },
  { id: 14, name: "Kakuna", rarity: "common", types: ["bug", "poison"] },
  { id: 15, name: "Beedrill", rarity: "uncommon", types: ["bug", "poison"] },
  { id: 16, name: "Pidgey", rarity: "common", types: ["normal", "flying"] },
  { id: 17, name: "Pidgeotto", rarity: "uncommon", types: ["normal", "flying"] },
  { id: 18, name: "Pidgeot", rarity: "rare", types: ["normal", "flying"] },
  { id: 19, name: "Rattata", rarity: "common", types: ["normal"] },
  { id: 20, name: "Raticate", rarity: "uncommon", types: ["normal"] },
  { id: 21, name: "Spearow", rarity: "common", types: ["normal", "flying"] },
  { id: 22, name: "Fearow", rarity: "uncommon", types: ["normal", "flying"] },
  { id: 23, name: "Ekans", rarity: "common", types: ["poison"] },
  { id: 24, name: "Arbok", rarity: "uncommon", types: ["poison"] },
  { id: 25, name: "Pikachu", rarity: "uncommon", types: ["electric"] },
  { id: 26, name: "Raichu", rarity: "rare", types: ["electric"] },
  { id: 27, name: "Sandshrew", rarity: "common", types: ["ground"] },
  { id: 28, name: "Sandslash", rarity: "uncommon", types: ["ground"] },
  { id: 29, name: "Nidoran♀", rarity: "common", types: ["poison"] },
  { id: 30, name: "Nidorina", rarity: "uncommon", types: ["poison"] },
  { id: 31, name: "Nidoqueen", rarity: "rare", types: ["poison", "ground"] },
  { id: 32, name: "Nidoran♂", rarity: "common", types: ["poison"] },
  { id: 33, name: "Nidorino", rarity: "uncommon", types: ["poison"] },
  { id: 34, name: "Nidoking", rarity: "rare", types: ["poison", "ground"] },
  { id: 35, name: "Clefairy", rarity: "uncommon", types: ["fairy"] },
  { id: 36, name: "Clefable", rarity: "rare", types: ["fairy"] },
  { id: 37, name: "Vulpix", rarity: "uncommon", types: ["fire"] },
  { id: 38, name: "Ninetales", rarity: "rare", types: ["fire"] },
  { id: 39, name: "Jigglypuff", rarity: "uncommon", types: ["normal", "fairy"] },
  { id: 40, name: "Wigglytuff", rarity: "rare", types: ["normal", "fairy"] },
  { id: 41, name: "Zubat", rarity: "common", types: ["poison", "flying"] },
  { id: 42, name: "Golbat", rarity: "uncommon", types: ["poison", "flying"] },
  { id: 43, name: "Oddish", rarity: "common", types: ["grass", "poison"] },
  { id: 44, name: "Gloom", rarity: "uncommon", types: ["grass", "poison"] },
  { id: 45, name: "Vileplume", rarity: "rare", types: ["grass", "poison"] },
  { id: 46, name: "Paras", rarity: "common", types: ["bug", "grass"] },
  { id: 47, name: "Parasect", rarity: "uncommon", types: ["bug", "grass"] },
  { id: 48, name: "Venonat", rarity: "common", types: ["bug", "poison"] },
  { id: 49, name: "Venomoth", rarity: "uncommon", types: ["bug", "poison"] },
  { id: 50, name: "Diglett", rarity: "common", types: ["ground"] },
  { id: 51, name: "Dugtrio", rarity: "uncommon", types: ["ground"] },
  { id: 52, name: "Meowth", rarity: "common", types: ["normal"] },
  { id: 53, name: "Persian", rarity: "uncommon", types: ["normal"] },
  { id: 54, name: "Psyduck", rarity: "common", types: ["water"] },
  { id: 55, name: "Golduck", rarity: "uncommon", types: ["water"] },
  { id: 56, name: "Mankey", rarity: "common", types: ["fighting"] },
  { id: 57, name: "Primeape", rarity: "uncommon", types: ["fighting"] },
  { id: 58, name: "Growlithe", rarity: "uncommon", types: ["fire"] },
  { id: 59, name: "Arcanine", rarity: "rare", types: ["fire"] },
  { id: 60, name: "Poliwag", rarity: "common", types: ["water"] },
  { id: 61, name: "Poliwhirl", rarity: "uncommon", types: ["water"] },
  { id: 62, name: "Poliwrath", rarity: "rare", types: ["water", "fighting"] },
  { id: 63, name: "Abra", rarity: "uncommon", types: ["psychic"] },
  { id: 64, name: "Kadabra", rarity: "rare", types: ["psychic"] },
  { id: 65, name: "Alakazam", rarity: "rare", types: ["psychic"] },
  { id: 66, name: "Machop", rarity: "common", types: ["fighting"] },
  { id: 67, name: "Machoke", rarity: "uncommon", types: ["fighting"] },
  { id: 68, name: "Machamp", rarity: "rare", types: ["fighting"] },
  { id: 69, name: "Bellsprout", rarity: "common", types: ["grass", "poison"] },
  { id: 70, name: "Weepinbell", rarity: "uncommon", types: ["grass", "poison"] },
  { id: 71, name: "Victreebel", rarity: "rare", types: ["grass", "poison"] },
  { id: 72, name: "Tentacool", rarity: "common", types: ["water", "poison"] },
  { id: 73, name: "Tentacruel", rarity: "uncommon", types: ["water", "poison"] },
  { id: 74, name: "Geodude", rarity: "common", types: ["rock", "ground"] },
  { id: 75, name: "Graveler", rarity: "uncommon", types: ["rock", "ground"] },
  { id: 76, name: "Golem", rarity: "rare", types: ["rock", "ground"] },
  { id: 77, name: "Ponyta", rarity: "uncommon", types: ["fire"] },
  { id: 78, name: "Rapidash", rarity: "rare", types: ["fire"] },
  { id: 79, name: "Slowpoke", rarity: "common", types: ["water", "psychic"] },
  { id: 80, name: "Slowbro", rarity: "uncommon", types: ["water", "psychic"] },
  { id: 81, name: "Magnemite", rarity: "common", types: ["electric", "steel"] },
  { id: 82, name: "Magneton", rarity: "uncommon", types: ["electric", "steel"] },
  { id: 83, e: "afetch'd", rarity: "uncommon", types: ["normal", "flying"] },
  { id: 84, name: "Doduo", rarity: "common", types: ["normal", "flying"] },
  { id: 85, name: "Dodrio", rarity: "uncommon", types: ["normal", "flying"] },
  { id: 86, name: "Seel", rarity: "common", types: ["water"] },
  { id: 87, name: "Dewgong", rarity: "uncommon", types: ["water", "ice"] },
  { id: 88, name: "Grimer", rarity: "common", types: ["poison"] },
  { id: 89, name: "Muk", rarity: "uncommon", types: ["poison"] },
  { id: 90, name: "Shellder", rarity: "common", types: ["water"] },
  { id: 91, name: "Cloyster", rarity: "uncommon", types: ["water", "ice"] },
  { id: 92, name: "Gastly", rarity: "common", types: ["ghost", "poison"] },
  { id: 93, name: "Haunter", rarity: "uncommon", types: ["ghost", "poison"] },
  { id: 94, name: "Gengar", rarity: "rare", types: ["ghost", "poison"] },
  { id: 95, name: "Onix", rarity: "uncommon", types: ["rock", "ground"] },
  { id: 96, name: "Drowzee", rarity: "common", types: ["psychic"] },
  { id: 97, name: "Hypno", rarity: "uncommon", types: ["psychic"] },
  { id: 98, name: "Krabby", rarity: "common", types: ["water"] },
  { id: 99, name: "Kingler", rarity: "uncommon", types: ["water"] },
  { id: 100, name: "Voltorb", rarity: "common", types: ["electric"] },
  { id: 101, name: "Electrode", rarity: "uncommon", types: ["electric"] },
  { id: 102, name: "Exeggcute", rarity: "common", types: ["grass", "psychic"] },
  { id: 103, name: "Exeggutor", rarity: "uncommon", types: ["grass", "psychic"] },
  { id: 104, name: "Cubone", rarity: "uncommon", types: ["ground"] },
  { id: 105, name: "Marowak", rarity: "rare", types: ["ground"] },
  { id: 106, name: "Hitmonlee", rarity: "rare", types: ["fighting"] },
  { id: 107, name: "Hitmonchan", rarity: "rare", types: ["fighting"] },
  { id: 108, name: "Lickitung", rarity: "uncommon", types: ["normal"] },
  { id: 109, name: "Koffing", rarity: "common", types: ["poison"] },
  { id: 110, name: "Weezing", rarity: "uncommon", types: ["poison"] },
  { id: 111, name: "Rhyhorn", rarity: "common", types: ["ground", "rock"] },
  { id: 112, name: "Rhydon", rarity: "uncommon", types: ["ground", "rock"] },
  { id: 113, name: "Chansey", rarity: "rare", types: ["normal"] },
  { id: 114, name: "Tangela", rarity: "uncommon", types: ["grass"] },
  { id: 115, name: "Kangaskhan", rarity: "rare", types: ["normal"] },
  { id: 116, name: "Horsea", rarity: "common", types: ["water"] },
  { id: 117, name: "Seadra", rarity: "uncommon", types: ["water"] },
  { id: 118, name: "Goldeen", rarity: "common", types: ["water"] },
  { id: 119, name: "Seaking", rarity: "uncommon", types: ["water"] },
  { id: 120, name: "Staryu", rarity: "common", types: ["water"] },
  { id: 121, name: "Starmie", rarity: "uncommon", types: ["water", "psychic"] },
  { id: 122, e: "r Mime", rarity: "rare", types: ["psychic", "fairy"] },
  { id: 123, name: "Scyther", rarity: "rare", types: ["bug", "flying"] },
  { id: 124, name: "Jynx", rarity: "rare", types: ["ice", "psychic"] },
  { id: 125, name: "Electabuzz", rarity: "rare", types: ["electric"] },
  { id: 126, name: "Magmar", rarity: "rare", types: ["fire"] },
  { id: 127, name: "Pinsir", rarity: "rare", types: ["bug"] },
  { id: 128, name: "Tauros", rarity: "rare", types: ["normal"] },
  { id: 129, name: "Magikarp", rarity: "common", types: ["water"] },
  { id: 130, name: "Gyarados", rarity: "rare", types: ["water", "flying"] },
  { id: 131, name: "Lapras", rarity: "rare", types: ["water", "ice"] },
  { id: 132, name: "Ditto", rarity: "uncommon", types: ["normal"] },
  { id: 133, name: "Eevee", rarity: "uncommon", types: ["normal"] },
  { id: 134, name: "Vaporeon", rarity: "rare", types: ["water"] },
  { id: 135, name: "Jolteon", rarity: "rare", types: ["electric"] },
  { id: 136, name: "Flareon", rarity: "rare", types: ["fire"] },
  { id: 137, name: "Porygon", rarity: "rare", types: ["normal"] },
  { id: 138, name: "Omanyte", rarity: "uncommon", types: ["rock", "water"] },
  { id: 139, name: "Omastar", rarity: "rare", types: ["rock", "water"] },
  { id: 140, name: "Kabuto", rarity: "uncommon", types: ["rock", "water"] },
  { id: 141, name: "Kabutops", rarity: "rare", types: ["rock", "water"] },
  { id: 142, name: "Aerodactyl", rarity: "rare", types: ["rock", "flying"] },
  { id: 143, name: "Snorlax", rarity: "rare", types: ["normal"] },
  { id: 144, name: "Articuno", rarity: "legendary", types: ["ice", "flying"] },
  { id: 145, name: "Zapdos", rarity: "legendary", types: ["electric", "flying"] },
  { id: 146, name: "Moltres", rarity: "legendary", types: ["fire", "flying"] },
  { id: 147, name: "Dratini", rarity: "uncommon", types: ["dragon"] },
  { id: 148, name: "Dragonair", rarity: "rare", types: ["dragon"] },
  { id: 149, name: "Dragonite", rarity: "legendary", types: ["dragon", "flying"] },
  { id: 150, name: "Mewtwo", rarity: "legendary", types: ["psychic"] },
  { id: 151, name: "Mew", rarity: "legendary", types: ["psychic"] }
];
const ENCOUNTER_RATES = {
  common: 0.15,
  uncommon: 0.08,
  rare: 0.03,
  legendary: 0.01
};
function selectRandomPokemon() {
  const availablePokemon = POKEMON_LIST.filter((p) => Math.random() < ENCOUNTER_RATES[p.rarity]);
  let selectedPokemon;
  if (availablePokemon.length === 0) {
    const commonPokemon = POKEMON_LIST.filter((p) => p.rarity === "common");
    selectedPokemon = { ...commonPokemon[Math.floor(Math.random() * commonPokemon.length)] };
  } else {
    selectedPokemon = { ...availablePokemon[Math.floor(Math.random() * availablePokemon.length)] };
  }
  selectedPokemon.shiny = Math.random() < 1 / 200;
  return selectedPokemon;
}
function createEncounterPopup(pokemon) {
  const popup = document.createElement("div");
  popup.id = "pokebrowser-encounter";
  popup.innerHTML = `
    <div class="encounter-content">
      <div class="grass-platform">
        <div class="pokemon-sprite">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemon.shiny ? "shiny/" : ""}${pokemon.id}.gif" 
               alt="${pokemon.name}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.shiny ? "shiny/" : ""}${pokemon.id}.png'">
        </div>
      </div>
      <div class="encounter-text">
        <h3>A wild ${pokemon.shiny ? "shiny" : ""} ${pokemon.name} appeared!</h3>
      </div>
      <div class="button-container">
        <button id="catch-pokemon">Catch</button>
        <button id="run-away">Run</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  const grassPlatform = popup.querySelector(".grass-platform");
  const grassImageUrl = getExtensionURL("grass-platform.webp");
  if (grassImageUrl) {
    grassPlatform.style.backgroundImage = `url('${grassImageUrl}')`;
  }
  document.getElementById("catch-pokemon").addEventListener("click", () => catchPokemon(pokemon));
  document.getElementById("run-away").addEventListener("click", closePokemonEncounter);
}
async function catchPokemon(pokemon) {
  startCatchAnimation(pokemon);
}
async function savePokemonAndShowSuccess(pokemon) {
  try {
    const caughtPokemon = { ...pokemon, caughtAt: (/* @__PURE__ */ new Date()).toISOString(), site: window.location.hostname, shiny: pokemon.shiny || false, level: 1 };
    if (chrome.runtime && chrome.runtime.sendMessage) {
      const response = await chrome.runtime.sendMessage({
        type: "CATCH_POKEMON",
        data: { pokemon: caughtPokemon }
      });
      if (response && !response.success) {
        console.error("Error from background script:", response.error);
      }
    }
    showCatchSuccess(pokemon);
  } catch (error) {
    console.error("Error catching Pokemon:", error);
    showCatchSuccess(pokemon);
  }
}
function showCatchSuccess(pokemon) {
  const popup = document.getElementById("pokebrowser-encounter");
  const encounterText = popup.querySelector(".encounter-text");
  const buttonContainer = popup.querySelector(".button-container");
  if (encounterText) {
    encounterText.innerHTML = `
      <h3>Gotcha! ${pokemon.name} was caught!</h3>
      <div class="close-instruction">Click anywhere to close</div>
    `;
  }
  if (buttonContainer) {
    buttonContainer.style.display = "none";
  }
  const clickHandler = (e) => {
    if (!popup.contains(e.target)) {
      closePokemonEncounter();
      document.removeEventListener("click", clickHandler);
    }
  };
  setTimeout(() => document.addEventListener("click", clickHandler), 100);
  setTimeout(closePokemonEncounter, 5e3);
}
function closePokemonEncounter() {
  const popup = document.getElementById("pokebrowser-encounter");
  if (popup) popup.remove();
}
function getExtensionURL(resourcePath) {
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(resourcePath);
  }
  console.warn(`chrome.runtime.getURL not available for resource: ${resourcePath}`);
  return null;
}
function initializePokebrowser() {
  if (window.location.protocol.startsWith("chrome")) return;
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
  const style = document.createElement("style");
  style.textContent = updatedCSS;
  document.head.appendChild(style);
  setTimeout(() => {
    if (POKEMON_LIST.length > 0) {
      const pokemon = selectRandomPokemon();
      createEncounterPopup(pokemon);
    }
  }, 3e3);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePokebrowser);
} else {
  initializePokebrowser();
}
//# sourceMappingURL=content.js.map
