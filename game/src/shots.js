// The screenshot scenes behind ?shot=title|play|kitchen|escaped|caught. Each one
// plays the real rules forward from a fresh world for a fixed time, steered by a
// simple autopilot (change lanes away from the nearest hazard, jump the low ones,
// dash when the farmer is close, hide when a haystack is near), so the frame is
// what a real run looks like and the same seed always stages the same frame.
import { LANES, PLAYER } from './config.js';
import { EVENT_CAUGHT, EVENT_ESCAPED } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const STEP = 1 / 60;
const SAMPLE = 1 / 30;

/** Seconds until the turkey, moving in `lane`, is hit by a hazard; Infinity if safe. */
function timeToHit(state, lane, horizon) {
  const feetY = LANES[lane];
  const top = feetY - PLAYER.height + 8;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    for (const h of state.hazards) {
      if (h.x < -100) continue;
      // Rolling pins roll toward the turkey faster than the world scrolls.
      const approach = h.kind === 'rollingpin' ? 430 : 300;
      const hx = h.x - approach * t;
      if (hx + h.width < PLAYER.x - 8 || hx > PLAYER.x + PLAYER.width) continue;
      // A hanging knife is about to drop: treat its lane as dangerous while near.
      if (h.kind === 'knife' && h.state === 'hang') return t;
      const hTop = h.y;
      const hBottom = hTop + h.height;
      if (top < hBottom - 8 && top + PLAYER.height > hTop + 8) return t;
    }
  }
  return Infinity;
}

/** The autopilot's move for this frame: lane change, jump, dash or hide. */
function autopilot(world, state) {
  const p = state.player;
  // Hide when a haystack is right beside the turkey and the farmer is close.
  if (state.farmer.gap < 90) {
    for (const hay of state.haystacks) {
      if (Math.abs(hay.x - p.x) < 110 && hay.lane === p.lane) return { move: 0, jump: false, dash: false, hide: true };
    }
  }
  // Dash when the farmer is breathing down the turkey's neck.
  const dash = state.farmer.gap < 60 && state.dashCooldown <= 0;
  // Pick the safest lane, preferring the one with the most corn.
  let bestLane = p.lane;
  let bestTime = timeToHit(state, p.lane, 1.2);
  for (let lane = 0; lane < 3; lane += 1) {
    const t = timeToHit(state, lane, 1.2);
    if (t > bestTime) {
      bestTime = t;
      bestLane = lane;
    }
  }
  const move = bestLane > p.lane ? 1 : bestLane < p.lane ? -1 : 0;
  // Jump the low hazards in the turkey's lane when they are close.
  let jump = false;
  if (!p.jumping) {
    for (const h of state.hazards) {
      if (h.lane !== p.lane) continue;
      if (h.kind !== 'haybale' && h.kind !== 'rollingpin' && h.kind !== 'gravy') continue;
      if (h.x > p.x && h.x - p.x < 150) {
        jump = true;
        break;
      }
    }
  }
  return { move, jump, dash, hide: false };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * title: a fresh world under the title screen. play: ~24 s of piloted play in
 * the farmyard. kitchen: ~52 s, piloted into the kitchen zone. escaped: the
 * pilot runs the whole 1500 m. caught: a careless pilot that never dodges.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'kitchen' && name !== 'escaped' && name !== 'caught') {
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const targetSeconds = name === 'play' ? 20 : name === 'kitchen' ? 50 : 400;
  const careless = name === 'caught';
  let events = 0;
  for (let i = 0; i < targetSeconds / STEP; i += 1) {
    const act = careless
      ? { move: 0, jump: false, dash: false, hide: false }
      : autopilot(world, world.state);
    events = world.step(STEP, act.move, act.jump, act.dash, act.hide);
    if (events & EVENT_CAUGHT || events & EVENT_ESCAPED) break;
    if (world.state.over) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
