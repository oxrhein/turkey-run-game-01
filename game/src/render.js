// Every pixel of Gobble Dash is drawn here with canvas paths: the turkey, the
// farmer, the five hazards, the three zones' scenery, the HUD and the screens.
// No image files ship with the game, so nothing can fail to load.
import { FIELD, LANES, ZONES, GOAL_METRES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px 'Trebuchet MS', Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  /** Sky, sun, clouds and the far scenery of the current zone. */
  function drawSky(zone, scroll) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, zone.sky[0]);
    g.addColorStop(0.55, zone.sky[1]);
    g.addColorStop(1, zone.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Sun (farmyard) or a warm kitchen lamp glow (kitchen).
    const sunX = 1050 - (scroll * 0.01) % 200;
    ctx.fillStyle = 'rgba(255, 236, 170, 0.9)';
    ellipse(ctx, sunX, 90, 46, 46);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 214, 120, 0.5)';
    ellipse(ctx, sunX, 90, 66, 66);
    ctx.fill();
    // Drifting clouds.
    ctx.fillStyle = 'rgba(255, 250, 240, 0.85)';
    for (let i = 0; i < 4; i += 1) {
      const cx = ((i * 340 - scroll * 0.08) % (FIELD.width + 300) + FIELD.width + 300) % (FIELD.width + 300) - 150;
      const cy = 70 + i * 42;
      ellipse(ctx, cx, cy, 62, 20);
      ctx.fill();
      ellipse(ctx, cx + 44, cy + 8, 44, 16);
      ctx.fill();
    }
    // Far scenery: barn and fence in the farm zones, a kitchen wall indoors.
    if (zone.name === 'KITCHEN') {
      ctx.fillStyle = '#4a2c3e';
      ctx.fillRect(0, 150, FIELD.width, 10);
      ctx.fillStyle = '#5d3a4e';
      for (let i = 0; i < 5; i += 1) {
        const px = 120 + i * 240;
        ctx.fillRect(px, 160, 90, 90);
        ctx.fillStyle = '#3a2333';
        ctx.fillRect(px + 12, 172, 66, 66);
        ctx.fillStyle = '#5d3a4e';
      }
    } else {
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(0, 210, FIELD.width, 8);
      for (let x = -((scroll * 0.3) % 90); x < FIELD.width; x += 90) {
        ctx.fillRect(x, 180, 10, 60);
      }
      // The red barn, far away.
      ctx.fillStyle = '#a33327';
      ctx.fillRect(880, 130, 180, 110);
      ctx.fillStyle = '#7e241b';
      ctx.beginPath();
      ctx.moveTo(870, 132);
      ctx.lineTo(970, 70);
      ctx.lineTo(1070, 132);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f5e6c8';
      ctx.fillRect(950, 180, 40, 60);
    }
  }

  /** The dirt track with three lane guides and scattered autumn leaves. */
  function drawGround(zone, scroll) {
    ctx.fillStyle = zone.ground;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 6);
    // Lane guides: dotted lines the turkey runs between.
    ctx.strokeStyle = 'rgba(255, 240, 210, 0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 18]);
    for (const y of [LANES[0] + 62, LANES[1] + 62]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Leaves scrolling past.
    const leafColors = ['#d97b2b', '#c94f2e', '#e8a13a', '#8a5a2b'];
    for (let i = 0; i < 26; i += 1) {
      const lx = ((i * 173 - scroll * 1.0) % (FIELD.width + 80) + FIELD.width + 80) % (FIELD.width + 80) - 40;
      const ly = FIELD.groundY + 12 + ((i * 53) % 82);
      ctx.fillStyle = leafColors[i % leafColors.length];
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate((i * 0.7) % Math.PI);
      ellipse(ctx, 0, 0, 7, 4);
      ctx.fill();
      ctx.restore();
    }
  }

  /** A haystack: the turkey's hiding place. Wobbles when something hides in it. */
  function drawHaystack(hay, time) {
    const wobble = Math.sin(time * 6 + hay.id) * 2;
    ctx.fillStyle = '#d9a83c';
    ctx.beginPath();
    ctx.moveTo(hay.x - 10, hay.y + 4);
    ctx.quadraticCurveTo(hay.x + hay.width / 2 + wobble, hay.y - hay.height - 8, hay.x + hay.width + 10, hay.y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b5822a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(hay.x + 8 + i * 18, hay.y - 8 - i * 6);
      ctx.lineTo(hay.x + 14 + i * 18, hay.y - 42 - i * 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5a2b';
    text(ctx, 'HIDE: ↓', hay.x + hay.width / 2, hay.y - hay.height - 16, 15, '#fff', 'center', 'bold');
  }

  /** The turkey: brown body, fanned tail, red wattle, running legs. */
  function drawTurkey(p, time, hidden) {
    if (hidden > 0) return; // inside the haystack: only the stack shows
    const x = p.x;
    const feetY = p.y;
    const legSwing = Math.sin(p.runPhase * 2.4) * 10;
    const air = p.jumping;
    ctx.save();
    ctx.translate(x, feetY);
    // Tail fan: five feathers behind the body.
    ctx.fillStyle = '#7a4a21';
    for (let i = -2; i <= 2; i += 1) {
      ctx.save();
      ctx.rotate(i * 0.32 - 0.5);
      ellipse(ctx, -34, -26, 9, 26);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#a9702f';
    for (let i = -2; i <= 2; i += 1) {
      ctx.save();
      ctx.rotate(i * 0.32 - 0.5);
      ellipse(ctx, -30, -24, 5, 20);
      ctx.fill();
      ctx.restore();
    }
    // Legs.
    ctx.strokeStyle = '#e8a13a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(-8 + (air ? 0 : legSwing), 0);
    ctx.moveTo(8, -12);
    ctx.lineTo(10 + (air ? 0 : -legSwing), 0);
    ctx.stroke();
    // Body.
    ctx.fillStyle = '#8a5a2b';
    ellipse(ctx, 0, -30, 34, 26);
    ctx.fill();
    ctx.fillStyle = '#a9702f';
    ellipse(ctx, 6, -34, 24, 18);
    ctx.fill();
    // Wing.
    ctx.fillStyle = '#6e4520';
    ctx.save();
    ctx.translate(-2, -30);
    ctx.rotate(air ? -0.5 : Math.sin(p.runPhase * 2.4) * 0.25);
    ellipse(ctx, 0, 0, 18, 10);
    ctx.fill();
    ctx.restore();
    // Neck and head.
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(22, -44);
    ctx.quadraticCurveTo(30, -58, 34, -62);
    ctx.stroke();
    ctx.fillStyle = '#c98a4b';
    ellipse(ctx, 36, -64, 13, 12);
    ctx.fill();
    // Beak, wattle, eye.
    ctx.fillStyle = '#e8a13a';
    ctx.beginPath();
    ctx.moveTo(46, -66);
    ctx.lineTo(60, -61);
    ctx.lineTo(46, -57);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d23b2e';
    ellipse(ctx, 42, -54, 4, 7);
    ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ellipse(ctx, 40, -68, 2.6, 2.6);
    ctx.fill();
    ctx.restore();
  }

  /** The farmer: straw hat, plaid shirt, overalls, pitchfork, closing in. */
  function drawFarmer(farmer, playerX, playerY, time) {
    // The farmer always lurks at the left edge, even at his farthest gap,
    // so the chase reads in every frame; the gap number decides the catch.
    const x = Math.max(playerX - farmer.gap - 46, 6);
    if (x < -140) return;
    const feetY = playerY;
    const swing = Math.sin(farmer.runPhase * 2.4) * 12;
    ctx.save();
    ctx.translate(x, feetY);
    // Legs (overalls).
    ctx.strokeStyle = '#3a5a8a';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -34);
    ctx.lineTo(-8 + swing, 0);
    ctx.moveTo(6, -34);
    ctx.lineTo(10 - swing, 0);
    ctx.stroke();
    // Body: red plaid shirt.
    ctx.fillStyle = '#b03030';
    roundRect(ctx, -16, -78, 38, 48, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -62);
    ctx.lineTo(22, -62);
    ctx.moveTo(-16, -46);
    ctx.lineTo(22, -46);
    ctx.stroke();
    // Arm reaching forward with the pitchfork.
    ctx.strokeStyle = '#e8b88a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(14, -66);
    ctx.lineTo(34, -52);
    ctx.stroke();
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(34, -84);
    ctx.lineTo(44, -30);
    ctx.stroke();
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(34 + i * 5, -84);
      ctx.lineTo(30 + i * 6, -98);
      ctx.stroke();
    }
    // Head and straw hat.
    ctx.fillStyle = '#e8b88a';
    ellipse(ctx, 4, -88, 13, 14);
    ctx.fill();
    ctx.fillStyle = '#e8c93a';
    ellipse(ctx, 4, -96, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#d9b83a';
    ellipse(ctx, 4, -102, 13, 8);
    ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ellipse(ctx, 10, -90, 2.4, 2.4);
    ctx.fill();
    // Angry brows + moustache.
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(5, -95);
    ctx.lineTo(14, -92);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -80);
    ctx.lineTo(18, -80);
    ctx.stroke();
    if (farmer.searching > 0) {
      text(ctx, '?', 4, -128, 34, '#fff');
    } else if (farmer.gap < 70) {
      text(ctx, '!', 4, -128, 34, '#ff5340');
    }
    ctx.restore();
  }

  /** The five hazards, each drawn so its answer reads at a glance. */
  function drawHazard(h, time) {
    if (h.kind === 'oven') {
      // A kitchen oven: grey box, glowing door, chimney smoke.
      ctx.fillStyle = '#5a5a62';
      roundRect(ctx, h.x, h.y, h.width, h.height, 8);
      ctx.fill();
      ctx.fillStyle = '#3c3c44';
      ctx.fillRect(h.x + 8, h.y + 8, h.width - 16, 18);
      ctx.fillStyle = '#ff7a2e';
      const flicker = 0.6 + 0.4 * Math.sin(time * 7 + h.flame);
      ctx.globalAlpha = flicker;
      roundRect(ctx, h.x + 14, h.y + 44, h.width - 28, 56, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2e2e34';
      ctx.fillRect(h.x + 14, h.y + 44, h.width - 28, 10);
      ctx.fillStyle = '#8a8a94';
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(h.x + 14, h.y + 108 + i * 12, h.width - 28, 4);
      }
      // Smoke puffs from the chimney.
      ctx.fillStyle = 'rgba(220,220,220,0.55)';
      for (let i = 0; i < 3; i += 1) {
        const sy = h.y - 12 - ((time * 30 + i * 22 + h.flame * 9) % 66);
        ellipse(ctx, h.x + h.width / 2 + Math.sin(time * 2 + i) * 6, sy, 9 + i * 2, 7 + i);
        ctx.fill();
      }
      text(ctx, 'HOT!', h.x + h.width / 2, h.y - 16, 15, '#fff');
    } else if (h.kind === 'haybale') {
      ctx.fillStyle = '#d9a83c';
      roundRect(ctx, h.x, h.y, h.width, h.height, 14);
      ctx.fill();
      ctx.strokeStyle = '#b5822a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(h.x + 6, h.y + 10 + i * 13);
        ctx.lineTo(h.x + h.width - 6, h.y + 14 + i * 13);
        ctx.stroke();
      }
    } else if (h.kind === 'rollingpin') {
      ctx.save();
      ctx.translate(h.x + h.width / 2, h.y + h.height / 2);
      ctx.rotate(h.roll || 0);
      ctx.fillStyle = '#a9703a';
      roundRect(ctx, -h.width / 2, -h.height / 2, h.width, h.height, 14);
      ctx.fill();
      ctx.fillStyle = '#c98a4b';
      roundRect(ctx, -h.width / 2 + 12, -h.height / 2 + 4, h.width - 24, h.height - 8, 10);
      ctx.fill();
      ctx.restore();
      text(ctx, 'JUMP!', h.x + h.width / 2, h.y - 16, 15, '#fff');
    } else if (h.kind === 'gravy') {
      ctx.fillStyle = '#6e4520';
      ellipse(ctx, h.x + h.width / 2, h.y + h.height / 2, h.width / 2, h.height / 2);
      ctx.fill();
      ctx.fillStyle = '#8a5a2b';
      ellipse(ctx, h.x + h.width / 2 - 14, h.y + h.height / 2 - 2, h.width / 4, 4);
      ctx.fill();
      text(ctx, 'GRAVY — SLOWS YOU', h.x + h.width / 2, h.y - 14, 13, '#ffe9b0');
    } else if (h.kind === 'knife') {
      // A carving knife: wooden handle, silver blade, drops when the time is right.
      ctx.save();
      ctx.translate(h.x + h.width / 2, h.y + h.height / 2);
      if (h.state === 'hang') {
        ctx.globalAlpha = 0.9;
        text(ctx, '⚠', 0, -h.height / 2 - 16, 22, '#ff5340');
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#5a3a1a';
      roundRect(ctx, -8, -h.height / 2, 16, 34, 5);
      ctx.fill();
      ctx.fillStyle = '#dfe6ea';
      ctx.beginPath();
      ctx.moveTo(-9, -h.height / 2 + 34);
      ctx.lineTo(9, -h.height / 2 + 34);
      ctx.lineTo(0, h.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(-4, -h.height / 2 + 40);
      ctx.lineTo(2, -h.height / 2 + 40);
      ctx.lineTo(0, h.height / 2 - 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /** Corn, golden feathers and pumpkin pie. */
  function drawPickup(pk) {
    const bob = Math.sin(pk.bob) * 3;
    if (pk.kind === 'corn') {
      ctx.save();
      ctx.translate(pk.x + pk.width / 2, pk.y - pk.height / 2 + bob);
      ctx.fillStyle = '#e8c93a';
      ellipse(ctx, 0, 0, 12, 18);
      ctx.fill();
      ctx.fillStyle = '#f7d95a';
      for (let r = -1; r <= 1; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          ellipse(ctx, r * 7, -10 + c * 10, 2.4, 3.4);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#4a8a3a';
      ctx.beginPath();
      ctx.moveTo(-10, 8);
      ctx.lineTo(-4, 20);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, 8);
      ctx.lineTo(4, 20);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (pk.kind === 'feather') {
      ctx.save();
      ctx.translate(pk.x + pk.width / 2, pk.y - pk.height / 2 + bob);
      ctx.rotate(0.5);
      ctx.fillStyle = '#ffd94a';
      ellipse(ctx, 0, 0, 8, 20);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ellipse(ctx, 0, -2, 4, 14);
      ctx.fill();
      ctx.restore();
      text(ctx, 'SHIELD', pk.x + pk.width / 2, pk.y - pk.height - 12, 12, '#ffd94a');
    } else {
      ctx.save();
      ctx.translate(pk.x + pk.width / 2, pk.y - pk.height / 2 + bob);
      ctx.fillStyle = '#e2703a';
      ellipse(ctx, 0, 0, 18, 12);
      ctx.fill();
      ctx.fillStyle = '#f7a94b';
      ellipse(ctx, 0, -2, 14, 8);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ellipse(ctx, 0, -6, 8, 3);
      ctx.fill();
      ctx.restore();
      text(ctx, '+1 LIFE', pk.x + pk.width / 2, pk.y - pk.height - 12, 12, '#ffb0a0');
    }
  }

  function drawHeart(x, y, filled) {
    ctx.fillStyle = filled ? '#ff5340' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.bezierCurveTo(x - 12, y - 4, x - 6, y - 12, x, y - 5);
    ctx.bezierCurveTo(x + 6, y - 12, x + 12, y - 4, x, y + 8);
    ctx.closePath();
    ctx.fill();
  }

  /** Score, distance bar, lives, combo and the farmer warning. */
  function drawHUD(s) {
    ctx.fillStyle = 'rgba(20, 12, 8, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, 64);
    text(ctx, `SCORE ${s.score}`, 24, 34, 26, '#fff', 'left');
    if (s.combo > 1) {
      ctx.fillStyle = '#ffd94a';
      roundRect(ctx, 230, 18, 92, 30, 8);
      ctx.fill();
      text(ctx, `COMBO x${s.combo}`, 276, 34, 17, '#5a3a00');
    }
    // Distance bar: the turkey runs toward the Freedom Gate.
    const barX = 420;
    const barW = 440;
    const progress = Math.min(1, s.metres / GOAL_METRES);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, barX, 22, barW, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#7ac74f';
    roundRect(ctx, barX, 22, Math.max(20, barW * progress), 20, 10);
    ctx.fill();
    text(ctx, `${s.metres}m / ${GOAL_METRES}m  •  ${s.zoneName}`, barX + barW / 2, 56, 13, '#ffe9b0');
    // A checkered gate flag at the end of the bar, and a gold dot for the turkey.
    const flagX = barX + barW + 8;
    ctx.fillStyle = '#fff';
    ctx.fillRect(flagX, 18, 16, 14);
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(flagX, 18, 8, 7);
    ctx.fillRect(flagX + 8, 25, 8, 7);
    ctx.fillStyle = '#ffd94a';
    ellipse(ctx, barX + barW * progress, 32, 7, 7);
    ctx.fill();
    // Lives, shield and dash.
    for (let i = 0; i < 3; i += 1) drawHeart(1080 + i * 30, 30, i < s.lives);
    if (s.shield) text(ctx, 'SHIELD', 1180, 32, 13, '#ffd94a');
    if (s.dashCooldown > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(1050, 52, 130, 6);
      ctx.fillStyle = '#7ac7e8';
      ctx.fillRect(1050, 52, 130 * (1 - s.dashCooldown / 2.4), 6);
    } else {
      text(ctx, 'DASH READY', 1115, 55, 12, '#7ac7e8');
    }
    if (s.farmer.gap < 70 && !s.over) {
      const blink = Math.sin(s.time * 10) > 0;
      if (blink) {
        ctx.fillStyle = 'rgba(210, 40, 30, 0.85)';
        roundRect(ctx, FIELD.width / 2 - 130, 76, 260, 34, 8);
        ctx.fill();
        text(ctx, '⚠ FARMER CLOSE! ⚠', FIELD.width / 2, 94, 19, '#fff');
      }
    }
    // Floating feedback texts.
    for (const f of s.flashes) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      text(ctx, f.text, f.x, f.y, f.big ? 40 : 20, f.big ? '#ffd94a' : '#fff');
      ctx.globalAlpha = 1;
    }
  }

  /** The title screen: the turkey, the farmer, the promise of the run. */
  function drawTitleScreen(best, time) {
    ctx.fillStyle = 'rgba(30, 14, 8, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'GOBBLE DASH', FIELD.width / 2, 150, 84, '#ffd94a');
    text(ctx, 'A turkey\u2019s great escape from Thanksgiving dinner', FIELD.width / 2, 215, 26, '#fff');
    text(ctx, '3 ZONES  •  5 HAZARDS  •  CORN COMBOS  •  HAYSTACK HIDING  •  1500m TO FREEDOM', FIELD.width / 2, 258, 20, '#ffe9b0');
    // The hero turkey, big and centre stage, with the farmer lurking behind.
    const fakePlayer = { x: FIELD.width / 2 - 40, y: 470, runPhase: time * 2, jumping: false };
    drawTurkey(fakePlayer, time, 0);
    drawFarmer({ gap: 260, runPhase: time * 2, searching: 0 }, FIELD.width / 2 - 40, 470, time);
    text(ctx, '↑ ↓ switch lane    SPACE jump    SHIFT dash    ↓ in a haystack to hide', FIELD.width / 2, 540, 20, '#fff');
    text(ctx, 'Dodge the oven and the carving knife. Grab corn, build your combo, outrun the farmer.', FIELD.width / 2, 572, 18, '#ffe9b0');
    const pulse = 0.65 + 0.35 * Math.sin(time * 4);
    ctx.globalAlpha = pulse;
    text(ctx, 'PRESS ENTER OR CLICK TO RUN', FIELD.width / 2, 640, 28, '#fff');
    ctx.globalAlpha = 1;
    if (best > 0) text(ctx, `BEST SCORE: ${best}`, FIELD.width / 2, 686, 18, '#ffd94a');
  }

  /** The end screen: caught in the farmyard, or escaped to the woods. */
  function drawEndScreen(s, best, time) {
    ctx.fillStyle = s.escaped ? 'rgba(20, 60, 20, 0.6)' : 'rgba(60, 10, 8, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (s.escaped) {
      // Confetti over the freedom screen.
      const colors = ['#ffd94a', '#ff7a2e', '#7ac74f', '#7ac7e8', '#ff5340'];
      for (let i = 0; i < 60; i += 1) {
        const cx = (i * 197) % FIELD.width;
        const cy = ((i * 131 + time * 60) % FIELD.height);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(cx, cy, 8, 12);
      }
      text(ctx, 'ESCAPED!', FIELD.width / 2, 180, 84, '#7ac74f');
      text(ctx, 'Gobble slipped the gate and vanished into the woods.', FIELD.width / 2, 250, 24, '#fff');
      text(ctx, 'No turkey was carved today.', FIELD.width / 2, 286, 20, '#ffe9b0');
    } else {
      text(ctx, 'CAUGHT!', FIELD.width / 2, 180, 84, '#ff5340');
      text(ctx, s.reason, FIELD.width / 2, 250, 24, '#fff');
      text(ctx, 'The farmer is already sharpening the carving knife…', FIELD.width / 2, 286, 20, '#ffe9b0');
    }
    text(ctx, `SCORE  ${s.score}`, FIELD.width / 2, 360, 30, '#fff');
    text(ctx, `DISTANCE  ${s.metres}m of ${GOAL_METRES}m  •  CORN  ${s.cornEaten}  •  BEST COMBO  x${s.bestCombo}`, FIELD.width / 2, 406, 20, '#ffe9b0');
    if (s.score >= best && s.score > 0) text(ctx, '★ NEW BEST SCORE! ★', FIELD.width / 2, 448, 22, '#ffd94a');
    const pulse = 0.65 + 0.35 * Math.sin(time * 4);
    ctx.globalAlpha = pulse;
    text(ctx, 'PRESS ENTER OR CLICK TO RUN AGAIN', FIELD.width / 2, 520, 26, '#fff');
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(20, 12, 8, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', FIELD.width / 2, 330, 64, '#fff');
    text(ctx, 'Press P or Escape to keep running', FIELD.width / 2, 400, 22, '#ffe9b0');
  }

  /** Paint one frame: scenery, world, HUD and the screen on top. */
  function paint(world, screen, best, time) {
    const s = world.state;
    const zone = ZONES[s.zoneIndex];
    const scroll = s.distancePx;
    drawSky(zone, scroll);
    drawGround(zone, scroll);
    if (screen !== SCREEN_TITLE) {
      for (const hay of s.haystacks) drawHaystack(hay, time);
      for (const h of s.hazards) drawHazard(h, time);
      for (const pk of s.pickups) drawPickup(pk);
      drawTurkey(s.player, time, s.hidden);
      drawFarmer(s.farmer, s.player.x, s.player.y, time);
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHUD(s);
    if (screen === SCREEN_TITLE) drawTitleScreen(best, time);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawEndScreen(s, best, time);
    // The stumble flash: a red edge when the turkey is hit.
    if (s.stumbleTimer > 0.5) {
      ctx.fillStyle = `rgba(210, 40, 30, ${(s.stumbleTimer - 0.5) * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return { paint };
}
