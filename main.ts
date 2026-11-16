// SKYHARBOR — best-game-01 entrypoint (Node 22, standard library only).
//
// The game is a tower defence on the last skyport: waves of drones attack the
// port, the player builds and upgrades turrets, spends salvage on three
// abilities, and wins by clearing wave 12 (1-3 stars by hull remaining) or
// loses when the hull hits 0. Everything is plain static files under game/
// (game/index.html plus ES modules, no library, no network request) and four
// screenshots under screenshots/, each one staged by the game's own
// ?shot=title|play|victory|defeat scenes, so every shot is a real render of
// the game being played forward by its autopilot.
//
// This file hands the game in. It checks the two folders against the
// scorer's own caps first — so a bad snapshot fails here, loudly, instead of
// being refused silently by the grader — then copies game/ and screenshots/
// beside this file into the output directory and writes dossier.json there,
// the summary the judge reads, built with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this file lives, and where the hand-in goes.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, as the bounty states them: the text cap shapes the
// dossier's bytes, and every other cap is a refusal line — an entry over any
// of them is rejected, so we enforce the same lines here before copying.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

// SKYHARBOR's own requirements on top of the caps: the game must have its
// entry page, and every screenshot must be a JPEG or PNG the judge can show.
const GAME_ENTRY = 'index.html';
const SHOT_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

function abort(message: string): never {
  throw new Error(`SKYHARBOR hand-in refused: ${message}`);
}

// Walk a directory tree and tally what is in it: how many files, how many
// bytes in all, and the longest relative path. Directories themselves are
// not counted as files.
function tallyTree(dir: string, base: string): { files: number; bytes: number; longestPath: number } {
  let files = 0;
  let bytes = 0;
  let longestPath = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = full.slice(base.length + 1);
    longestPath = Math.max(longestPath, rel.length);
    const info = statSync(full);
    if (info.isDirectory()) {
      const sub = tallyTree(full, base);
      files += sub.files;
      bytes += sub.bytes;
      longestPath = Math.max(longestPath, sub.longestPath);
    } else if (info.isFile()) {
      files += 1;
      bytes += info.size;
    }
  }
  return { files, bytes, longestPath };
}

// Check game/ against the caps and SKYHARBOR's entry-page requirement.
function checkGame(gameDir: string): { files: number; bytes: number } {
  if (!existsSync(join(gameDir, GAME_ENTRY))) {
    abort(`game/ is missing its entry page ${GAME_ENTRY}`);
  }
  const tally = tallyTree(gameDir, gameDir);
  if (tally.files > CAPS.game_max_files) {
    abort(`game/ holds ${tally.files} files, over the ${CAPS.game_max_files} cap`);
  }
  if (tally.bytes > CAPS.game_max_bytes) {
    abort(`game/ holds ${tally.bytes} bytes, over the ${CAPS.game_max_bytes} cap`);
  }
  if (tally.longestPath > CAPS.game_path_max_bytes) {
    abort(`a path under game/ is ${tally.longestPath} bytes, over the ${CAPS.game_path_max_bytes} cap`);
  }
  return { files: tally.files, bytes: tally.bytes };
}

// Check screenshots/ against the caps: at most 4 shots, each under 256 KiB,
// each a JPEG or PNG. The first shot by name is the cover, so the names
// 1-title, 2-play, 3-victory, 4-defeat order the story.
function checkScreenshots(shotsDir: string): number {
  if (!existsSync(shotsDir)) return 0;
  const shots = readdirSync(shotsDir).filter((name) => statSync(join(shotsDir, name)).isFile());
  if (shots.length > CAPS.screenshots.max) {
    abort(`screenshots/ holds ${shots.length} shots, over the ${CAPS.screenshots.max} cap`);
  }
  for (const name of shots) {
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (!SHOT_EXTENSIONS.has(ext)) {
      abort(`screenshot ${name} is not a JPEG or PNG`);
    }
    const size = statSync(join(shotsDir, name)).size;
    if (size > CAPS.screenshots.max_bytes) {
      abort(`screenshot ${name} is ${size} bytes, over the ${CAPS.screenshots.max_bytes} cap`);
    }
  }
  return shots.length;
}

// Copy game/ and screenshots/ into the output directory, keeping the same
// layout the dossier is built from: game/ at the top, screenshots/ beside it.
function stageHandIn(): void {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  }
}

const gameStats = checkGame(join(repoRoot, 'game'));
const shotCount = checkScreenshots(join(repoRoot, 'screenshots'));
stageHandIn();

const dossier = buildDossier(outputDir, CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(
  `SKYHARBOR handed in: ${gameStats.files} game files (${gameStats.bytes} bytes), ` +
    `${shotCount} screenshots, dossier.json ${dossier.length} bytes -> ${outputDir}`,
);
