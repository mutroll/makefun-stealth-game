// The Quiet Archive — boot and the one loop: keyboard and mouse in, the world
// forward in fixed 1/60 s steps, the renderer painting what is there. The game
// moves between title, play, paused, escaped and caught.
//
// ?seed=N fixes nothing random (the world is deterministic) but is accepted for
// parity with the kit's starter. ?shot=cover|patrol|hide|exit stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { STEP, VIEW_W, VIEW_H } from './config.js';
import { createWorld, stepWorld, resetWorld } from './world.js';
import { createSoundBank } from './audio.js';
import { throwPebble } from './player.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WON, SCREEN_CAUGHT } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;
const BEST_KEY = 'quiet-archive-best-seconds';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const sounds = createSoundBank();

const keys = new Set();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastSuspicion = 0;
  let lastAlarm = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetWorld(world);
    accumulator = 0;
    lastSuspicion = 0;
    lastAlarm = false;
    screen = SCREEN_PLAY;
    sounds.unlock();
    sounds.click();
    announce('Playing. Reach the green exit unseen.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WON : SCREEN_CAUGHT;
    if (won) {
      sounds.win();
      const seconds = Math.floor(world.time);
      if (best === 0 || seconds < best) {
        best = seconds;
        saveBest(best);
      }
      announce(`Escaped in ${seconds} seconds.`);
    } else {
      sounds.caught();
      announce('Caught. Press R to try again.');
    }
  }

  function readInput() {
    let mx = 0;
    let my = 0;
    if (keys.has('arrowleft') || keys.has('a')) mx -= 1;
    if (keys.has('arrowright') || keys.has('d')) mx += 1;
    if (keys.has('arrowup') || keys.has('w')) my -= 1;
    if (keys.has('arrowdown') || keys.has('s')) my += 1;
    if (mx !== 0 && my !== 0) {
      const length = Math.hypot(mx, my);
      mx /= length;
      my /= length;
    }
    return { mx, my, sneak: keys.has('shift') };
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (key === 'r') {
      startGame();
      return;
    }
    if (key === 'm') {
      const muted = sounds.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
      return;
    }
    if (key === 'p' || key === 'escape') {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (key === ' ' || key === 'enter') {
      sounds.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_CAUGHT) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      return;
    }
    keys.add(key);
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });

  canvas.addEventListener('pointerdown', (event) => {
    sounds.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_CAUGHT) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const point = canvasPoint(event);
    if (throwPebble(world, point.x, point.y)) sounds.pebble();
  });

  // The sounds that follow the world: suspicion rising, the alarm, a seal taken.
  world.onSeal = () => sounds.seal();
  world.onNoise = () => sounds.pebble();

  function step() {
    const events = stepWorld(world, readInput(), STEP);
    if (world.detection >= 0.4 && lastSuspicion < 0.4) sounds.suspicious();
    if (world.alarm && !lastAlarm) sounds.alarm();
    lastSuspicion = world.detection;
    lastAlarm = world.alarm;
    if (world.player.stepped) sounds.footstep(world.player.sneaking);
    if (events === 'won') endGame(true);
    else if (events === 'caught') endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Quiet Archive. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
