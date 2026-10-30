/**
 * practice/js/engine/generators/index.js
 * Registry and dispatcher for parametric question generation.
 */

import { physicsTemplates } from './physics.js';
import { generateTestCode } from '../prng.js';

export const generatorRegistry = [
  ...physicsTemplates
];

/**
 * Returns templates matching a given section.
 * @param {string} section
 * @returns {object[]}
 */
export function getTemplatesForSection(section) {
  return generatorRegistry.filter(t => t.section.toLowerCase() === section.toLowerCase());
}

/**
 * Generates a single parametric question from a template.
 * @param {object|string} templateOrId
 * @param {() => number} [rng]
 * @param {string} [seedSuffix]
 * @returns {object} Full question item
 */
export function generateParametricQuestion(templateOrId, rng = Math.random, seedSuffix) {
  const template = typeof templateOrId === 'string'
    ? generatorRegistry.find(t => t.id === templateOrId)
    : templateOrId;

  if (!template) {
    throw new Error(`Unknown generator template: ${templateOrId}`);
  }

  const suffix = seedSuffix || generateTestCode(rng);
  const data = template.make(rng);

  return {
    id: `GEN-${template.id}-${suffix}`,
    groupId: `GEN-G-${template.id}`,
    section: template.section,
    topic: template.topic,
    skill: template.skill,
    difficulty: template.difficulty,
    type: 'mcq',
    prompt: data.prompt,
    options: [data.correct, ...data.distractors],
    answerIndex: 0,
    rationale: data.rationale,
    hint: data.hint,
    generated: true,
    scored: true,
    status: 'draft',
    // Verification fields
    _templateId: template.id,
    _inputs: data.inputs,
    _correctVal: data.correctVal
  };
}

