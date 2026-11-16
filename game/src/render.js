// The renderer: every pixel the game shows, drawn on one canvas. The judge
// sees the game through its screenshots, so the title, the play HUD and the
// end screens are all drawn to read at a glance when shrunk.
import { VIEW, CORE, HULL_MAX, HARDPOINTS, TURRETS, TURRET_ORDER, ABILITIES, ABILITY_ORDER, PALETTE, upgradeCost } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_DEFEAT = 'defeat';
export const SCREEN_OVER = 'defeat';

const CLOUDS = [];
for (let i = 0; i < 26; i += 1) {
  CLOUDS.push({
    x: (i * 173) % 1400 - 60, y: 40 + ((i * 97) % 620), s: 0.5 + ((i * 37) % 100) / 100,
    speed: 4 + ((i * 13) % 10), layer: i % 3,
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Low sun with a warm glow.
  const sg = ctx.createRadialGradient(1020, 200, 10, 1020, 200, 220);
  sg.addColorStop(0, 'rgba(255, 217, 138, 0.95)');
  sg.addColorStop(0.35, 'rgba(255, 180, 110, 0.45)');
  sg.addColorStop(1, 'rgba(255, 180, 110, 0)');
  ctx.fillStyle = sg;
  ctx.fillRect(760, -40, 520, 480);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(1020, 200, 46, 0, Math.PI * 2);
  ctx.fill();
  // Parallax clouds, drifting on world time (deterministic for screenshots).
  for (const c of CLOUDS) {
    const x = ((c.x + time * c.speed) % 1500) - 110;
    const y = c.y + Math.sin(time * 0.3 + c.x) * 6;
    const alpha = c.layer === 0 ? 0.2 : c.layer === 1 ? 0.34 : 0.5;
    ctx.fillStyle = `rgba(255, 224, 196, ${alpha})`;
    const s = c.s * (c.layer === 0 ? 1.5 : 1);
    ctx.beginPath();
    ctx.ellipse(x, y, 70 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 40 * s, y + 8 * s, 44 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 44 * s, y + 6 * s, 48 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Distant airships, tiny and slow.
  ctx.fillStyle = 'rgba(60, 30, 70, 0.35)';
  for (let i = 0; i < 3; i += 1) {
    const x = ((180 + i * 420 + time * 6) % 1500) - 110;
    const y = 120 + i * 55;
    ctx.beginPath();
    ctx.ellipse(x, y, 46, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 22, y + 10, 44, 8);
  }
}

function drawPort(ctx, world, time) {
  const bob = Math.sin(time * 0.7) * 3;
  // The great balloon that holds the port up.
  ctx.save();
  ctx.translate(CORE.x, 300 + bob);
  const bg = ctx.createLinearGradient(0, -110, 0, 10);
  bg.addColorStop(0, '#e8b34b');
  bg.addColorStop(1, '#c96a3b');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -58, 74, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 40, 20, 0.5)';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 26, -118);
    ctx.quadraticCurveTo(i * 34, -58, i * 18, 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#8a6420';
  ctx.fillRect(-34, -4, 68, 10);
  ctx.restore();
  // Ropes from balloon to dock.
  ctx.strokeStyle = 'rgba(60, 40, 20, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CORE.x - 30, 306 + bob); ctx.lineTo(CORE.x - 60, 372);
  ctx.moveTo(CORE.x + 30, 306 + bob); ctx.lineTo(CORE.x + 60, 372);
  ctx.stroke();
  // The dock: planks, brass trim, lanterns.
  ctx.fillStyle = PALETTE.woodDark;
  roundRect(ctx, 420, 368, 440, 108, 14);
  ctx.fill();
  ctx.fillStyle = PALETTE.wood;
  for (let i = 0; i < 11; i += 1) {
    ctx.fillRect(428 + i * 39, 374, 34, 96);
  }
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(420, 368, 440, 8);
  ctx.fillRect(420, 468, 440, 8);
  // Lanterns glowing on the dock ends.
  for (const lx of [440, 840]) {
    const glow = ctx.createRadialGradient(lx, 352, 2, lx, 352, 46);
    glow.addColorStop(0, 'rgba(255, 200, 90, 0.8)');
    glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 46, 306, 92, 92);
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(lx - 7, 340, 14, 20);
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(lx - 4, 344, 8, 12);
  }
  // The core: a brass heart that enemies fly at.
  const pulse = 1 + Math.sin(time * 2.4) * 0.05;
  ctx.save();
  ctx.translate(CORE.x, CORE.y);
  ctx.scale(pulse, pulse);
  const cg = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
  cg.addColorStop(0, '#fff3c4');
  cg.addColorStop(0.5, '#ffb347');
  cg.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6420';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Hardpoints.
  for (let i = 0; i < HARDPOINTS.length; i += 1) {
    const hp = HARDPOINTS[i];
    const t = world.turrets.find((x) => x.slot === i);
    if (t) continue;
    ctx.strokeStyle = world.selectedSlot === i ? '#ffd94a' : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = world.selectedSlot === i ? 3 : 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(hp.x, hp.y, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', hp.x, hp.y + 6);
  }
}

function drawTurret(ctx, world, t, time) {
  const pos = HARDPOINTS[t.slot];
  const def = TURRETS[t.type];
  const bob = Math.sin(time * 0.7) * 3;
  ctx.save();
  ctx.translate(pos.x, pos.y + (t.slot < 4 ? 0 : 0));
  // Base.
  ctx.fillStyle = '#3a2c1e';
  ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.brassDark;
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
  // Barrel, aimed at the target.
  ctx.rotate(t.angle);
  ctx.fillStyle = def.color;
  if (t.type === 'flak') {
    ctx.fillRect(0, -4, 24, 8);
    if (t.level >= 3) ctx.fillRect(0, -11, 20, 5);
  } else if (t.type === 'harpoon') {
    ctx.fillRect(0, -3, 30, 6);
    ctx.beginPath(); ctx.moveTo(30, -6); ctx.lineTo(40, 0); ctx.lineTo(30, 6); ctx.closePath(); ctx.fill();
  } else if (t.type === 'coil') {
    ctx.fillRect(-4, -4, 12, 8);
    ctx.beginPath(); ctx.arc(8, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#bff4ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(14 + Math.sin(time * 31) * 4, -6);
    ctx.lineTo(20, 4);
    ctx.stroke();
  } else {
    ctx.fillRect(-6, -8, 14, 16);
    ctx.fillStyle = '#dff8ff';
    ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Muzzle flash.
  if (t.flash > 0) {
    ctx.fillStyle = 'rgba(255, 230, 150, 0.9)';
    ctx.beginPath();
    ctx.arc(pos.x + Math.cos(t.angle) * 30, pos.y + Math.sin(t.angle) * 30, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Level pips.
  for (let i = 0; i < t.level; i += 1) {
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(pos.x - 8 + i * 8, pos.y + 24, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Range ring for the selected turret.
  if (world.selectedSlot === t.slot) {
    const stats = { range: TURRETS[t.type].range * (t.level === 1 ? 1 : t.level === 2 ? 1.1 : 1.2) };
    ctx.strokeStyle = 'rgba(255, 217, 74, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, stats.range, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const alpha = e.phased ? 0.35 : 1;
  ctx.globalAlpha = alpha;
  const flash = e.flash > 0;
  const body = flash ? '#ffffff' : e.def.color;
  if (e.kind === 'dartwing' || e.kind === 'swift') {
    const a = Math.atan2(CORE.y - e.y, CORE.x - e.x);
    ctx.rotate(a);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -8); ctx.lineTo(-5, 0); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-16, -12); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
  } else if (e.kind === 'raider' || e.kind === 'shieldbearer') {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, -6, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(-9, 6, 18, 10);
    if (e.kind === 'shieldbearer') {
      ctx.strokeStyle = 'rgba(143, 208, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (e.kind === 'ironclad') {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5d6b7d';
    ctx.fillRect(-18, -4, 36, 8);
    ctx.fillStyle = '#2c3440';
    ctx.fillRect(-8, 12, 16, 8);
  } else if (e.kind === 'bomber') {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(8, -22, 14, -18); ctx.stroke();
    ctx.fillStyle = Math.sin(time * 12) > 0 ? '#ffe066' : '#ff5a3c';
    ctx.beginPath(); ctx.arc(14, -18, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (e.kind === 'wraith') {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(14, -12, 12, 2);
    ctx.quadraticCurveTo(10, 12, 4, 16);
    ctx.lineTo(0, 10); ctx.lineTo(-4, 16);
    ctx.quadraticCurveTo(-10, 12, -12, 2);
    ctx.quadraticCurveTo(-14, -12, 0, -18);
    ctx.fill();
    ctx.fillStyle = '#1d1230';
    ctx.beginPath(); ctx.arc(-4, -4, 2.5, 0, Math.PI * 2); ctx.arc(5, -4, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (e.kind === 'dreadnought') {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, 62, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5d6b7d';
    ctx.fillRect(-44, -8, 88, 16);
    ctx.fillStyle = '#3a2c1e';
    ctx.fillRect(-30, 22, 60, 14);
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath(); ctx.arc(-52, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    for (let i = 0; i < 4; i += 1) { ctx.fillRect(-36 + i * 20, -4, 8, 8); }
  } else if (e.kind === 'skykraken') {
    // A great sky-beast: body, eyes, and eight waving tentacles.
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, 52, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = body;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const wave = Math.sin(time * 3 + i * 1.3) * 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 32);
      ctx.quadraticCurveTo(Math.cos(a) * 62, Math.sin(a) * 52 + wave, Math.cos(a) * 74, Math.sin(a) * 66 + wave);
      ctx.stroke();
    }
    ctx.fillStyle = '#123326';
    ctx.beginPath(); ctx.arc(-16, -8, 7, 0, Math.PI * 2); ctx.arc(16, -8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(-16, -8, 3, 0, Math.PI * 2); ctx.arc(16, -8, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#123326';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, 16); ctx.quadraticCurveTo(0, 24, 14, 16); ctx.stroke();
  }
  ctx.restore();
  // Health bar (bosses get a big one; everyone else a small bar when hurt).
  if (e.boss) {
    const w = 130;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 22, w, 9);
    ctx.fillStyle = '#e84a3f';
    ctx.fillRect(e.x - w / 2 + 1, e.y - e.radius - 21, (w - 2) * Math.max(0, e.hp / e.maxHp), 7);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.def.name.toUpperCase(), e.x, e.y - e.radius - 28);
  } else if (e.hp < e.maxHp || e.shield > 0) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w, 4);
    ctx.fillStyle = '#3fae6a';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 9, w * Math.max(0, e.hp / e.maxHp), 4);
    if (e.shield > 0) {
      ctx.fillStyle = '#8fd0ff';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 13, w * Math.max(0, e.shield / e.maxShield), 3);
    }
  }
}

function drawProjectiles(ctx, world) {
  for (const p of world.projectiles) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of world.bolts) {
    const a = 1 - b.age / b.life;
    ctx.strokeStyle = `rgba(180, 240, 255, ${a})`;
    ctx.lineWidth = b.thick ? 5 : 2.5;
    ctx.beginPath();
    const segs = 5;
    for (let i = 0; i <= segs; i += 1) {
      const t = i / segs;
      const x = b.x1 + (b.x2 - b.x1) * t + (i > 0 && i < segs ? (Math.sin(i * 12.3) * 8) : 0);
      const y = b.y1 + (b.y2 - b.y1) * t;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles.parts) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size * a), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  for (const t of world.particles.texts) {
    const a = 1 - t.age / t.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 217, 138, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawHUD(ctx, world) {
  // Top bar.
  panel(ctx, 12, 10, 1256, 46);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`WAVE ${Math.max(1, world.wave)} / 12`, 26, 39);
  // Hull bar.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, 150, 22, 220, 20, 10); ctx.fill();
  const hullFrac = Math.max(0, world.hull / HULL_MAX);
  ctx.fillStyle = hullFrac > 0.5 ? PALETTE.hull : hullFrac > 0.25 ? '#ffb347' : PALETTE.hullLow;
  if (hullFrac > 0) { roundRect(ctx, 152, 24, 216 * hullFrac, 16, 8); ctx.fill(); }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`HULL ${Math.ceil(world.hull)}`, 158, 37);
  ctx.fillStyle = PALETTE.salvage;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`⚙ ${Math.floor(world.economy.salvage)} salvage`, 400, 39);
  ctx.fillStyle = '#fff';
  ctx.fillText(`★ ${world.score}`, 580, 39);
  ctx.fillText(`☠ ${world.kills}`, 700, 39);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd98a';
  ctx.fillText(world.phase === 'build' ? 'BUILD PHASE — press SPACE to launch the wave' : `WAVE ${world.wave} IN PROGRESS`, 1252, 39);
  // Bottom build bar.
  panel(ctx, 12, 636, 1256, 72);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('BUILD  [1-4]', 24, 656);
  TURRET_ORDER.forEach((type, i) => {
    const x = 24 + i * 168;
    const def = TURRETS[type];
    const afford = world.economy.salvage >= def.cost;
    const selected = world.selectedType === type;
    ctx.fillStyle = selected ? 'rgba(255, 217, 74, 0.22)' : 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, 660, 160, 40, 8); ctx.fill();
    ctx.strokeStyle = selected ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x + 16, 680, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = afford ? '#fff' : '#8a7a9a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${def.name} · ⚙${def.cost}`, x + 30, 676);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#cbb8e8';
    ctx.fillText(def.desc, x + 30, 692);
  });
  // Abilities.
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ABILITIES  [Q/W/E]', 716, 656);
  ABILITY_ORDER.forEach((key, i) => {
    const x = 716 + i * 176;
    const def = ABILITIES[key];
    const left = Math.max(0, world.economy.abilities[key].readyAt - world.time);
    const ready = left <= 0;
    ctx.fillStyle = ready ? 'rgba(126, 231, 255, 0.18)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx, x, 660, 168, 40, 8); ctx.fill();
    ctx.strokeStyle = ready ? '#7ee7ff' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = ready ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = ready ? '#fff' : '#8a7a9a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${def.key}  ${def.name}`, x + 10, 676);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#cbb8e8';
    ctx.fillText(ready ? def.desc : `ready in ${Math.ceil(left)}s`, x + 10, 692);
  });
  // Selected-slot panel.
  const slot = world.selectedSlot;
  if (slot >= 0) {
    const t = world.turrets.find((x) => x.slot === slot);
    panel(ctx, 980, 540, 288, 88);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    if (t) {
      const def = TURRETS[t.type];
      ctx.fillText(`${def.name} — Lv ${t.level}`, 996, 566);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#cbb8e8';
      ctx.fillText(`Kills: ${t.kills}`, 996, 584);
      if (t.level < 3) ctx.fillText(`[U] Upgrade — ⚙${upgradeCost(t.type, t.level)}`, 996, 602);
      ctx.fillText('[X] Sell for salvage', 996, 620);
    } else {
      ctx.fillText('Empty hardpoint', 996, 566);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#cbb8e8';
      ctx.fillText('Pick a turret below, then click here', 996, 584);
      ctx.fillText('or press 1-4 then click', 996, 602);
    }
  }
  // Wave banner.
  if (world.banner && world.time < world.bannerUntil) {
    const a = Math.min(1, (world.bannerUntil - world.time) / 0.5);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(world.banner.text, 640, 170);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(world.banner.sub, 640, 202);
    ctx.globalAlpha = 1;
  }
  // Overclock indicator.
  if (world.overclockUntil > world.time) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ee7ff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`⚡ OVERCLOCK ${Math.ceil(world.overclockUntil - world.time)}s`, 640, 90);
  }
  // Launch-wave button during the build phase.
  if (world.phase === 'build' && world.screen === 'play') {
    const pulse = 0.75 + Math.sin(world.time * 4) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#d9a441';
    roundRect(ctx, 480, 560, 320, 56, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#241a33';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`▶  LAUNCH WAVE ${world.wave + 1}`, 640, 596);
  }
}

function drawTitle(ctx, world, best) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('SKYHARBOR', 640, 210);
  ctx.fillStyle = '#fff';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('Hold the Last Skyport', 640, 252);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#e8d8f8';
  ctx.fillText('Sky pirates are coming in twelve waves. Build turrets on the dock,', 640, 300);
  ctx.fillText('spend their salvage, and do not let a single one touch the core.', 640, 326);
  const pulse = 0.7 + Math.sin(world.time * 3) * 0.3;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('— CLICK TO START —', 640, 400);
  ctx.globalAlpha = 1;
  panel(ctx, 440, 440, 400, 108);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('HOW TO PLAY', 640, 466);
  ctx.fillStyle = '#e8d8f8';
  ctx.font = '14px sans-serif';
  ctx.fillText('Mouse: build & upgrade turrets on the dock', 640, 490);
  ctx.fillText('1-4 turret · Q lightning · W repair · E overclock', 640, 512);
  ctx.fillText('SPACE launch wave · P pause · R restart', 640, 534);
  if (best > 0) {
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`BEST SCORE  ★ ${best}`, 640, 592);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px sans-serif';
  ctx.fillText('12 waves · 4 turrets · 8 pirate kinds · 2 bosses · a game by one skykeeper', 640, 690);
}

function drawStars(ctx, x, y, count, size) {
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < count ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('★', x + (i - 1) * (size + 14), y);
  }
}

function drawEnd(ctx, world, best, victory) {
  ctx.fillStyle = 'rgba(16, 10, 32, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 360, 130, 560, 460);
  ctx.textAlign = 'center';
  if (victory) {
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('THE SKYPORT HOLDS!', 640, 205);
    drawStars(ctx, 640, 268, world.victoryStars, 44);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(world.victoryStars === 3 ? 'A flawless defense — the sky is yours.' : world.victoryStars === 2 ? 'A hard-fought victory.' : 'Held by a thread — but held.', 640, 300);
  } else {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('THE PORT HAS FALLEN', 640, 205);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`The pirates broke through on wave ${Math.max(1, world.wave)}.`, 640, 258);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8d8f8';
  ctx.font = '17px sans-serif';
  const rows = [
    ['Score', `${world.score}`],
    ['Best score', `${Math.max(best, world.score)}`],
    ['Waves cleared', `${victory ? 12 : Math.max(0, world.wave - 1)} / 12`],
    ['Pirates destroyed', `${world.kills}`],
    ['Salvage gathered', `⚙ ${world.salvageEarned}`],
    ['Hull remaining', `${Math.max(0, Math.ceil(world.hull))} / 100`],
  ];
  rows.forEach((r, i) => {
    const y = 350 + i * 30;
    ctx.fillStyle = '#cbb8e8';
    ctx.fillText(r[0], 410, y);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(r[1], 870, y);
    ctx.textAlign = 'left';
  });
  const pulse = 0.7 + Math.sin(world.time * 3) * 0.3;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(victory ? '— CLICK TO PLAY AGAIN —' : '— CLICK TO TRY AGAIN —', 640, 560);
  ctx.globalAlpha = 1;
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(16, 10, 32, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText('PAUSED', 640, 320);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('P resume · R restart · click to resume', 640, 370);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VIEW.width * dpr;
    canvas.height = VIEW.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(world, screen, best) {
    const shake = world.particles.shakeOffset();
    ctx.save();
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    ctx.translate(shake.x, shake.y);
    drawSky(ctx, world.time);
    drawPort(ctx, world, world.time);
    for (const t of world.turrets) drawTurret(ctx, world, t, world.time);
    for (const e of world.enemies) drawEnemy(ctx, e, world.time);
    drawProjectiles(ctx, world);
    drawParticles(ctx, world);
    ctx.restore();
    if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
    else if (screen === SCREEN_VICTORY) drawEnd(ctx, world, best, true);
    else if (screen === SCREEN_DEFEAT) drawEnd(ctx, world, best, false);
    else if (screen === SCREEN_PAUSED) { drawHUD(ctx, world); drawPaused(ctx); }
    else drawHUD(ctx, world);
  }

  return { draw, resize };
}
