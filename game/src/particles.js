// Particles, floating text and screen shake: the juice that makes every hit
// feel answered. Pure data, no DOM, drawn by render.js.
export function createParticles() {
  const parts = [];
  const texts = [];
  let shake = 0;

  function burst(x, y, color, count, speed, size, life) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25,
        color, size: size * (0.6 + Math.random() * 0.8), life: life * (0.6 + Math.random() * 0.7),
        age: 0, gravity: 160, drag: 0.98,
      });
    }
  }

  function explosion(x, y, big) {
    burst(x, y, '#ffb347', big ? 26 : 14, big ? 260 : 180, big ? 5 : 3.5, 0.7);
    burst(x, y, '#ff6b4a', big ? 16 : 8, big ? 180 : 120, big ? 6 : 4, 0.9);
    burst(x, y, '#5a4a6b', big ? 10 : 5, big ? 90 : 60, big ? 8 : 5, 1.2);
    shake = Math.min(14, shake + (big ? 9 : 4));
  }

  function smoke(x, y) {
    parts.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: -28 - Math.random() * 20, color: 'rgba(120,110,140,0.5)', size: 6 + Math.random() * 5, life: 1.4, age: 0, gravity: -30, drag: 0.99 });
  }

  function sparkle(x, y, color) {
    parts.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, color, size: 3 + Math.random() * 2, life: 0.7, age: 0, gravity: 60, drag: 0.97 });
  }

  function floatText(x, y, text, color) {
    texts.push({ x, y, text, color, age: 0, life: 1.1 });
  }

  function step(dt) {
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = texts.length - 1; i >= 0; i -= 1) {
      const t = texts[i];
      t.age += dt;
      t.y -= 34 * dt;
      if (t.age >= t.life) texts.splice(i, 1);
    }
    shake = Math.max(0, shake - 30 * dt);
  }

  function shakeOffset() {
    if (shake < 0.5) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * shake, y: (Math.random() - 0.5) * shake };
  }

  return { parts, texts, burst, explosion, smoke, sparkle, floatText, step, shakeOffset, addShake(v) { shake = Math.min(16, shake + v); } };
}
