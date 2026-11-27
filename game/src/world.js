// The run itself: the turkey, the farmer who chases it, the hazards and pickups
// that scroll past, and the score. Pure logic, no drawing — render.js paints
// whatever this state holds, so the screenshot autopilot can drive it directly.
import { FIELD, LANES, PLAYER, GOAL_METRES, METRES_PER_PX, ZONES, HAZARDS, PICKUPS, RULES } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_ZONE = 16;

let nextId = 1;

function laneY(lane) {
  return LANES[lane];
}

function zoneFor(metres) {
  let zone = ZONES[0];
  for (const z of ZONES) if (metres >= z.fromMetres) zone = z;
  return zone;
}

/** A fresh run: turkey mid-field, farmer a little behind, nothing spawned yet. */
export function createWorld(random) {
  const state = {
    time: 0,
    distancePx: 0,
    metres: 0,
    score: 0,
    lives: RULES.lives,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    cornEaten: 0,
    shield: false,
    hidden: 0,
    dashTimer: 0,
    dashCooldown: 0,
    stumbleTimer: 0,
    spawnTimer: 0.9,
    powerupTimer: 14,
    haystackTimer: 9,
    zoneIndex: 0,
    zoneName: ZONES[0].name,
    over: false,
    escaped: false,
    reason: '',
    player: {
      lane: 1,
      x: PLAYER.x,
      y: laneY(1),
      vy: 0,
      jumping: false,
      width: PLAYER.width,
      height: PLAYER.height,
      runPhase: 0,
    },
    farmer: { gap: RULES.farmerStartGap, runPhase: 0, searching: 0 },
    hazards: [],
    pickups: [],
    haystacks: [],
    decorations: [],
    flashes: [],
  };

  function speed() {
    const base = ZONES[state.zoneIndex].speed;
    const factor = state.stumbleTimer > 0 ? RULES.stumbleSlow : 1;
    const dash = state.dashTimer > 0 ? PLAYER.dashSpeed : 1;
    return base * factor * dash;
  }

  function spawnPattern() {
    const zone = ZONES[state.zoneIndex];
    const kind = random.pick(zone.hazards);
    const def = HAZARDS[kind];
    const lane = random.int(0, 2);
    const x = FIELD.width + 60;
    if (kind === 'knife') {
      // A knife hangs above its lane, then drops when the turkey is near.
      state.hazards.push({ id: nextId++, kind, x, lane, y: -def.h, state: 'hang', timer: 0.55, width: def.w, height: def.h });
    } else if (kind === 'oven') {
      // An oven is tall: it blocks its lane and reaches into the one above,
      // so the answer is to change lanes, never to jump it.
      state.hazards.push({ id: nextId++, kind, x, lane: Math.min(lane, 1), y: laneY(Math.min(lane, 1)) - 130, width: def.w, height: def.h, flame: random.next() * 6 });
    } else if (kind === 'gravy') {
      state.hazards.push({ id: nextId++, kind, x, lane, y: laneY(lane) - def.h, width: def.w, height: def.h });
    } else if (kind === 'rollingpin') {
      state.hazards.push({ id: nextId++, kind, x, lane, y: laneY(lane) - def.h, width: def.w, height: def.h, roll: 0 });
    } else {
      state.hazards.push({ id: nextId++, kind, x, lane, y: laneY(lane) - def.h, width: def.w, height: def.h });
    }
    // A line of corn often trails a hazard, rewarding the lane that dodged it.
    if (random.next() < 0.75) {
      const cornLane = random.int(0, 2);
      const count = random.int(3, 5);
      for (let i = 0; i < count; i += 1) {
        state.pickups.push({ id: nextId++, kind: 'corn', x: x + 130 + i * 46, lane: cornLane, y: laneY(cornLane), width: PICKUPS.corn.w, height: PICKUPS.corn.h, bob: random.next() * 6 });
      }
    }
  }

  function spawnPowerup() {
    const kind = random.next() < 0.6 ? 'feather' : 'pie';
    const lane = random.int(0, 2);
    const def = PICKUPS[kind];
    state.pickups.push({ id: nextId++, kind, x: FIELD.width + 60, lane, y: laneY(lane), width: def.w, height: def.h, bob: 0 });
  }

  function spawnHaystack() {
    const lane = random.int(0, 2);
    state.haystacks.push({ id: nextId++, x: FIELD.width + 60, lane, y: laneY(lane), width: 96, height: 96 });
  }

  function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function playerBox() {
    const p = state.player;
    return { x: p.x - 8, y: p.y - p.height + 8, width: p.width, height: p.height - 8 };
  }

  function hitHazard(hazard) {
    if (state.shield) {
      state.shield = false;
      state.flashes.push({ text: 'SHIELD!', x: state.player.x + 30, y: state.player.y - 70, life: 1 });
      return EVENT_HIT;
    }
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.stumbleTimer = RULES.stumbleTime;
    state.farmer.gap = Math.max(0, state.farmer.gap - RULES.farmerStumbleClose);
    state.flashes.push({ text: 'OUCH!', x: state.player.x + 30, y: state.player.y - 70, life: 1 });
    if (state.lives <= 0 || state.farmer.gap <= 0) {
      state.over = true;
      state.escaped = false;
      state.reason = state.lives <= 0 ? 'The farmer caught up after three stumbles.' : 'The farmer grabbed Gobble by the tail!';
      return EVENT_HIT | EVENT_CAUGHT;
    }
    return EVENT_HIT;
  }

  function eatPickup(pickup) {
    if (pickup.kind === 'corn') {
      state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
      state.combo = Math.min(state.combo, RULES.comboMax);
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.comboTimer = RULES.comboWindow;
      state.cornEaten += 1;
      state.score += PICKUPS.corn.score * state.combo;
      if (state.cornEaten % 5 === 0) state.farmer.gap += RULES.farmerCornPushback;
      return EVENT_PICKUP;
    }
    if (pickup.kind === 'feather') {
      state.shield = true;
      state.flashes.push({ text: 'GOLDEN FEATHER — SHIELD!', x: state.player.x + 30, y: state.player.y - 70, life: 1.4 });
      return EVENT_PICKUP;
    }
    state.lives = Math.min(RULES.maxLives, state.lives + 1);
    state.flashes.push({ text: 'PUMPKIN PIE — +1 LIFE!', x: state.player.x + 30, y: state.player.y - 70, life: 1.4 });
    return EVENT_PICKUP;
  }

  /** Advance the run by `dt` seconds. `move` is -1, 0 or 1 (lane change). */
  function step(dt, move, jump, dash, hide) {
    if (state.over) return EVENT_NONE;
    let events = EVENT_NONE;
    state.time += dt;
    const p = state.player;

    // Lane changes, jumps and dashes answer at once.
    if (move !== 0) {
      p.lane = Math.max(0, Math.min(2, p.lane + move));
    }
    if (jump && !p.jumping) {
      p.jumping = true;
      p.vy = PLAYER.jumpVelocity;
      events |= 32; // jumped
    }
    if (dash && state.dashCooldown <= 0 && state.dashTimer <= 0) {
      state.dashTimer = PLAYER.dashTime;
      state.dashCooldown = PLAYER.dashCooldown;
      state.farmer.gap += RULES.dashGapGain;
      events |= 64; // dashed
    }
    if (hide && state.hidden <= 0) {
      for (const hay of state.haystacks) {
        if (Math.abs(hay.x - p.x) < 90 && hay.lane === p.lane) {
          state.hidden = PLAYER.hideTime;
          state.farmer.gap += RULES.farmerHidePushback;
          state.farmer.searching = 1.2;
          events |= 128; // hid
          break;
        }
      }
    }

    // Vertical motion: smooth lane glide plus jump arc.
    const targetY = laneY(p.lane);
    if (p.jumping) {
      p.vy += PLAYER.gravity * dt;
      p.y += p.vy * dt;
      if (p.y >= targetY) {
        p.y = targetY;
        p.jumping = false;
        p.vy = 0;
      }
    } else {
      const diff = targetY - p.y;
      const stepY = PLAYER.laneChangeSpeed * dt;
      p.y += Math.abs(diff) <= stepY ? diff : Math.sign(diff) * stepY;
    }

    // The world scrolls; distance and score grow with it.
    const v = speed();
    state.distancePx += v * dt;
    state.metres = Math.floor(state.distancePx * METRES_PER_PX);
    state.score += Math.floor(v * dt * 0.12);
    p.runPhase += dt * (v / 24);
    state.farmer.runPhase += dt * (v / 20);

    // The farmer closes in on every stumble and drifts back on a clean run.
    if (state.farmer.searching > 0) {
      state.farmer.searching -= dt;
    } else if (state.stumbleTimer <= 0 && state.hidden <= 0) {
      state.farmer.gap = Math.min(RULES.farmerStartGap + 60, state.farmer.gap + RULES.farmerRecover * dt);
    }
    if (state.farmer.gap <= 0 && !state.over) {
      state.over = true;
      state.escaped = false;
      state.reason = 'The farmer grabbed Gobble by the tail!';
      return events | EVENT_CAUGHT;
    }

    // Timers tick down.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.stumbleTimer > 0) state.stumbleTimer -= dt;
    if (state.dashTimer > 0) state.dashTimer -= dt;
    if (state.dashCooldown > 0) state.dashCooldown -= dt;
    if (state.hidden > 0) state.hidden -= dt;

    // A new zone changes the sky, the speed and the hazards on offer.
    const zone = zoneFor(state.metres);
    const zoneIndex = ZONES.indexOf(zone);
    if (zoneIndex !== state.zoneIndex) {
      state.zoneIndex = zoneIndex;
      state.zoneName = zone.name;
      events |= EVENT_ZONE;
      state.flashes.push({ text: zone.name + '!', x: FIELD.width / 2, y: 150, life: 2, big: true });
    }

    // Spawning: hazards on a beat, power-ups and haystacks on slower beats.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnPattern();
      state.spawnTimer = zone.spawnEvery * (0.85 + random.next() * 0.3);
    }
    state.powerupTimer -= dt;
    if (state.powerupTimer <= 0) {
      spawnPowerup();
      state.powerupTimer = 13 + random.next() * 6;
    }
    state.haystackTimer -= dt;
    if (state.haystackTimer <= 0) {
      spawnHaystack();
      state.haystackTimer = 8 + random.next() * 6;
    }

    // Move everything left, animate knives, roll the pins.
    const box = playerBox();
    for (const h of state.hazards) {
      h.x -= (v + (h.kind === 'rollingpin' ? HAZARDS.rollingpin.approach : 0)) * dt;
      if (h.kind === 'knife') {
        if (h.state === 'hang') {
          h.timer -= dt;
          h.y = -HAZARDS.knife.h + 30 + Math.sin(state.time * 3 + h.id) * 6;
          if (h.timer <= 0) h.state = 'drop';
        } else if (h.state === 'drop') {
          h.y += 900 * dt;
          if (h.y >= laneY(h.lane) - HAZARDS.knife.h + 10) {
            h.y = laneY(h.lane) - HAZARDS.knife.h + 10;
            h.state = 'landed';
          }
        }
      }
      if (h.kind === 'rollingpin') h.roll += dt * 9;
      if (h.kind === 'oven') h.flame = (h.flame + dt * 8) % 6;
    }
    for (const pk of state.pickups) {
      pk.x -= v * dt;
      pk.bob += dt * 4;
    }
    for (const hay of state.haystacks) hay.x -= v * dt;

    // Collisions: hazards hurt, pickups feed, gravy only slows.
    const hidden = state.hidden > 0;
    if (!hidden) {
      for (const h of state.hazards) {
        const hb = { x: h.x, y: h.y, width: h.width - 10, height: h.height - 8 };
        if (h.kind === 'gravy') {
          if (overlaps(box, { x: h.x, y: laneY(h.lane) - 10, width: h.width, height: 20 }) && !p.jumping) {
            state.stumbleTimer = Math.max(state.stumbleTimer, 0.15);
          }
          continue;
        }
        if (h.kind === 'knife' && h.state !== 'drop') continue;
        if (overlaps(box, hb)) {
          events |= hitHazard(h);
          h.x = -9999; // spent: one hazard hits once
          if (state.over) return events;
        }
      }
      for (const pk of state.pickups) {
        const pb = { x: pk.x, y: pk.y - pk.height + 6 + Math.sin(pk.bob) * 3, width: pk.width, height: pk.height };
        if (overlaps(box, pb)) {
          events |= eatPickup(pk);
          pk.x = -9999;
        }
      }
    }

    // Sweep what scrolled off, and the floating texts.
    state.hazards = state.hazards.filter((h) => h.x > -220);
    state.pickups = state.pickups.filter((pk) => pk.x > -120);
    state.haystacks = state.haystacks.filter((hay) => hay.x > -220);
    for (const f of state.flashes) {
      f.life -= dt;
      f.y -= 24 * dt;
    }
    state.flashes = state.flashes.filter((f) => f.life > 0);

    // The Freedom Gate: 1500 metres and the turkey is out.
    if (state.metres >= GOAL_METRES && !state.over) {
      state.over = true;
      state.escaped = true;
      state.reason = 'Gobble slipped the gate and vanished into the woods!';
      events |= EVENT_ESCAPED;
    }
    return events;
  }

  function reset() {
    const freshState = createWorld(random).state;
    Object.keys(state).forEach((k) => {
      state[k] = freshState[k];
    });
  }

  return { state, step, reset, speed, zoneFor };
}
