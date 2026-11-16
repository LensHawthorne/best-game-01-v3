// Mouse and keyboard input, in game coordinates (the canvas is scaled to fit
// the window, so client pixels are mapped back to the 1280x720 view).
import { VIEW } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';

export function createInput(canvas) {
  const mouse = { x: 0, y: 0, inside: false };
  const clicks = [];
  const keys = [];

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (VIEW.width / r.width),
      y: (e.clientY - r.top) * (VIEW.height / r.height),
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = toGame(e);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => { mouse.inside = false; });
  canvas.addEventListener('mousedown', (e) => {
    const p = toGame(e);
    clicks.push({ x: p.x, y: p.y, button: e.button });
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    keys.push(e.key.toLowerCase());
  });

  return {
    mouse,
    takeClicks() { return clicks.splice(0, clicks.length); },
    takeKeys() { return keys.splice(0, keys.length); },
  };
}
