// Procedural WebAudio: every sound is synthesized, no audio files. All calls
// are safe before the first user gesture (the context stays suspended until
// unlock() runs) and when sound is muted.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
    } catch {
      return false;
    }
    return true;
  }

  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') void ctx.resume();
    startMusic();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted || ctx.state !== 'running') return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ctx || muted || ctx.state !== 'running') return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t0);
  }

  // A slow sunset pad: Am – F – C – G, one soft arpeggio note per beat.
  const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 196, 246.9]];
  const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
  function musicTick() {
    if (!ctx || muted || ctx.state !== 'running') return;
    const chord = CHORDS[Math.floor(musicStep / 8) % CHORDS.length];
    const note = chord[ARP[musicStep % 8]] * 2;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    osc.connect(g); g.connect(musicGain);
    osc.start(t0); osc.stop(t0 + 1);
    if (musicStep % 8 === 0) {
      const pad = ctx.createOscillator();
      const pg = ctx.createGain();
      pad.type = 'triangle';
      pad.frequency.value = chord[0] / 2;
      pg.gain.setValueAtTime(0.0001, t0);
      pg.gain.linearRampToValueAtTime(0.22, t0 + 1.2);
      pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.6);
      pad.connect(pg); pg.connect(musicGain);
      pad.start(t0); pad.stop(t0 + 3.8);
    }
    musicStep += 1;
  }
  function startMusic() {
    if (musicTimer || !ctx) return;
    musicTimer = window.setInterval(musicTick, 420);
  }

  return {
    unlock,
    setMuted(value) { muted = value; if (master) master.gain.value = value ? 0 : 0.5; },
    isMuted() { return muted; },
    shoot() { tone(720, 0.07, 'square', 0.05, 320); },
    harpoon() { tone(180, 0.16, 'sawtooth', 0.09, 60); noise(0.08, 0.05, 1200); },
    zap() { tone(1400, 0.12, 'sawtooth', 0.06, 180); noise(0.1, 0.04, 4000); },
    frost() { tone(980, 0.2, 'sine', 0.05, 1400); },
    explosion() { noise(0.35, 0.22, 900); tone(90, 0.3, 'sine', 0.18, 40); },
    hit() { tone(240, 0.05, 'square', 0.04, 160); },
    salvage() { tone(1180, 0.09, 'sine', 0.05, 1760); },
    build() { tone(320, 0.12, 'triangle', 0.09, 520); tone(520, 0.1, 'triangle', 0.06, 780); },
    error() { tone(160, 0.15, 'square', 0.07, 110); },
    breach() { tone(140, 0.4, 'sawtooth', 0.14, 60); noise(0.25, 0.12, 500); },
    horn() { tone(196, 0.7, 'sawtooth', 0.1, 196); tone(294, 0.7, 'sawtooth', 0.07, 294); },
    lightning() { noise(0.3, 0.25, 3000); tone(70, 0.35, 'sine', 0.2, 30); },
    repair() { tone(520, 0.15, 'sine', 0.07, 780); tone(780, 0.2, 'sine', 0.07, 1040); },
    victory() { [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => tone(f, 0.35, 'triangle', 0.1), i * 140)); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => window.setTimeout(() => tone(f, 0.4, 'triangle', 0.09), i * 180)); },
  };
}
