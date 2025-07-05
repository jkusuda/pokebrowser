// animations.js - Contains logic for pokeball throwing

// Starts the pokeball catch animation sequence with manual frame control.
function startCatchAnimation(pokemon) {
  const popup = document.getElementById('pokebrowser-encounter');
  const pokemonSprite = popup.querySelector('.pokemon-sprite img');
  
  // Hide the catch/run buttons
  const buttonContainer = popup.querySelector('.button-container');
  buttonContainer.style.display = 'none';
  
  // Create pokeball element
  const pokeball = document.createElement('div');
  pokeball.className = 'pokeball';
  pokeball.innerHTML = '<div class="pokeball-sprite"></div>';
  
  // Style the pokeball container
  pokeball.style.position = 'absolute';
  pokeball.style.width = '64px';
  pokeball.style.height = '64px';
  pokeball.style.bottom = '-32px';
  pokeball.style.left = '-32px';
  pokeball.style.zIndex = '3';
  pokeball.style.opacity = '0';
  pokeball.style.transform = 'scale(1.5)'; // Scale up by 1.5x (96px effective size)
  pokeball.style.transition = 'transform 0.1s ease-out, filter 0.2s ease-out';
  
  // Load the pokeball sprite sheet
  const pokeballSprite = pokeball.querySelector('.pokeball-sprite');
  const pokeballImageUrl = getExtensionURL('pokeball-spritesheet.png');
  if (pokeballImageUrl) {
    pokeballSprite.style.backgroundImage = `url('${pokeballImageUrl}')`;
  }
  pokeballSprite.style.backgroundSize = '1792px 2048px';
  pokeballSprite.style.backgroundRepeat = 'no-repeat';
  pokeballSprite.style.imageRendering = 'pixelated';
  pokeballSprite.style.width = '100%';
  pokeballSprite.style.height = '100%';
  pokeballSprite.style.backgroundPosition = '0 0';
  
  // Add pokeball to the grass platform
  const grassPlatform = popup.querySelector('.grass-platform');
  grassPlatform.appendChild(pokeball);
  
  // Start the throw animation with manual frame control
  setTimeout(() => {
    throwPokeballWithFrames(pokeball, pokeballSprite, pokemonSprite, pokemon);
  }, 500);
}

// Handles the throw animation with manual frame control
function throwPokeballWithFrames(pokeball, pokeballSprite, pokemonSprite, pokemon) {
  pokeball.style.opacity = '1';
  
  // Spinning frames (1-3) during throw
  const throwFrames = [0, -64, -128]; // Frames 1, 2, 3
  let currentFrame = 0;
  
  // Start CSS animation for movement
  pokeball.style.animation = 'throwPokeball 0.8s ease-out forwards';
  
  // Manually update sprite frames during throw
  const frameInterval = setInterval(() => {
    pokeballSprite.style.backgroundPosition = `0 ${throwFrames[currentFrame]}px`;
    currentFrame = (currentFrame + 1) % throwFrames.length;
  }, 100); // Change frame every 100ms
  
  // After throw completes, start catch sequence
  setTimeout(() => {
    clearInterval(frameInterval);
    startCatchSequence(pokeball, pokeballSprite, pokemonSprite, pokemon);
  }, 800);
}

// Handles the catch sequence (flash + shake + success)
function startCatchSequence(pokeball, pokeballSprite, pokemonSprite, pokemon) {
  // Hide pokemon with flash effect
  pokemonSprite.style.opacity = '0';
  
  // Flash and opening animation (frames 4-6)
  const flashFrames = [-192, -256, -320]; // Frames 4, 5, 6
  let flashFrame = 0;
  
  // Add flash effect
  pokeball.style.filter = 'brightness(3) drop-shadow(0 0 20px white)';
  
  const flashInterval = setInterval(() => {
    pokeballSprite.style.backgroundPosition = `0 ${flashFrames[flashFrame]}px`;
    flashFrame++;
    
    if (flashFrame >= flashFrames.length) {
      clearInterval(flashInterval);
      // Reset to closed ball
      pokeballSprite.style.backgroundPosition = '0 0px';
      pokeball.style.filter = 'brightness(1)';
      
      // Start shaking after flash
      setTimeout(() => {
        startShakingAnimation(pokeball, pokeballSprite, pokemon);
      }, 100);
    }
  }, 100);
}

// Handles the shaking animation
function startShakingAnimation(pokeball, pokeballSprite, pokemon) {
  // Shaking frames (16-20)
  const shakeFrames = [-960, -1024, -1088, -1152, -1216]; // Frames 16, 17, 18, 19, 20
  let shakeCount = 0;
  const maxShakes = 3;
  
  function performShake() {
    if (shakeCount >= maxShakes) {
      showSuccessParticles(pokeball, pokeballSprite, pokemon);
      return;
    }
    
    let frameIndex = 0;
    const shakeInterval = setInterval(() => {
      // Update sprite frame
      pokeballSprite.style.backgroundPosition = `0 ${shakeFrames[frameIndex]}px`;
      
      // Update position for shaking effect
      const shakeAmount = 5 + (shakeCount * 2); // Increase shake intensity
      const xOffset = Math.sin(frameIndex * 0.5) * shakeAmount;
      const rotation = Math.sin(frameIndex * 0.3) * (5 + shakeCount * 3);
      
      pokeball.style.transform = `scale(1.5) translate(70px, -40px) rotate(${rotation}deg) translateX(${xOffset}px)`;
      
      frameIndex++;
      
      if (frameIndex >= shakeFrames.length) {
        clearInterval(shakeInterval);
        shakeCount++;
        
        // Short pause between shakes
        setTimeout(() => {
          performShake();
        }, 200);
      }
    }, 150); // Slower frame rate for shaking
  }
  
  performShake();
}

// Shows success particles animation
function showSuccessParticles(pokeball, pokeballSprite, pokemon) {
  // Success frames (28-32)
  const particleFrames = [-1728, -1792, -1856, -1920, -1984]; // Frames 28, 29, 30, 31, 32
  let particleFrame = 0;
  
  // Add glow effect
  pokeball.style.filter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))';
  
  const particleInterval = setInterval(() => {
    pokeballSprite.style.backgroundPosition = `0 ${particleFrames[particleFrame]}px`;
    particleFrame++;
    
    if (particleFrame >= particleFrames.length) {
      clearInterval(particleInterval);
      // Animation complete, save pokemon
      setTimeout(() => {
        savePokemonAndShowSuccess(pokemon);
      }, 500);
    }
  }, 200);
}
