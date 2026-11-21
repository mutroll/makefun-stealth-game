// The Quiet Archive — tuning constants. One place holds every number the
// rest of the game balances on, so a play-test can retune the feel without
// hunting through the logic.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 600

/** Fixed simulation step, seconds. */
export const STEP = 1 / 60;

/** Player movement, pixels per second. */
export const PLAYER_WALK_SPEED = 132;
export const PLAYER_SNEAK_SPEED = 72;
export const PLAYER_RADIUS = 13;

/** Guard movement, pixels per second. */
export const GUARD_PATROL_SPEED = 56;
export const GUARD_SUSPICIOUS_SPEED = 80;
export const GUARD_CHASE_SPEED = 114;
export const GUARD_RADIUS = 14;
/** Seconds a guard waits at each patrol waypoint, scanning the room. */
export const GUARD_WAYPOINT_PAUSE = 1.15;

/** Vision: how far a guard sees, and how wide the cone opens (half-angle). */
export const VISION_RANGE = 178;
export const VISION_HALF_ANGLE = 0.62;

/** Detection meter, 0 to 1. Suspicion starts the investigate walk; 1 is a chase. */
export const DETECT_SUSPICIOUS = 0.4;
export const DETECT_ALARM = 1.0;
/** Detection fills this fast at point blank, slower at the cone's edge. */
export const DETECT_FILL_CLOSE = 1.7;
export const DETECT_FILL_FAR = 0.55;
/** Sneaking and standing in shadow slow the fill; both stack. */
export const DETECT_SNEAK_FACTOR = 0.45;
export const DETECT_SHADOW_FACTOR = 0.35;
/** How fast the meter drains while no guard can see the player. */
export const DETECT_DRAIN = 0.5;
/** Seconds of broken line of sight before a chasing guard gives up. */
export const CHASE_GIVE_UP_SECONDS = 2.5;
/** A guard this close catches the player. */
export const CATCH_DISTANCE = 22;

/** Pebbles: how many the player carries, how far one flies, how far its noise carries. */
export const PEBBLE_COUNT = 3;
export const PEBBLE_RANGE = 230;
export const PEBBLE_HEAR_RADIUS = 280;
export const PEBBLE_FLIGHT_SECONDS = 0.32;

/** Footstep ripples: one appears this often while moving (sneaking is quieter and rarer). */
export const FOOTSTEP_INTERVAL_WALK = 0.3;
export const FOOTSTEP_INTERVAL_SNEAK = 0.55;
export const FOOTSTEP_INTERVAL_GUARD = 0.42;

/** Palette — the night museum: cold floor, warm wood, hot cones, cold shadows. */
export const COLORS = {
  floorA: '#333a52',
  floorB: '#2e3449',
  floorLine: '#262c40',
  shadowFloor: '#1b2138',
  shadowHatch: '#141a2e',
  wall: '#5a3d26',
  wallTop: '#7a5233',
  wallEdge: '#3c2716',
  bookSpine: ['#a8443c', '#3c7aa8', '#c19a3f', '#5a8a4a', '#7a4a8a'],
  exit: '#39d98a',
  exitGlow: 'rgba(57, 217, 138, 0.35)',
  seal: '#ffd34d',
  sealGlow: 'rgba(255, 211, 77, 0.4)',
  player: '#8ef1ff',
  playerDark: '#1d7f96',
  cone: 'rgba(255, 214, 120, 0.30)',
  coneEdge: 'rgba(255, 214, 120, 0.55)',
  coneSuspicious: 'rgba(255, 176, 32, 0.38)',
  coneAlarm: 'rgba(255, 77, 77, 0.42)',
  darkness: 'rgba(4, 7, 18, 0.58)',
  hudBack: 'rgba(8, 11, 24, 0.82)',
  hudText: '#e8ecf7',
  hudDim: '#9aa3bd',
  suspicious: '#ffb020',
  alarm: '#ff4d4d',
  safe: '#39d98a',
};
