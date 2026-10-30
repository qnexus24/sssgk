/**
 * practice/js/engine/prng.js
 * Pure seeded pseudo-random number generator (Mulberry32) and code utilities.
 * Conforms to 04_TEST_ENGINE_SPEC.md §2.
 */

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 32-bit FNV-1a based string hash.
 * @param {string} str
 * @returns {number} 32-bit unsigned integer
 */
export function hashString(str) {
  const s = String(str ?? '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG.
 * @param {number} seed 32-bit unsigned integer
 * @returns {() => number} Float in [0, 1)
 */
export function mulberry32(seed) {
  let s = (seed >>> 0) || 0x12345678;
  return function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates an RNG function from string, number, or undefined.
 * @param {string|number} [seed]
 * @returns {() => number}
 */
export function createRng(seed) {
  if (seed === undefined || seed === null) {
    const randomSeed = Math.floor(Math.random() * 4294967296) >>> 0;
    return mulberry32(randomSeed);
  }
  const seedNum = typeof seed === 'number'
    ? (seed >>> 0)
    : hashString(String(seed));
  return mulberry32(seedNum);
}

/**
 * Generates a 6-character test code (no 0, O, 1, I).
 * @param {() => number} [rng]
 * @returns {string} 6-char alphanumeric code
 */
export function generateTestCode(rng = Math.random) {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(rng() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[idx];
  }
  return code;
}

/**
 * Helper to get a random integer in [min, max] inclusive.
 * @param {number} min
 * @param {number} max
 * @param {() => number} rng
 * @returns {number}
 */
export function randomInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

