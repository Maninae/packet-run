// rng.js — seeded PRNG so every run is reproducible from its seed string
// (design/06: seed shown in UI, shareable, daily runs). xmur3 seeds mulberry32.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns () => float in [0, 1), deterministic for a given seed string.
export function seededRng(seed) {
  return mulberry32(xmur3(String(seed))());
}

// A fresh shareable seed like "7QK2" (no lookalike chars).
export function randomSeed() {
  const alphabet = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
