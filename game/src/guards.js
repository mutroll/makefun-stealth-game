// The Quiet Archive — archivist-guards: patrols, vision cones and the detection
// meter. A guard patrols its waypoints, pauses to scan, grows suspicious when it
// glimpses the thief, investigates the last place it saw one, and chases when the
// meter fills — but a broken line of sight lets the thief slip away again.
import {
  VISION_RANGE,
  VISION_HALF_ANGLE,
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_RADIUS,
  GUARD_WAYPOINT_PAUSE,
  DETECT_SUSPICIOUS,
  DETECT_ALARM,
  DETECT_FILL_CLOSE,
  DETECT_FILL_FAR,
  DETECT_SNEAK_FACTOR,
  DETECT_SHADOW_FACTOR,
  DETECT_DRAIN,
  CHASE_GIVE_UP_SECONDS,
  CATCH_DISTANCE,
  FOOTSTEP_INTERVAL_GUARD,
} from './config.js';
import { lineOfSight, moveCircle, pointInShadow } from './level.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';
export const GUARD_INVESTIGATE = 'investigate';

/** A guard starts at its first waypoint, facing along its patrol. */
export function createGuard(def) {
  const start = def.waypoints[0];
  const next = def.waypoints[1] ?? def.waypoints[0];
  return {
    name: def.name,
    color: def.color,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    x: start.x,
    y: start.y,
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    state: GUARD_PATROL,
    pauseLeft: 0,
    scanPhase: 0,
    chaseTime: 0,
    suspicion: 0,
    lastSeen: null,
    lookTimer: 0,
    unseenTimer: 0,
    footprintTimer: 0,
  };
}

/** True when the player stands inside the guard's cone with a clear line of sight. */
export function guardSeesPlayer(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > VISION_RANGE) return false;
  let angleTo = Math.atan2(dy, dx) - guard.angle;
  while (angleTo > Math.PI) angleTo -= 2 * Math.PI;
  while (angleTo < -Math.PI) angleTo += 2 * Math.PI;
  if (Math.abs(angleTo) > VISION_HALF_ANGLE) return false;
  return lineOfSight(level, guard.x, guard.y, player.x, player.y);
}

/** How fast the meter fills while this guard watches the player right now. */
function detectionRate(guard, player, level) {
  const distance = Math.hypot(player.x - guard.x, player.y - guard.y);
  const closeness = 1 - distance / VISION_RANGE;
  let rate = DETECT_FILL_FAR + (DETECT_FILL_CLOSE - DETECT_FILL_FAR) * closeness;
  if (player.sneaking) rate *= DETECT_SNEAK_FACTOR;
  if (pointInShadow(level, player.x, player.y)) rate *= DETECT_SHADOW_FACTOR;
  return rate;
}

function walkToward(guard, level, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) return true;
  const step = Math.min(distance, speed * dt);
  const moved = moveCircle(level, guard.x, guard.y, (dx / distance) * step, (dy / distance) * step, GUARD_RADIUS);
  guard.x = moved.x;
  guard.y = moved.y;
  guard.angle = Math.atan2(dy, dx);
  return distance - step < 2;
}

function leaveFootprint(guard, world, dt) {
  guard.footprintTimer -= dt;
  if (guard.footprintTimer > 0) return;
  guard.footprintTimer = FOOTSTEP_INTERVAL_GUARD;
  world.footprints.push({ x: guard.x, y: guard.y, age: 0, color: guard.color });
}

/**
 * Advance one guard one step. Returns 'caught' when it reaches the player,
 * otherwise null. `world` carries the player, the level and the footprint list.
 */
export function updateGuard(guard, world, dt) {
  const { player, level } = world;
  const sees = guardSeesPlayer(guard, player, level);

  if (sees) {
    guard.suspicion = Math.min(DETECT_ALARM, guard.suspicion + detectionRate(guard, player, level) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenTimer = 0;
    if (guard.suspicion >= DETECT_ALARM && guard.state !== GUARD_CHASE) {
      guard.state = GUARD_CHASE;
      world.alarm = true;
    } else if (guard.suspicion >= DETECT_SUSPICIOUS && guard.state === GUARD_PATROL) {
      guard.state = GUARD_SUSPICIOUS;
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - DETECT_DRAIN * dt);
    guard.unseenTimer += dt;
    if (guard.state === GUARD_CHASE && guard.unseenTimer >= CHASE_GIVE_UP_SECONDS) {
      guard.state = GUARD_INVESTIGATE;
      guard.lookTimer = 0;
    }
    if (guard.state === GUARD_SUSPICIOUS && guard.suspicion < 0.12) {
      guard.state = GUARD_PATROL;
      guard.lastSeen = null;
    }
  }

  // A chase starts at patrol pace and ramps to full speed over a second, so
  // the player gets one beat to break the line of sight before it closes in.
  if (guard.state === GUARD_CHASE) guard.chaseTime += dt;
  else guard.chaseTime = 0;

  if (guard.state === GUARD_PATROL) {
    if (guard.pauseLeft > 0) {
      // Paused at a waypoint: sweep the cone slowly across the room.
      guard.pauseLeft -= dt;
      guard.scanPhase += dt;
      guard.angle += Math.sin(guard.scanPhase * 1.6) * 0.35 * dt;
    } else {
      const target = guard.waypoints[guard.waypointIndex];
      if (walkToward(guard, level, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = GUARD_WAYPOINT_PAUSE;
        guard.scanPhase = 0;
      }
      leaveFootprint(guard, world, dt);
    }
  } else if (guard.state === GUARD_SUSPICIOUS) {
    if (guard.lastSeen) {
      if (walkToward(guard, level, guard.lastSeen.x, guard.lastSeen.y, GUARD_SUSPICIOUS_SPEED, dt)) {
        guard.lookTimer += dt;
        guard.angle += 1.4 * dt;
        if (guard.lookTimer > 1.8) {
          guard.lookTimer = 0;
          guard.state = GUARD_PATROL;
          guard.lastSeen = null;
        }
      }
      leaveFootprint(guard, world, dt);
    }
  } else if (guard.state === GUARD_INVESTIGATE) {
    if (guard.lastSeen) {
      if (walkToward(guard, level, guard.lastSeen.x, guard.lastSeen.y, GUARD_SUSPICIOUS_SPEED, dt)) {
        guard.lookTimer += dt;
        guard.angle += 1.4 * dt;
        if (guard.lookTimer > 1.8) {
          guard.lookTimer = 0;
          guard.state = GUARD_PATROL;
          guard.lastSeen = null;
        }
      }
      leaveFootprint(guard, world, dt);
    } else {
      guard.state = GUARD_PATROL;
    }
  } else if (guard.state === GUARD_CHASE) {
    // Chase the player's live position; the wall slide keeps the guard moving
    // around shelf corners instead of getting stuck on them.
    const chaseSpeed =
      GUARD_PATROL_SPEED +
      (GUARD_CHASE_SPEED - GUARD_PATROL_SPEED) * Math.min(1, guard.chaseTime);
    walkToward(guard, level, player.x, player.y, chaseSpeed, dt);
    leaveFootprint(guard, world, dt);
    if (Math.hypot(player.x - guard.x, player.y - guard.y) <= CATCH_DISTANCE) return 'caught';
  }
  return null;
}

/** The highest suspicion across the guards — the meter the HUD shows. */
export function highestSuspicion(guards) {
  let top = 0;
  for (const guard of guards) top = Math.max(top, guard.suspicion);
  return top;
}

/** Any guard currently chasing? */
export function anyChasing(guards) {
  return guards.some((guard) => guard.state === GUARD_CHASE);
}
