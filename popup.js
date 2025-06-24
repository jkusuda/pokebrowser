// Load and display Pokemon collection
async function loadCollection() {
  try {
    const result = await chrome.storage.local.get(['pokemonCollection']);
    const collection = result.pokemonCollection || [];
    
    displayCollection(collection);
    updateStats(collection);
  } catch (error) {
    console.error('Error loading collection:', error);
  }
}

// Display Pokemon collection in the popup
function displayCollection(collection) {
  const container = document.getElementById('pokemon-collection');
  
  if (collection.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Pokémon Yet!</h3>
        <p>Browse websites to encounter wild Pokémon and start your collection!</p>
      </div>
    `;
    return;
  }
  
  // Sort by catch time (newest first)
  const sortedCollection = collection.sort((a, b) => 
    new Date(b.caughtAt) - new Date(a.caughtAt)
  );
  
  container.innerHTML = sortedCollection.map(pokemon => `
    <div class="pokemon-item">
      <div class="pokemon-sprite">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" 
             alt="${pokemon.name}" onerror="this.style.display='none'">
      </div>
      <div class="pokemon-info">
        <div class="pokemon-name">${pokemon.name}</div>
        <div class="pokemon-details">
          Caught on ${pokemon.site} • ${formatDate(pokemon.caughtAt)}
        </div>
      </div>
    </div>
  `).join('');
}

// Update statistics display
function updateStats(collection) {
  const totalCaught = collection.length;
  const uniquePokemon = new Set(collection.map(p => p.id)).size;
  
  document.getElementById('total-caught').textContent = totalCaught;
  document.getElementById('unique-count').textContent = uniquePokemon;
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Clear collection with confirmation
async function clearCollection() {
  if (confirm('Are you sure you want to clear your entire Pokémon collection? This cannot be undone.')) {
    try {
      await chrome.storage.local.set({ pokemonCollection: [] });
      loadCollection();
    } catch (error) {
      console.error('Error clearing collection:', error);
    }
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCollection();
  
  document.getElementById('clear-collection').addEventListener('click', clearCollection);
});

// Refresh collection when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.pokemonCollection) {
    loadCollection();
  }
});
