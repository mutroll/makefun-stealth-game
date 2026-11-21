// The Quiet Archive — the world: one pure simulation step. It owns the level,
// the thief, the guards, the seals, the pebble and the win/lose state, and nothing
// in it touches the DOM, so a test can drive it in Node with scripted inputs.
import { TILE, STEP } from './config.js';
import { createLevel } from './level.js';
import { createGuard, updateGuard, highestSuspicion, anyChasing } from './guards.js';
import { createPlayer, updatePlayer, updatePebble } from './player.js';

export const STATUS_PLAYING = 'playing';
export const STATUS_WON = 'won';
export const STATUS_CAUGHT = 'caught';

export function createWorld() {
  const level = createLevel();
  return {
    level,
    player: createPlayer(level),
    guards: level.guards.map((def) => createGuard(def)),
    seals: level.seals.map((seal) => ({ ...seal })),
    time: 0,
    status: STATUS_PLAYING,
    detection: 0,
    alarm: false,
    ripples: [],
    footprints: [],
    pebble: null,
    noise: null,
    /** Sound hooks the page sets; the simulation calls them, never the reverse. */
    onNoise: null,
    onSeal: null,
    /** Best (fewest) seconds to escape, kept by the page, not the simulation. */
    bestTime: null,
  };
}

/** Fresh world, same level: used for a new game and for staged screenshots. */
export function resetWorld(world) {
  // The page's sound hooks survive a reset: a new game must still chime.
  const { onSeal, onNoise } = world;
  const fresh = createWorld();
  Object.assign(world, fresh);
  world.onSeal = onSeal;
  world.onNoise = onNoise;
}

/** Seconds on the clock, rounded for the HUD. */
export function elapsedSeconds(world) {
  return Math.floor(world.time);
}

/**
 * One fixed step. `input` is {mx, my, sneak}; mouse pebble tosses arrive through
 * throwPebble instead. Returns an event string ('won' | 'caught') or null.
 */
export function stepWorld(world, input, dt = STEP) {
  if (world.status !== STATUS_PLAYING) return null;
  world.time += dt;

  updatePlayer(world.player, world.level, input, world, dt);
  updatePebble(world, dt);

  for (const guard of world.guards) {
    if (updateGuard(guard, world, dt) === 'caught') {
      world.status = STATUS_CAUGHT;
      return 'caught';
    }
  }
  world.detection = highestSuspicion(world.guards);
  world.alarm = anyChasing(world.guards);

  // Age the fading marks out of the lists.
  for (let i = world.ripples.length - 1; i >= 0; i -= 1) {
    world.ripples[i].age += dt;
    if (world.ripples[i].age > 0.9) world.ripples.splice(i, 1);
  }
  for (let i = world.footprints.length - 1; i >= 0; i -= 1) {
    world.footprints[i].age += dt;
    if (world.footprints[i].age > 2.4) world.footprints.splice(i, 1);
  }
  if (world.noise) {
    world.noise.age += dt;
    if (world.noise.age > 1.0) world.noise = null;
  }

  // Pick up a seal fragment by walking over it.
  for (const seal of world.seals) {
    if (!seal.taken && Math.hypot(world.player.x - seal.x, world.player.y - seal.y) < TILE * 0.7) {
      seal.taken = true;
      if (world.onSeal) world.onSeal(seal);
    }
  }

  // Reach the green exit unseen to escape.
  const exit = world.level.exit;
  if (Math.hypot(world.player.x - exit.x, world.player.y - exit.y) < TILE * 0.8) {
    world.status = STATUS_WON;
    return 'won';
  }
  return null;
}

export function sealsCollected(world) {
  return world.seals.filter((seal) => seal.taken).length;
}

export function sealsTotal(world) {
  return world.seals.length;
}
