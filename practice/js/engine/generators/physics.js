/**
 * practice/js/engine/generators/physics.js
 * Parametric physics question templates per 04_TEST_ENGINE_SPEC.md §8.
 * Wording style copies bank rows exactly.
 */

import { randomInt } from '../prng.js';

/**
 * Ensures exactly 3 positive integer distractors distinct from correctVal and each other.
 * @param {number} correctVal
 * @param {number[]} candidateVals
 * @param {string} unit
 * @returns {string[]} Exactly 3 formatted distractor strings
 */
function createDistractors(correctVal, candidateVals, unit) {
  const chosen = new Set();
  const format = v => (unit ? `${v} ${unit}` : `${v}`);

  for (const c of candidateVals) {
    if (typeof c === 'number' && Number.isInteger(c) && c > 0 && c !== correctVal) {
      chosen.add(c);
      if (chosen.size === 3) break;
    }
  }

  // Fallback offsets if candidates were not distinct or overlapped
  const offsets = [5, -3, 8, -6, 12, -9, 15, 20];
  for (const off of offsets) {
    if (chosen.size === 3) break;
    const v = correctVal + off;
    if (v > 0 && v !== correctVal && !chosen.has(v)) {
      chosen.add(v);
    }
  }

  return Array.from(chosen).slice(0, 3).map(format);
}

export const physicsTemplates = [
  // 1. Net force F = m * a (m: 2-20 kg, a: 1-10 m/s²)
  {
    id: 'F_MA',
    section: 'Physics',
    topic: "Newton's second law",
    skill: 'Force calculation',
    difficulty: 'Easy/Moderate',
    compute(m, a) {
      return m * a;
    },
    make(rng) {
      const m = randomInt(2, 20, rng);
      const a = randomInt(1, 10, rng);
      const correctVal = m * a;
      const unit = 'N';

      const prompt = `A body of mass ${m} kg accelerates at ${a} m/s². What is the net force?`;
      const rationale = `F = ma = ${m} × ${a} = ${correctVal} N.`;
      const hint = 'Use the relationship among net force, mass and acceleration.';

      const candidates = [
        m + a,                  // sum instead of product
        (m + 1) * a,            // off-by-one mass
        m * (a + 1),            // off-by-one acceleration
        m > 1 ? (m - 1) * a : m * a + 4
      ];

      return {
        prompt,
        correct: `${correctVal} ${unit}`,
        distractors: createDistractors(correctVal, candidates, unit),
        rationale,
        hint,
        inputs: { m, a },
        correctVal
      };
    }
  },

  // 2. Kinematics v = u + a * t (u: 2-25 m/s, a: 1-8 m/s², t: 1-10 s)
  {
    id: 'V_UAT',
    section: 'Physics',
    topic: 'Kinematics',
    skill: 'Final velocity',
    difficulty: 'Easy/Moderate',
    compute(u, a, t) {
      return u + a * t;
    },
    make(rng) {
      const u = randomInt(2, 25, rng);
      const a = randomInt(1, 8, rng);
      const t = randomInt(1, 10, rng);
      const correctVal = u + a * t;
      const unit = 'm/s';

      const prompt = `An object has initial velocity ${u} m/s and constant acceleration ${a} m/s² for ${t} s. Find final velocity.`;
      const rationale = `v = u + at = ${u} + ${a}×${t} = ${correctVal} m/s.`;
      const hint = 'Choose the constant-acceleration equation involving time.';

      const candidates = [
        u + a + t,              // added everything
        u + a * (t + 1),        // off-by-one time
        (u + a) * t,            // wrong precedence
        u + (a + 1) * t
      ];

      return {
        prompt,
        correct: `${correctVal} ${unit}`,
        distractors: createDistractors(correctVal, candidates, unit),
        rationale,
        hint,
        inputs: { u, a, t },
        correctVal
      };
    }
  },

  // 3. Momentum p = m * v (m: 2-15 kg, v: 2-20 m/s)
  {
    id: 'P_MV',
    section: 'Physics',
    topic: 'Momentum',
    skill: 'Linear momentum',
    difficulty: 'Easy/Moderate',
    compute(m, v) {
      return m * v;
    },
    make(rng) {
      const m = randomInt(2, 15, rng);
      const v = randomInt(2, 20, rng);
      const correctVal = m * v;
      const unit = 'kg·m/s';

      const prompt = `What is the momentum of a ${m} kg object moving at ${v} m/s?`;
      const rationale = `p = mv = ${m}×${v} = ${correctVal} kg·m/s.`;
      const hint = 'Momentum combines mass and velocity.';

      const candidates = [
        m + v,                  // sum instead of product
        (m + 1) * v,            // off-by-one mass
        m * (v + 2),            // off-by-two velocity
        m > 1 ? (m - 1) * v : m * v + 6
      ];

      return {
        prompt,
        correct: `${correctVal} ${unit}`,
        distractors: createDistractors(correctVal, candidates, unit),
        rationale,
        hint,
        inputs: { m, v },
        correctVal
      };
    }
  },

  // 4. Ohm's law V = I * R (R: 2-25 Ω, I: 1-12 A)
  {
    id: 'V_IR',
    section: 'Physics',
    topic: 'Electricity',
    skill: "Ohm's law",
    difficulty: 'Easy/Moderate',
    compute(I, R) {
      return I * R;
    },
    make(rng) {
      const R = randomInt(2, 25, rng);
      const I = randomInt(1, 12, rng);
      const correctVal = I * R;
      const unit = 'V';

      const prompt = `A resistor of ${R} Ω carries ${I} A. What is the voltage across it?`;
      const rationale = `V = IR = ${I}×${R} = ${correctVal} V.`;
      const hint = 'Apply the voltage-current-resistance relationship.';

      const candidates = [
        I + R,                  // sum instead of product
        (I + 1) * R,            // off-by-one current
        I * (R + 2),            // off-by-two resistance
        I > 1 ? (I - 1) * R : I * R + 5
      ];

      return {
        prompt,
        correct: `${correctVal} ${unit}`,
        distractors: createDistractors(correctVal, candidates, unit),
        rationale,
        hint,
        inputs: { I, R },
        correctVal
      };
    }
  },

  // 5. Gravitational potential energy PE = m * g * h with g = 10 (m: 1-15 kg, h: 2-20 m)
  {
    id: 'PE_MGH',
    section: 'Physics',
    topic: 'Work and energy',
    skill: 'Gravitational potential energy',
    difficulty: 'Easy/Moderate',
    compute(m, h) {
      return m * 10 * h;
    },
    make(rng) {
      const m = randomInt(1, 15, rng);
      const h = randomInt(2, 20, rng);
      const correctVal = m * 10 * h;
      const unit = 'J';

      const prompt = `Taking g = 10 m/s², find the gravitational potential energy of a ${m} kg object at height ${h} m.`;
      const rationale = `Eₚ = mgh = ${m}×10×${h} = ${correctVal} J.`;
      const hint = 'Use mass, gravitational acceleration and height.';

      const candidates = [
        m * h,                  // omitted g
        (m + 1) * 10 * h,       // off-by-one mass
        m * 10 * (h + 1),       // off-by-one height
        (m + h) * 10            // sum * g
      ];

      return {
        prompt,
        correct: `${correctVal} ${unit}`,
        distractors: createDistractors(correctVal, candidates, unit),
        rationale,
        hint,
        inputs: { m, h },
        correctVal
      };
    }
  },

  // 6. Dimensional analysis / product: a * b (a: 2-25, b: 2-20)
  {
    id: 'A_TIMES_B',
    section: 'Physics',
    topic: 'Units and dimensions',
    skill: 'Dimensional analysis',
    difficulty: 'Easy/Moderate',
    compute(a, b) {
      return a * b;
    },
    make(rng) {
      const a = randomInt(2, 25, rng);
      const b = randomInt(2, 20, rng);
      const correctVal = a * b;
      const unit = '';

      const prompt = `A quantity is calculated as ${a} × ${b}. What is the numerical result, with units inherited from the product?`;
      const rationale = `${a} × ${b} = ${correctVal}.`;
      const hint = 'Calculate carefully and check the requested units.';

      const candidates = [
        a + b,                  // sum instead of product
        (a + 1) * b,            // off-by-one factor a
        a * (b + 1),            // off-by-one factor b
        (a - 1) * b
      ];

      return {
        prompt,
        correct: `${correctVal}`,
        distractors: createDistractors(correctVal, candidates, unit),
        rationale,
        hint,
        inputs: { a, b },
        correctVal
      };
    }
  }
];

