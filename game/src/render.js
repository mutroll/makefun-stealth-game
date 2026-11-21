// The Quiet Archive — the painter. One canvas, drawn in layers: the museum
// floor and shelves, the seals and the glowing exit, the guards with their
// vision cones, the thief and its footstep ripples, then a night darkness with
// holes of light around the thief and the exit, then the HUD and the screens.
import { TILE, VIEW_W, VIEW_H, VISION_RANGE, VISION_HALF_ANGLE, DETECT_SUSPICIOUS, COLORS } from './config.js';
import { isWallTile, isShadowTile } from './level.js';
import { GUARD_CHASE, GUARD_SUSPICIOUS } from './guards.js';
import { STATUS_WON, STATUS_CAUGHT, sealsCollected, sealsTotal, elapsedSeconds } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_CAUGHT = 'caught';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  const dark = document.createElement('canvas');
  dark.width = VIEW_W;
  dark.height = VIEW_H;
  const darkCtx = dark.getContext('2d');

  function drawFloor(level) {
    for (let ty = 0; ty < level.rows; ty += 1) {
      for (let tx = 0; tx < level.cols; tx += 1) {
        const x = tx * TILE;
        const y = ty * TILE;
        if (isWallTile(level, tx, ty)) continue;
        ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(x, y, TILE, TILE);
        if (isShadowTile(level, tx, ty)) {
          ctx.fillStyle = COLORS.shadowFloor;
          ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = COLORS.shadowHatch;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 6, y + TILE - 6);
          ctx.lineTo(x + TILE - 6, y + 6);
          ctx.moveTo(x + 6, y + 14);
          ctx.lineTo(x + 14, y + 6);
          ctx.moveTo(x + TILE - 14, y + TILE - 6);
          ctx.lineTo(x + TILE - 6, y + TILE - 14);
          ctx.stroke();
        }
        ctx.strokeStyle = COLORS.floorLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  function drawWalls(level) {
    for (let ty = 0; ty < level.rows; ty += 1) {
      for (let tx = 0; tx < level.cols; tx += 1) {
        if (!isWallTile(level, tx, ty)) continue;
        const x = tx * TILE;
        const y = ty * TILE;
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x + 2, y + 2, TILE - 4, 9);
        // Book spines along the shelf: short coloured bars.
        for (let i = 0; i < 5; i += 1) {
          ctx.fillStyle = COLORS.bookSpine[(tx * 3 + ty * 5 + i) % COLORS.bookSpine.length];
          ctx.fillRect(x + 5 + i * 6, y + 13, 4, 20);
        }
        ctx.strokeStyle = COLORS.wallEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      }
    }
  }

  function drawExit(world) {
    const exit = world.level.exit;
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 3);
    const cx = exit.x;
    const cy = exit.y;
    ctx.save();
    ctx.shadowColor = COLORS.exit;
    ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(cx - 15, cy - 17, 30, 34);
    ctx.restore();
    ctx.fillStyle = '#0d2b1d';
    ctx.fillRect(cx - 9, cy - 11, 18, 22);
    ctx.fillStyle = COLORS.exit;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Below the door: the HUD bar covers anything drawn above it on row 1.
    ctx.fillText('EXIT', cx, cy + 30);
  }

  function drawSeals(world) {
    for (const seal of world.seals) {
      if (seal.taken) continue;
      const pulse = 0.7 + 0.3 * Math.sin(world.time * 4 + seal.id);
      ctx.save();
      ctx.translate(seal.x, seal.y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = COLORS.seal;
      ctx.shadowBlur = 14 * pulse;
      ctx.fillStyle = COLORS.seal;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.restore();
      ctx.fillStyle = '#7a5c00';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(seal.id), seal.x, seal.y);
    }
  }

  function drawRipples(world) {
    for (const ripple of world.ripples) {
      const progress = ripple.age / 0.9;
      const radius = 6 + progress * (ripple.loud ? 26 : 15);
      ctx.strokeStyle = ripple.loud
        ? `rgba(200, 220, 255, ${0.55 * (1 - progress)})`
        : `rgba(160, 190, 230, ${0.35 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const print of world.footprints) {
      const progress = print.age / 2.4;
      ctx.fillStyle = `${print.color}${Math.round(150 * (1 - progress)).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(print.x, print.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (world.noise) {
      const progress = world.noise.age / 1.0;
      ctx.strokeStyle = `rgba(255, 220, 120, ${0.8 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(world.noise.x, world.noise.y, 8 + progress * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (world.pebble) {
      const pebble = world.pebble;
      const t = Math.min(1, pebble.age / 0.32);
      const x = pebble.fromX + (pebble.x - pebble.fromX) * t;
      const y = pebble.fromY + (pebble.y - pebble.fromY) * t - Math.sin(t * Math.PI) * 18;
      ctx.fillStyle = '#d8d2c0';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCone(guard) {
    const colour =
      guard.state === GUARD_CHASE
        ? COLORS.coneAlarm
        : guard.state === GUARD_SUSPICIOUS
          ? COLORS.coneSuspicious
          : COLORS.cone;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, VISION_RANGE, guard.angle - VISION_HALF_ANGLE, guard.angle + VISION_HALF_ANGLE);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.coneEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, VISION_RANGE, guard.angle - VISION_HALF_ANGLE, guard.angle + VISION_HALF_ANGLE);
    ctx.closePath();
    ctx.stroke();
  }

  function drawGuard(guard) {
    drawCone(guard);
    // Torch dot at the cone's tip.
    const tipX = guard.x + Math.cos(guard.angle) * (VISION_RANGE - 6);
    const tipY = guard.y + Math.sin(guard.angle) * (VISION_RANGE - 6);
    ctx.fillStyle = 'rgba(255, 230, 150, 0.9)';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
    ctx.fill();
    // Body: a hooded archivist, tunic colour with a pale face.
    ctx.fillStyle = guard.color;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e6c8';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle) * 5, guard.y + Math.sin(guard.angle) * 5, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    // "!" while suspicious, red "!" while chasing.
    if (guard.state === GUARD_SUSPICIOUS || guard.state === GUARD_CHASE) {
      ctx.fillStyle = guard.state === GUARD_CHASE ? COLORS.alarm : COLORS.suspicious;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('!', guard.x, guard.y - 18);
    }
    // Suspicion arc above the guard.
    if (guard.suspicion > 0.05) {
      ctx.strokeStyle = guard.suspicion >= 0.4 ? COLORS.suspicious : '#e8ecf7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(232, 236, 247, 0.85)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(guard.name, guard.x, guard.y + 17);
  }

  function drawPlayer(world) {
    const player = world.player;
    const bob = player.moving ? Math.sin(world.time * 14) * 1.5 : 0;
    // A short, dim beam ahead of the thief, showing which way it is facing.
    ctx.fillStyle = 'rgba(255, 240, 190, 0.10)';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.arc(player.x, player.y, 74, player.angle - 0.35, player.angle + 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    // Hood point in the facing direction.
    ctx.fillStyle = COLORS.playerDark;
    ctx.beginPath();
    ctx.arc(
      player.x + Math.cos(player.angle) * 7,
      player.y + bob + Math.sin(player.angle) * 7,
      6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob, 13, 0, Math.PI * 2);
    ctx.stroke();
    if (player.sneaking) {
      ctx.fillStyle = 'rgba(232, 236, 247, 0.9)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('sneaking', player.x, player.y + 16);
    }
  }

  /** Night darkness, with holes of light around the thief, the exit and each cone. */
  function drawDarkness(world) {
    darkCtx.clearRect(0, 0, VIEW_W, VIEW_H);
    darkCtx.fillStyle = COLORS.darkness;
    darkCtx.fillRect(0, 0, VIEW_W, VIEW_H);
    darkCtx.globalCompositeOperation = 'destination-out';
    function hole(x, y, radius, strength) {
      const gradient = darkCtx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      darkCtx.fillStyle = gradient;
      darkCtx.beginPath();
      darkCtx.arc(x, y, radius, 0, Math.PI * 2);
      darkCtx.fill();
    }
    hole(world.player.x, world.player.y, 175, 0.92);
    hole(world.level.exit.x, world.level.exit.y, 130, 0.75);
    for (const guard of world.guards) {
      const midX = guard.x + Math.cos(guard.angle) * VISION_RANGE * 0.45;
      const midY = guard.y + Math.sin(guard.angle) * VISION_RANGE * 0.45;
      hole(guard.x, guard.y, 60, 0.5);
      hole(midX, midY, 95, 0.45);
    }
    darkCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }

  function drawHud(world, screen, best) {
    ctx.fillStyle = COLORS.hudBack;
    ctx.fillRect(0, 0, VIEW_W, 40);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE QUIET ARCHIVE', 12, 21);
    // Seal fragments.
    for (let i = 0; i < sealsTotal(world); i += 1) {
      const x = 250 + i * 26;
      ctx.save();
      ctx.translate(x, 20);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i < sealsCollected(world) ? COLORS.seal : '#4a5068';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    }
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px sans-serif';
    ctx.fillText(`${sealsCollected(world)}/${sealsTotal(world)} seals`, 330, 21);
    // Pebbles.
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(`pebbles ${world.player.pebbles}`, 430, 21);
    // Detection meter.
    const detection = world.detection;
    const barX = 560;
    const barW = 150;
    ctx.fillStyle = '#2a2f45';
    roundRect(ctx, barX, 13, barW, 14, 7);
    ctx.fill();
    ctx.fillStyle =
      detection >= 0.99 ? COLORS.alarm : detection >= DETECT_SUSPICIOUS ? COLORS.suspicious : COLORS.safe;
    if (detection > 0.01) {
      roundRect(ctx, barX, 13, Math.max(14, barW * detection), 14, 7);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '12px sans-serif';
    ctx.fillText(world.alarm ? 'SPOTTED!' : detection >= 0.4 ? 'suspicious…' : 'unseen', barX + barW + 10, 21);
    // Clock and best time.
    const seconds = elapsedSeconds(world);
    const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    ctx.textAlign = 'right';
    ctx.fillText(best ? `best ${best}s · ${clock}` : clock, VIEW_W - 12, 21);
    ctx.textAlign = 'left';
    // Objective line along the bottom.
    ctx.fillStyle = 'rgba(8, 11, 24, 0.72)';
    ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px sans-serif';
    ctx.fillText(
      'WASD / arrows move · Shift sneak · click tosses a pebble · reach the green EXIT unseen · R restart · P pause',
      12,
      VIEW_H - 13,
    );
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(4, 7, 18, 0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawCentred('PAUSED', 'Press P or Space to keep sneaking', 300);
    }
  }

  function drawCentred(title, subtitle, y) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(title, VIEW_W / 2, y);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '16px sans-serif';
    ctx.fillText(subtitle, VIEW_W / 2, y + 44);
    ctx.textAlign = 'left';
  }

  function drawTitle(world) {
    ctx.fillStyle = 'rgba(4, 7, 18, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawCentred('THE QUIET ARCHIVE', 'a night heist in the museum of sealed things', 190);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '15px sans-serif';
    const lines = [
      'Sneak past the five archivist-guards and their torch cones.',
      'Shelves block their sight. Dark patches hide you. Pebbles distract them.',
      'Collect the 3 seal fragments if you dare — then reach the green EXIT unseen.',
      '',
      'WASD / arrows — move      Shift — sneak      Click — toss a pebble',
      'R — restart      P — pause      M — mute',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 268 + i * 24));
    ctx.fillStyle = COLORS.seal;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Press Space or click to begin', VIEW_W / 2, 470);
    ctx.textAlign = 'left';
  }

  function drawEnd(world, screen, best) {
    const won = screen === SCREEN_WON;
    ctx.fillStyle = won ? 'rgba(6, 26, 16, 0.78)' : 'rgba(30, 6, 10, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const seconds = elapsedSeconds(world);
    const title = won ? 'ESCAPED — UNSEEN' : 'CAUGHT';
    const subtitle = won
      ? `${sealsCollected(world)} of ${sealsTotal(world)} seals · ${seconds}s${best ? ` · best ${best}s` : ''}${sealsCollected(world) === sealsTotal(world) ? ' · a flawless heist' : ''}`
      : 'A torch found you. The archive keeps its seals — this time.';
    drawCentred(title, subtitle, 270);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '16px sans-serif';
    ctx.fillText('Press R or Space to sneak again', VIEW_W / 2, 360);
    ctx.textAlign = 'left';
  }

  /** Paint one frame: the world plus the screen on top of it. */
  function draw(world, screen, best) {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawFloor(world.level);
    drawSeals(world);
    drawExit(world);
    drawWalls(world.level);
    drawRipples(world);
    for (const guard of world.guards) drawGuard(guard);
    drawPlayer(world);
    drawDarkness(world);
    drawHud(world, screen, best);
    if (screen === SCREEN_TITLE) drawTitle(world);
    else if (screen === SCREEN_WON || screen === SCREEN_CAUGHT) drawEnd(world, screen, best);
  }

  return { draw };
}
