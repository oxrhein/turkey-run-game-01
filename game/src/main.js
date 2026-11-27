// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and game over.
//
// ?seed=N fixes the random pattern. ?shot=title|play|kitchen|escaped|caught
// (with &seed=N) stages that scene instead of running the loop, paints it and
// sets window.__shotReady for a screenshot. Any console error is also written
// into the status line, so a headless play-test can see it in the dumped DOM.
import { RULES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_PICKUP, EVENT_ESCAPED, EVENT_CAUGHT, EVENT_ZONE } from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_UP, ACTION_DOWN,
  ACTION_JUMP, ACTION_DASH, ACTION_HIDE, createInput,
} from './input.js';
import { createSoundBank } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const sounds = createSoundBank();

window.addEventListener('error', (event) => {
  status.textContent = `ERROR: ${event.message}`;
});

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(RULES.bestKey) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(RULES.bestKey, String(score));
  } catch {
    // A browser that blocks storage still plays; the best score just resets.
  }
}

let screen = SCREEN_TITLE;
let best = readBest();
let lastTime = performance.now();

/** Handle one frame's input for the current screen; returns the world events. */
function handleInput() {
  const actions = input.drain();
  let move = 0;
  let jump = false;
  let dash = false;
  let hide = false;
  for (const action of actions) {
    if (typeof action === 'object' && action.mouse) {
      const { x, y } = action.mouse;
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        startRun();
        return 0;
      }
      if (screen === SCREEN_PLAY) {
        // Click a lane to run there; click near the turkey to jump.
        if (Math.abs(x - world.state.player.x) < 90) jump = true;
        else if (y < 380) move = -1;
        else if (y > 500) move = 1;
        else jump = true;
      }
      continue;
    }
    if (action === ACTION_MUTE) {
      const muted = sounds.toggleMute();
      status.textContent = muted ? 'Sound off' : 'Sound on';
      continue;
    }
    if (action === ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      if (screen === SCREEN_PAUSED) sounds.stopMusic();
      else sounds.startMusic();
      continue;
    }
    if (action === ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        startRun();
        return 0;
      }
      continue;
    }
    if (screen !== SCREEN_PLAY) continue;
    if (action === ACTION_UP) move = -1;
    if (action === ACTION_DOWN) move = 1;
    if (action === ACTION_JUMP) jump = true;
    if (action === ACTION_DASH) dash = true;
    if (action === ACTION_HIDE) hide = true;
  }
  if (screen !== SCREEN_PLAY) return 0;
  return world.step(0, move, jump, dash, hide);
}

function startRun() {
  world.reset();
  screen = SCREEN_PLAY;
  sounds.unlock();
  sounds.gobble();
  sounds.startMusic();
  status.textContent = 'Gobble is running! Dodge the oven and the knife.';
}

function playEvents(events) {
  if (events & EVENT_HIT) sounds.thud();
  if (events & 32) sounds.jump();
  if (events & 64) sounds.dash();
  if (events & 128) sounds.hide();
  if (events & EVENT_PICKUP) {
    const s = world.state;
    if (s.shield || s.lives > 0) sounds.corn(s.combo);
  }
  if (events & EVENT_ZONE) sounds.powerup();
  if (events & EVENT_CAUGHT) {
    sounds.stopMusic();
    sounds.caught();
    finishRun();
  }
  if (events & EVENT_ESCAPED) {
    sounds.stopMusic();
    sounds.fanfare();
    finishRun();
  }
}

function finishRun() {
  screen = SCREEN_OVER;
  const s = world.state;
  if (s.score > best) {
    best = s.score;
    saveBest(best);
  }
  status.textContent = s.escaped
    ? `Escaped! Score ${s.score}, ${s.metres}m.`
    : `Caught after ${s.metres}m. Score ${s.score}.`;
}

function frame(now) {
  const dt = Math.min(MAX_FRAME, (now - lastTime) / 1000);
  lastTime = now;
  if (screen === SCREEN_PLAY) {
    // Fixed steps keep the run identical at any frame rate.
    let remaining = dt;
    while (remaining > 0) {
      const stepDt = Math.min(STEP, remaining);
      remaining -= stepDt;
      const immediate = handleInput();
      const events = world.step(stepDt, 0, false, false, false);
      playEvents(immediate | events);
      if (world.state.over) break;
    }
  } else {
    handleInput();
  }
  renderer.paint(world, screen, best, now / 1000);
  window.requestAnimationFrame(frame);
}

// A staged screenshot: play the scene forward, paint it once, signal readiness.
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  best = Math.max(best, staged.best);
  if (screen === SCREEN_OVER && world.state.escaped) {
    // The escaped shot keeps its confetti frozen at one moment.
  }
  renderer.paint(world, screen, best, 6.5);
  renderer.paint(world, screen, best, 6.5);
  window.__shotReady = true;
  window.__gobble = { state: world.state, screen };
} else {
  window.__gobble = { state: world.state, screen: () => screen };
  window.requestAnimationFrame(frame);
}
