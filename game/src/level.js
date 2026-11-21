// The Quiet Archive — the museum floor: walls, shadows, seals, exit and patrols.
// Pure data and geometry (no DOM, no randomness), so the world can be tested in Node.
//
// Legend: '#' shelf/wall (blocks movement and sight) · '.' floor · 's' shadow patch
// (floor that hides: detection fills much slower while standing in one) · 'E' exit
// · '1' '2' '3' seal fragments · 'P' where the thief starts.
import { TILE, COLS, ROWS } from './config.js';

const MAP = [
  '########################',
  '#......s.....#....E....#',
  '#..##........#.........#',
  '#..##...s....#....##...#',
  '#......####..#....##...#',
  '#..s.........####....3.#',
  '#..####......#....s....#',
  '#......#..s..#.........#',
  '#..##..#.....#...##....#',
  '#..##.....s......##..1.#',
  '#......####....s.......#',
  '#..s..........####.....#',
  '#.....##...s......##...#',
  '#..P..##.....2.....##..#',
  '########################',
];

/** Archivist-guards: name, tunic colour, and patrol waypoints in tile coordinates. */
const GUARD_DEFS = [
  { name: 'Mara', color: '#e2725b', waypoints: [[2, 1], [11, 1]] },
  { name: 'Bram', color: '#e0a458', waypoints: [[17, 2], [21, 2], [21, 6], [17, 6]] },
  { name: 'Ilya', color: '#9b7ede', waypoints: [[8, 5], [12, 5], [12, 8], [8, 8]] },
  { name: 'Sable', color: '#6fbf73', waypoints: [[9, 11], [13, 11], [13, 13], [9, 13]] },
  { name: 'Wren', color: '#e06ba7', waypoints: [[19, 7], [22, 7], [22, 10], [19, 10]] },
];

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/**
 * Self-check the map at load: rows all the same width, exactly one spawn and
 * one exit, three seals, and every guard patrol a straight, wall-free run.
 * A broken map fails loudly here instead of stranding the player in the game.
 */
function validateLevel(tiles, guards) {
  if (tiles.length !== ROWS) throw new Error(`map has ${tiles.length} rows, expected ${ROWS}`);
  for (const row of tiles) {
    if (row.length !== COLS) throw new Error(`map row has ${row.length} columns, expected ${COLS}`);
  }
  let spawns = 0;
  let exits = 0;
  let seals = 0;
  for (const row of tiles) {
    for (const cell of row) {
      if (cell === 'P') spawns += 1;
      else if (cell === 'E') exits += 1;
      else if (cell === '1' || cell === '2' || cell === '3') seals += 1;
    }
  }
  if (spawns !== 1 || exits !== 1 || seals !== 3) {
    throw new Error(`map needs 1 spawn, 1 exit and 3 seals, found ${spawns}/${exits}/${seals}`);
  }
  for (const guard of guards) {
    const wps = guard.waypoints;
    for (let i = 0; i < wps.length; i += 1) {
      const a = wps[i];
      const b = wps[(i + 1) % wps.length];
      if (a.x !== b.x && a.y !== b.y) throw new Error(`guard ${guard.name} patrol turns a corner mid-leg`);
      if (!lineOfSight({ tiles, cols: COLS, rows: ROWS }, a.x, a.y, b.x, b.y)) {
        throw new Error(`guard ${guard.name} patrol crosses a wall`);
      }
    }
  }
}

/** Parse MAP into the level: tiles, spawn, exit, seals, shadows and guard patrols. */
export function createLevel() {
  const tiles = MAP.map((row) => row.split(''));
  let playerStart = null;
  let exit = null;
  const seals = [];
  const shadows = [];
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const cell = tiles[ty][tx];
      if (cell === 'P') playerStart = tileCentre(tx, ty);
      else if (cell === 'E') exit = { tx, ty, ...tileCentre(tx, ty) };
      else if (cell === '1' || cell === '2' || cell === '3') {
        seals.push({ id: Number(cell), tx, ty, ...tileCentre(tx, ty), taken: false });
      } else if (cell === 's') shadows.push({ tx, ty });
    }
  }
  const guards = GUARD_DEFS.map((def) => ({
    name: def.name,
    color: def.color,
    waypoints: def.waypoints.map(([tx, ty]) => tileCentre(tx, ty)),
  }));
  validateLevel(tiles, guards);
  return { tiles, playerStart, exit, seals, shadows, guards, cols: COLS, rows: ROWS };
}

/** A tile outside the map counts as wall, so nothing ever leaves the floor. */
export function isWallTile(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return true;
  return level.tiles[ty][tx] === '#';
}

export function isShadowTile(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return false;
  return level.tiles[ty][tx] === 's';
}

/** Does the circle at (x, y) with radius r overlap any wall tile? */
export function circleHitsWall(level, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (!isWallTile(level, tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

/**
 * Move a circle by (dx, dy), axis by axis, sliding along walls instead of sticking.
 * Returns the new position.
 */
export function moveCircle(level, x, y, dx, dy, r) {
  let nx = x;
  let ny = y;
  if (dx !== 0 && !circleHitsWall(level, x + dx, y, r)) nx = x + dx;
  if (dy !== 0 && !circleHitsWall(level, nx, y + dy, r)) ny = y + dy;
  return { x: nx, y: ny };
}

/**
 * Line of sight: sample the segment every few pixels; a wall tile anywhere on it
 * breaks the line. Shadow patches and the exit never block sight.
 */
export function lineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 3));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (isWallTile(level, tx, ty)) return false;
  }
  return true;
}

/** Is the point (x, y) standing in a shadow patch? */
export function pointInShadow(level, x, y) {
  return isShadowTile(level, Math.floor(x / TILE), Math.floor(y / TILE));
}

/** Breadth-first walk over floor tiles, for tests: every tile reachable from (tx, ty). */
export function reachableTiles(level, tx, ty) {
  const seen = new Set([`${tx},${ty}`]);
  const queue = [[tx, ty]];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      if (isWallTile(level, nx, ny) || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  return seen;
}
