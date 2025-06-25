// pokemon.js - Pokemon Class and Utilities

class Pokemon {
  constructor(id, name, rarity) {
    this.id = id;
    this.name = name;
    this.rarity = rarity;
    this.caughtAt = null;
    this.site = null;
    
    // Pokedex data (loaded from API)
    this.types = [];
    this.height = null;
    this.weight = null;
    this.abilities = [];
    this.stats = {};
    this.sprites = {};
    this.species = {};
    this.evolutionChain = [];
    this.description = null;
    this.category = null;
    this.generation = null;
    
    // Loading state
    this.isDataLoaded = false;
  }

  // Load full Pokemon data from PokeAPI
  async loadPokedexData() {
    if (this.isDataLoaded) return this;

    try {
      // Get basic Pokemon data
      const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${this.id}`);
      const pokemonData = await pokemonResponse.json();
      
      // Get species data for description and category
      const speciesResponse = await fetch(pokemonData.species.url);
      const speciesData = await speciesResponse.json();

      // Populate basic data
      this.types = pokemonData.types.map(type => type.type.name);
      this.height = pokemonData.height / 10; // Convert to meters
      this.weight = pokemonData.weight / 10; // Convert to kg
      this.abilities = pokemonData.abilities.map(ability => ability.ability.name);
      
      // Stats
      this.stats = {
        hp: pokemonData.stats.find(s => s.stat.name === 'hp').base_stat,
        attack: pokemonData.stats.find(s => s.stat.name === 'attack').base_stat,
        defense: pokemonData.stats.find(s => s.stat.name === 'defense').base_stat,
        spAttack: pokemonData.stats.find(s => s.stat.name === 'special-attack').base_stat,
        spDefense: pokemonData.stats.find(s => s.stat.name === 'special-defense').base_stat,
        speed: pokemonData.stats.find(s => s.stat.name === 'speed').base_stat
      };

      // Sprites
      this.sprites = {
        front_default: pokemonData.sprites.front_default,
        front_shiny: pokemonData.sprites.front_shiny,
        official_artwork: pokemonData.sprites.other['official-artwork']?.front_default
      };

      // Species data
      this.category = speciesData.genera.find(g => g.language.name === 'en')?.genus || 'Unknown Pokémon';
      this.generation = speciesData.generation.name;
      
      // Get English description
      const englishEntry = speciesData.flavor_text_entries.find(entry => 
        entry.language.name === 'en'
      );
      this.description = englishEntry ? 
        englishEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ') : 
        'No description available.';

      // Load evolution chain if needed
      await this.loadEvolutionChain(speciesData.evolution_chain.url);

      this.isDataLoaded = true;
      return this;
    } catch (error) {
      console.error(`Error loading data for ${this.name}:`, error);
      return this;
    }
  }

  // Load evolution chain data
  async loadEvolutionChain(evolutionUrl) {
    try {
      const evolutionResponse = await fetch(evolutionUrl);
      const evolutionData = await evolutionResponse.json();
      
      this.evolutionChain = this.parseEvolutionChain(evolutionData.chain);
    } catch (error) {
      console.error('Error loading evolution chain:', error);
      this.evolutionChain = [this.name];
    }
  }

  // Parse evolution chain recursively
  parseEvolutionChain(chain) {
    const evolutionNames = [];
    
    function traverse(node) {
      evolutionNames.push(node.species.name);
      if (node.evolves_to && node.evolves_to.length > 0) {
        node.evolves_to.forEach(evolution => traverse(evolution));
      }
    }
    
    traverse(chain);
    return evolutionNames;
  }

  // Mark as caught
  catch(site = window?.location?.hostname || 'unknown') {
    this.caughtAt = new Date().toISOString();
    this.site = site;
    return this;
  }

  // Get type effectiveness colors for UI
  getTypeColor(type) {
    const typeColors = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    return typeColors[type] || '#68A090';
  }

  // Get rarity color
  getRarityColor() {
    const rarityColors = {
      common: '#9CA3AF',
      uncommon: '#10B981',
      rare: '#3B82F6',
      legendary: '#F59E0B'
    };
    return rarityColors[this.rarity] || '#6B7280';
  }

  // Calculate total stats
  getTotalStats() {
    if (!this.isDataLoaded) return 0;
    return Object.values(this.stats).reduce((sum, stat) => sum + stat, 0);
  }

  // Convert to storage-friendly object
  toStorageObject() {
    return {
      id: this.id,
      name: this.name,
      rarity: this.rarity,
      caughtAt: this.caughtAt,
      site: this.site,
      types: this.types,
      height: this.height,
      weight: this.weight,
      abilities: this.abilities,
      stats: this.stats,
      sprites: this.sprites,
      species: this.species,
      evolutionChain: this.evolutionChain,
      description: this.description,
      category: this.category,
      generation: this.generation,
      isDataLoaded: this.isDataLoaded
    };
  }

  // Create Pokemon from storage object
  static fromStorageObject(obj) {
    const pokemon = new Pokemon(obj.id, obj.name, obj.rarity);
    Object.assign(pokemon, obj);
    return pokemon;
  }
}

// Pokemon Database - expandable list
const POKEMON_DATABASE = [
  new Pokemon(1, "Bulbasaur", "common"),
  new Pokemon(4, "Charmander", "common"),
  new Pokemon(7, "Squirtle", "common"),
  new Pokemon(25, "Pikachu", "uncommon"),
  new Pokemon(39, "Jigglypuff", "uncommon"),
  new Pokemon(104, "Cubone", "uncommon"),
  new Pokemon(131, "Lapras", "rare"),
  new Pokemon(144, "Articuno", "legendary"),
  new Pokemon(150, "Mewtwo", "legendary"),
  
  // Add more Pokemon easily
  new Pokemon(143, "Snorlax", "rare"),
  new Pokemon(94, "Gengar", "uncommon"),
  new Pokemon(6, "Charizard", "rare"),
  new Pokemon(9, "Blastoise", "rare"),
  new Pokemon(3, "Venusaur", "rare")
];

// Encounter rates by rarity
const ENCOUNTER_RATES = {
  common: 0.15,
  uncommon: 0.08,
  rare: 0.03,
  legendary: 0.01
};

// Utility functions for Pokemon management
const PokemonUtils = {
  // Get Pokemon by ID
  getPokemonById(id) {
    return POKEMON_DATABASE.find(pokemon => pokemon.id === id);
  },

  // Get Pokemon by rarity
  getPokemonByRarity(rarity) {
    return POKEMON_DATABASE.filter(pokemon => pokemon.rarity === rarity);
  },

  // Select random Pokemon based on encounter rates
  selectRandomPokemon() {
    const availablePokemon = [];
    
    POKEMON_DATABASE.forEach(pokemon => {
      const rate = ENCOUNTER_RATES[pokemon.rarity];
      if (Math.random() < rate) {
        availablePokemon.push(pokemon);
      }
    });
    
    if (availablePokemon.length === 0) {
      // Fallback to a common Pokemon
      const commonPokemon = this.getPokemonByRarity('common');
      return commonPokemon[Math.floor(Math.random() * commonPokemon.length)];
    }
    
    return availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
  },

  // Check if encounter should happen
  shouldShowEncounter(baseRate = 0.2) {
    return Math.random() < baseRate;
  },

  // Load Pokemon collection from storage
  async loadCollection() {
    try {
      const result = await chrome.storage.local.get(['pokemonCollection']);
      const collection = result.pokemonCollection || [];
      return collection.map(obj => Pokemon.fromStorageObject(obj));
    } catch (error) {
      console.error('Error loading Pokemon collection:', error);
      return [];
    }
  },

  // Save Pokemon collection to storage
  async saveCollection(pokemonArray) {
    try {
      const storageArray = pokemonArray.map(pokemon => pokemon.toStorageObject());
      await chrome.storage.local.set({ pokemonCollection: storageArray });
      return true;
    } catch (error) {
      console.error('Error saving Pokemon collection:', error);
      return false;
    }
  },

  // Add Pokemon to collection
  async addToCollection(pokemon) {
    try {
      const collection = await this.loadCollection();
      collection.push(pokemon);
      return await this.saveCollection(collection);
    } catch (error) {
      console.error('Error adding Pokemon to collection:', error);
      return false;
    }
  }
};

// Export for use in other files (if using modules)
// For Chrome extensions, these will be globally available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Pokemon, POKEMON_DATABASE, ENCOUNTER_RATES, PokemonUtils };
}
