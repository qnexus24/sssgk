/**
 * practice/js/engine/index.js
 * Main entry point for the test engine.
 * Exports generateTest, scoreTest, updateStats, availability and helper utilities.
 */

export { generateTest, availability, SECTION_ORDER } from './selector.js';
export { scoreTest, MARKING_SCHEMES } from './scoring.js';
export { updateStats, computeMastery, computeTopicWeight } from './stats.js';
export { mulberry32, hashString, createRng, generateTestCode, CODE_ALPHABET, randomInt } from './prng.js';
export { shuffleArray, shuffleQuestionOptions, balanceAnswerDistribution } from './shuffle.js';
export { generatorRegistry, generateParametricQuestion, getTemplatesForSection } from './generators/index.js';
export { physicsTemplates } from './generators/physics.js';

