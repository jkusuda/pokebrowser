/**
 * Evolution data configuration for Pokemon.
 * Contains evolution chains, candy costs, and evolution requirements.
 */

export const EVOLUTION_DATA = {
    // Bulbasaur evolution line
    1: { evolvesTo: 2, candyCost: 25, name: "Ivysaur", baseCandyId: 1 },      // Bulbasaur → Ivysaur
    2: { evolvesTo: 3, candyCost: 100, name: "Venusaur", baseCandyId: 1 },    // Ivysaur → Venusaur
    
    // Charmander evolution line
    4: { evolvesTo: 5, candyCost: 25, name: "Charmeleon", baseCandyId: 4 },   // Charmander → Charmeleon
    5: { evolvesTo: 6, candyCost: 100, name: "Charizard", baseCandyId: 4 },   // Charmeleon → Charizard
    
    // Squirtle evolution line
    7: { evolvesTo: 8, candyCost: 25, name: "Wartortle", baseCandyId: 7 },    // Squirtle → Wartortle
    8: { evolvesTo: 9, candyCost: 100, name: "Blastoise", baseCandyId: 7 }    // Wartortle → Blastoise
    
    // Final evolutions (3, 6, 9) have no entries = cannot evolve
};

/**
 * Maps all Pokemon in evolution families to their base candy ID.
 * This ensures all evolutions use the same candy type.
 */
export const CANDY_FAMILY_MAP = {
    // Bulbasaur family - all use Bulbasaur candy (ID 1)
    1: 1, // Bulbasaur
    2: 1, // Ivysaur
    3: 1, // Venusaur
    
    // Charmander family - all use Charmander candy (ID 4)
    4: 4, // Charmander
    5: 4, // Charmeleon
    6: 4, // Charizard
    
    // Squirtle family - all use Squirtle candy (ID 7)
    7: 7, // Squirtle
    8: 7, // Wartortle
    9: 7  // Blastoise
};

/**
 * Helper function to get Pokemon name by ID for display purposes.
 * This is a minimal set for the starter Pokemon.
 */
export const POKEMON_NAMES = {
    1: "Bulbasaur",
    2: "Ivysaur", 
    3: "Venusaur",
    4: "Charmander",
    5: "Charmeleon",
    6: "Charizard",
    7: "Squirtle",
    8: "Wartortle",
    9: "Blastoise"
};
