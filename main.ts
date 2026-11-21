// The Quiet Archive — the hand-in program (Node 22, standard library only).
// It copies the static game and the screenshots beside this file into the
// output directory and writes the dossier the judge reads, built by the
// vendored make.fun library. It writes the same bytes on every run, because
// it copies files and derives the dossier from them, and nothing else.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const gameSource = join(repoRoot, 'game');
const shotsSource = join(repoRoot, 'screenshots');
if (!existsSync(gameSource)) throw new Error('game/ is missing from the repository');
if (!existsSync(shotsSource)) throw new Error('screenshots/ is missing from the repository');

// Start from an empty output directory, so a stale file can never ride along.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

cpSync(gameSource, join(outputDir, 'game'), { recursive: true });
cpSync(shotsSource, join(outputDir, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the others refuse
// an entry the scorer would refuse (more than 4 screenshots or one over 256 KiB;
// more than 993 files in game/ or 48 MiB of game files in all, or a path under
// game/ over 1000 bytes).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`wrote ${outputDir} (dossier.json ${dossier.length} bytes)`);
