// Pokéball catch animation primitives, ported from
// extension/src/lib/animation.ts — keep the two in sync.
//
// The catch sequence combines CSS keyframe animations (for arcs, shakes,
// and scale pulses — defined in src/app/globals.css as pb-throw / pb-shake /
// pb-success) with spritesheet frame stepping (for the ball's
// spin/flash/shake/success states).

// Spritesheet vertical layout (Y-offsets).
// 64x64 frames sampled from a 1792x2048 source sheet.
export const PB_FRAME = {
  spin: [0, -64, -128],
  flash: [-192, -256, -320],
  closed: [0],
  shake: [-960, -1024, -1088, -1152, -1216],
  success: [-1728, -1792, -1856, -1920, -1984],
};

function waitForAnimationEnd(el: Element): Promise<void> {
  return new Promise((resolve) =>
    el.addEventListener("animationend", () => resolve(), { once: true })
  );
}

// Resets and plays a CSS animation string on an element.
export function playAnimation(el: HTMLElement, animation: string): Promise<void> {
  el.style.animation = "none";
  // Force reflow so the next assignment restarts the animation.
  void el.offsetWidth;
  el.style.animation = animation;
  return waitForAnimationEnd(el);
}

// Steps through Y-offsets on a single-column spritesheet at the given fps.
export function playFrameSequence(
  el: HTMLElement,
  yOffsets: number[],
  fps: number
): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const ms = 1000 / fps;
    const tick = () => {
      el.style.backgroundPosition = `0px ${yOffsets[i]}px`;
      if (++i >= yOffsets.length) return resolve();
      setTimeout(tick, ms);
    };
    tick();
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runCatchAnimation(
  pokeballEl: HTMLElement,
  pokemonImg: HTMLElement
): Promise<void> {
  // Throw. Play CSS arc geometry and sprite spinning simultaneously.
  pokeballEl.style.opacity = "1";
  const throwArc = playAnimation(pokeballEl, "pb-throw 0.8s ease-out forwards");
  await playFrameSequence(
    pokeballEl,
    [...PB_FRAME.spin, ...PB_FRAME.spin, ...PB_FRAME.spin],
    10
  );
  await throwArc;

  // Absorb. Bright white flash, make the pokemon image fade, then close.
  pokeballEl.style.filter = "brightness(3) drop-shadow(0 0 20px white)";
  await playFrameSequence(pokeballEl, PB_FRAME.flash, 8);
  pokemonImg.style.opacity = "0";
  pokeballEl.style.filter = "";
  await playFrameSequence(pokeballEl, PB_FRAME.closed, 8);
  await delay(100);

  // Shake loops.
  for (let s = 0; s < 3; s++) {
    const shakeDuration = 0.45 + s * 0.05;
    const shakeArc = playAnimation(pokeballEl, `pb-shake ${shakeDuration}s ease-in-out`);
    await playFrameSequence(pokeballEl, PB_FRAME.shake, 10);
    await shakeArc;
    await playFrameSequence(pokeballEl, PB_FRAME.closed, 8);
    await delay(200);
  }

  // Confirmation sparkles.
  pokeballEl.style.filter = "drop-shadow(0 0 8px rgba(255,255,255,0.6))";
  await playFrameSequence(pokeballEl, PB_FRAME.success, 8);
  await playAnimation(pokeballEl, "pb-success 0.4s ease-out forwards");
  pokeballEl.style.filter = "";
}
