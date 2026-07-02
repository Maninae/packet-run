// sound.js — all audio synthesized with WebAudio, zero assets (design/08:
// everything drawn/made in code). Small, warm, never busy: each game beat has
// one short voice. Muting persists; the context unlocks on the first user tap
// (the start button), as browsers require.

let ctx = null;
let master = null;
let muted = localStorage.getItem('packet-run-muted') === '1';

export function unlockAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('packet-run-muted', muted ? '1' : '0');
  return muted;
}

function voice({ type = 'sine', freq = 440, to = null, dur = 0.25, at = 0, gain = 0.5 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.3, from = 800, to = 300, at = 0, gain = 0.18 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + at;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

// one voice per game beat
export const sfx = {
  whoosh: () => noise({ dur: 0.35, from: 500, to: 1400, gain: 0.12 }),      // hop start
  sweep: () => {                                                             // fragment lost
    voice({ type: 'sawtooth', freq: 340, to: 130, dur: 0.4, gain: 0.22 });
    noise({ dur: 0.3, from: 1200, to: 250, gain: 0.14 });
  },
  pop: () => voice({ type: 'square', freq: 620, to: 900, dur: 0.09, gain: 0.2 }), // copy absorbs
  chime: () => {                                                             // pickup / rejoin
    voice({ freq: 880, dur: 0.18, gain: 0.3 });
    voice({ freq: 1318, dur: 0.3, at: 0.09, gain: 0.25 });
  },
  mud: () => voice({ type: 'triangle', freq: 180, to: 120, dur: 0.35, gain: 0.3 }), // fog cost
  static: () => {                                                            // the Static strikes
    noise({ dur: 0.45, from: 2400, to: 400, gain: 0.22 });
    voice({ type: 'square', freq: 110, to: 70, dur: 0.4, gain: 0.14 });
  },
  scan: () => {                                                              // checksum sweep
    voice({ type: 'sine', freq: 740, dur: 0.09, gain: 0.22 });
    voice({ type: 'sine', freq: 990, dur: 0.12, at: 0.11, gain: 0.22 });
  },
  splash: () => {                                                            // rapids scatter
    noise({ dur: 0.5, from: 900, to: 180, gain: 0.2 });
    voice({ type: 'sine', freq: 320, to: 180, dur: 0.3, gain: 0.16 });
  },
  bloop: () => voice({ type: 'sine', freq: 260, to: 420, dur: 0.18, gain: 0.24 }), // a beat of waiting
  slot: (i) => {                                                             // dock fill, rising
    const scale = [523, 587, 659, 784, 880];
    voice({ type: 'triangle', freq: scale[i % 5], dur: 0.22, gain: 0.35 });
    voice({ freq: scale[i % 5] * 2, dur: 0.1, gain: 0.12 });
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) =>
    voice({ freq: f, dur: 0.5, at: i * 0.12, gain: 0.3 })),
  fail: () => {
    voice({ type: 'sine', freq: 220, to: 110, dur: 0.8, gain: 0.3 });
    voice({ type: 'sine', freq: 277, to: 139, dur: 0.8, at: 0.05, gain: 0.18 });
  },
};
