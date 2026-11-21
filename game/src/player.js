// The Quiet Archive — the thief: movement, sneaking, footstep ripples and the
// pebble toss. Walking is fast but loud; sneaking is slow, quiet and harder to
// spot. A tossed pebble lands with a ping and pulls the nearest guard to look.
import {
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_RADIUS,
  PEBBLE_COUNT,
  PEBBLE_RANGE,
  PEBBLE_HEAR_RADIUS,
  PEBBLE_FLIGHT_SECONDS,
  FOOTSTEP_INTERVAL_WALK,
  FOOTSTEP_INTERVAL_SNEAK,
} from './config.js';
import { moveCircle } from './level.js';
import { GUARD_CHASE, GUARD_INVESTIGATE } from './guards.js';

export function createPlayer(level) {
  return {
    x: level.playerStart.x,
    y: level.playerStart.y,
    angle: -Math.PI / 2,
    sneaking: false,
    moving: false,
    /** Set for one step when a footstep ripple fires, so the sound can follow it. */
    stepped: false,
    pebbles: PEBBLE_COUNT,
    footstepTimer: 0,
  };
}

/**
 * Move the player from `input` ({mx, my} a unit direction, `sneak` a boolean)
 * and leave a fading ripple at each footstep. Returns nothing; the world reads
 * player.moving and player.sneaking.
 */
export function updatePlayer(player, level, input, world, dt) {
  const speed = input.sneak ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  const dx = input.mx * speed * dt;
  const dy = input.my * speed * dt;
  player.moving = dx !== 0 || dy !== 0;
  player.sneaking = input.sneak;
  player.stepped = false;
  if (player.moving) {
    const moved = moveCircle(level, player.x, player.y, dx, dy, PLAYER_RADIUS);
    player.x = moved.x;
    player.y = moved.y;
    player.angle = Math.atan2(dy, dx);
    player.footstepTimer -= dt;
    if (player.footstepTimer <= 0) {
      player.footstepTimer = input.sneak ? FOOTSTEP_INTERVAL_SNEAK : FOOTSTEP_INTERVAL_WALK;
      player.stepped = true;
      world.ripples.push({ x: player.x, y: player.y, age: 0, loud: !input.sneak });
    }
  }
}

/** Throw a pebble toward (tx, ty), capped at throwing range. */
export function throwPebble(world, tx, ty) {
  const { player } = world;
  if (player.pebbles <= 0 || world.pebble) return false;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const distance = Math.hypot(dx, dy);
  const reach = Math.min(distance, PEBBLE_RANGE);
  const nx = distance === 0 ? player.x : player.x + (dx / distance) * reach;
  const ny = distance === 0 ? player.y : player.y + (dy / distance) * reach;
  player.pebbles -= 1;
  world.pebble = {
    fromX: player.x,
    fromY: player.y,
    x: nx,
    y: ny,
    age: 0,
    flight: PEBBLE_FLIGHT_SECONDS,
    landed: false,
    ringAge: 0,
  };
  return true;
}

/** Advance the flying pebble; on landing, ping and distract nearby guards. */
export function updatePebble(world, dt) {
  const pebble = world.pebble;
  if (!pebble) return;
  pebble.age += dt;
  if (!pebble.landed && pebble.age >= pebble.flight) {
    pebble.landed = true;
    pebble.ringAge = 0;
    world.noise = { x: pebble.x, y: pebble.y, age: 0 };
    for (const guard of world.guards) {
      const distance = Math.hypot(guard.x - pebble.x, guard.y - pebble.y);
      if (distance <= PEBBLE_HEAR_RADIUS) {
        guard.lastSeen = { x: pebble.x, y: pebble.y };
        if (guard.state !== GUARD_CHASE) {
          guard.state = GUARD_INVESTIGATE;
          guard.lookTimer = 0;
        }
      }
    }
    if (world.onNoise) world.onNoise(pebble.x, pebble.y);
  }
  if (pebble.landed) {
    pebble.ringAge += dt;
    if (pebble.ringAge > 1.2) world.pebble = null;
  }
}
