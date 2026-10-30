/**
 * practice/js/config.js
 * Central configuration for practice tests and presets editable by the platform owner.
 * Defines presets, question counts, timing, and default test settings.
 */

export const PRESETS = [
  {
    id: 'quick10',
    name: 'Quick 10',
    title: 'Quick 10',
    desc: 'Fast daily warm-up with balanced physics, chemistry, and biology coverage.',
    tag: 'Quick Drill',
    sections: [
      { key: 'Physics', count: 4 },
      { key: 'Chemistry', count: 3 },
      { key: 'Biology', count: 3 }
    ],
    timeMinutes: 12,
    marking: 'neet'
  },
  {
    id: 'minimock',
    name: 'Mini Mock',
    title: 'Mini Mock (30 questions)',
    desc: 'Comprehensive 30-question test simulating NEET section balance and pace.',
    tag: 'NEET Foundation',
    sections: [
      { key: 'Physics', count: 10 },
      { key: 'Chemistry', count: 10 },
      { key: 'Biology', count: 10 }
    ],
    timeMinutes: 36,
    marking: 'neet',
    recommended: true
  },
  {
    id: 'physics-drill',
    name: 'Physics Drill',
    title: 'Physics Drill',
    desc: 'Mechanics, kinematics, and electricity problem sets with parametric variation.',
    tag: 'Subject Drill',
    sections: [
      { key: 'Physics', count: 15 }
    ],
    timeMinutes: 18,
    marking: 'neet',
    includeGenerated: true
  },
  {
    id: 'chemistry-drill',
    name: 'Chemistry Drill',
    title: 'Chemistry Drill',
    desc: 'Focused practice on chemical bonding, states of matter, and reactions.',
    tag: 'Subject Drill',
    sections: [
      { key: 'Chemistry', count: 15 }
    ],
    timeMinutes: 18,
    marking: 'neet'
  },
  {
    id: 'biology-drill',
    name: 'Biology Drill',
    title: 'Biology Drill',
    desc: 'Cell biology, genetics, and ecology conceptual question sets.',
    tag: 'Subject Drill',
    sections: [
      { key: 'Biology', count: 10 }
    ],
    timeMinutes: 12,
    marking: 'neet'
  },
  {
    id: 'cognitive-skills',
    name: 'Cognitive Skills',
    title: 'Cognitive Skills',
    desc: 'Analytical reasoning, pattern recognition, and problem-solving drills.',
    tag: 'Cognitive & Logic',
    sections: [
      { key: 'Cognitive skills', count: 10 }
    ],
    timeMinutes: 12,
    marking: 'neet'
  },
  {
    id: 'reflection',
    name: 'Reflection Check-in',
    title: 'Reflection Check-in',
    desc: 'Self-assessment prompts across Learning Behaviours, Human Values, and Development.',
    tag: 'Self-Evaluation',
    sections: [
      { key: 'Learning behaviours', count: 3 },
      { key: 'Human values', count: 3 },
      { key: 'Learner development', count: 3 }
    ],
    timeMinutes: 0,
    marking: 'none',
    unscored: true
  }
];

export function getPresetById(id) {
  return PRESETS.find(p => p.id === id) || PRESETS.find(p => p.id === 'minimock') || PRESETS[0];
}

// Default test configuration for backward-compatibility
export const TEST_CONFIG = {
  sections: [
    { key: 'Physics', count: 10 },
    { key: 'Chemistry', count: 10 },
    { key: 'Biology', count: 10 }
  ],
  marking: 'neet',
  timeLimitMinutes: 36,
  includeGeneratedPhysics: true
};

export const config = TEST_CONFIG;
export default TEST_CONFIG;
