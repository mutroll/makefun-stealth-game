// The Quiet Archive — staged screenshot scenes behind ?shot=cover|patrol|hide|exit.
// Each scene sets the real world to a real moment — positions, facing, suspicion,
// seals taken — and the renderer paints exactly what a player would see there.
// No pixels are faked: the same draw() paints the game and the screenshots.
import { TILE } from './config.js';
import { GUARD_SUSPICIOUS } from './guards.js';
import { STATUS_WON, resetWorld } from './world.js';
import { SCREEN_PLAY, SCREEN_WON } from './render.js';

/** Put an entity at pixel (x, y), facing `angle`. */
function place(entity, x, y, angle) {
  entity.x = x;
  entity.y = y;
  entity.angle = angle;
}

function guardAt(world, index, tx, ty, angle, state, suspicion) {
  const guard = world.guards[index];
  guard.x = tx * TILE + TILE / 2;
  guard.y = ty * TILE + TILE / 2;
  guard.angle = angle;
  guard.state = state;
  guard.suspicion = suspicion;
  guard.pauseLeft = 0;
  return guard;
}

function addRipples(world, spots) {
  for (const [x, y, age, loud] of spots) {
    world.ripples.push({ x, y, age, loud });
  }
}

/**
 * Stage the named scene and return the screen to draw over it.
 * cover — the whole archive at a glance, a cone sweeping near the thief.
 * patrol — a guard's torch cone closing in, the meter half full.
 * hide — the thief flat in a shadow patch while a guard walks past.
 * exit — the escape: all three seals, the thief on the green exit.
 */
export function stageShot(name, world) {
  resetWorld(world);
  const player = world.player;

  if (name === 'patrol') {
    place(player, 16 * TILE + 20, 3 * TILE + 20, Math.PI);
    player.sneaking = true;
    guardAt(world, 1, 19, 2, Math.PI, GUARD_SUSPICIOUS, 0.55);
    guardAt(world, 0, 6, 1, 0, 'patrol', 0.1);
    guardAt(world, 2, 10, 6, Math.PI / 2, 'patrol', 0);
    world.detection = 0.55;
    addRipples(world, [
      [16 * TILE + 20, 3 * TILE + 20, 0.2, false],
      [16 * TILE + 40, 3 * TILE + 20, 0.45, false],
    ]);
    return { screen: SCREEN_PLAY };
  }

  if (name === 'hide') {
    place(player, 10 * TILE + 20, 9 * TILE + 20, -Math.PI / 2);
    player.sneaking = true;
    guardAt(world, 2, 12, 8, Math.PI, 'patrol', 0.18);
    guardAt(world, 3, 11, 12, -Math.PI / 2, 'patrol', 0);
    world.detection = 0.18;
    addRipples(world, [
      [10 * TILE + 20, 9 * TILE + 20, 0.3, false],
      [12 * TILE + 20, 8 * TILE + 20, 0.1, true],
    ]);
    return { screen: SCREEN_PLAY };
  }

  if (name === 'exit') {
    const exit = world.level.exit;
    place(player, exit.x, exit.y, -Math.PI / 2);
    for (const seal of world.seals) seal.taken = true;
    world.time = 143;
    world.status = STATUS_WON;
    // The guards are calm again: the escape was clean, the meter reads unseen.
    guardAt(world, 1, 20, 4, Math.PI / 2, 'patrol', 0.15);
    guardAt(world, 0, 4, 2, 0, 'patrol', 0.1);
    world.detection = 0;
    return { screen: SCREEN_WON };
  }

  // cover (default): the thief mid-gallery, one guard suspicious, one seal taken.
  place(player, 10 * TILE + 20, 10 * TILE + 20, -Math.PI / 2);
  player.sneaking = true;
  world.seals[1].taken = true;
  // A pebble just landed ahead, its ring still spreading — the distraction trick.
  world.pebble = {
    fromX: 10 * TILE + 20,
    fromY: 10 * TILE + 20,
    x: 12 * TILE + 20,
    y: 8 * TILE + 20,
    age: 0.4,
    flight: 0.32,
    landed: true,
    ringAge: 0.4,
  };
  world.noise = { x: 12 * TILE + 20, y: 8 * TILE + 20, age: 0.3 };
  guardAt(world, 0, 8, 1, Math.PI / 2, GUARD_SUSPICIOUS, 0.42);
  guardAt(world, 1, 19, 4, -Math.PI / 2, 'patrol', 0.05);
  guardAt(world, 2, 10, 6, 0, 'patrol', 0);
  guardAt(world, 4, 21, 9, Math.PI, 'patrol', 0.12);
  world.detection = 0.42;
  world.time = 61;
  addRipples(world, [
    [10 * TILE + 20, 10 * TILE + 20, 0.2, false],
    [10 * TILE + 20, 11 * TILE + 5, 0.5, false],
    [8 * TILE + 20, 2 * TILE + 20, 0.15, true],
  ]);
  return { screen: SCREEN_PLAY };
}
