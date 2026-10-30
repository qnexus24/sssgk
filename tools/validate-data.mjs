/**
 * tools/validate-data.mjs
 * Validates question bank integrity according to 03_QUESTION_BANK_SPEC.md §4.
 *
 * Usage:
 *   node tools/validate-data.mjs [path-to-questions.json]
 */

import fs from 'node:fs';
import path from 'node:path';

export function validateQuestionBank(questions) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(questions)) {
    return { valid: false, errors: ['Question bank must be an array of objects'], warnings };
  }

  // 1. Exactly 1000 unique ids
  if (questions.length !== 1000) {
    errors.push(`Expected exactly 1000 questions, found ${questions.length}`);
  }

  const seenIds = new Set();
  const groupSections = new Map();
  const groupTypes = new Map();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `[Row ${i + 1} id=${q?.id || 'MISSING'}]`;

    if (!q || typeof q !== 'object') {
      errors.push(`${prefix} Question entry must be an object`);
      continue;
    }

    // ID checks
    if (typeof q.id !== 'string' || !q.id.trim()) {
      errors.push(`${prefix} 'id' must be a non-empty string`);
    } else {
      if (seenIds.has(q.id)) {
        errors.push(`${prefix} Duplicate id found: '${q.id}'`);
      }
      seenIds.add(q.id);
    }

    // groupId checks
    if (typeof q.groupId !== 'string' || !q.groupId.trim()) {
      errors.push(`${prefix} 'groupId' must be a non-empty string`);
    }

    // Section and Type checks per group
    if (q.groupId) {
      if (!groupSections.has(q.groupId)) {
        groupSections.set(q.groupId, q.section);
      } else if (groupSections.get(q.groupId) !== q.section) {
        errors.push(`${prefix} groupId '${q.groupId}' spans multiple sections: '${groupSections.get(q.groupId)}' and '${q.section}'`);
      }

      if (!groupTypes.has(q.groupId)) {
        groupTypes.set(q.groupId, q.type);
      } else if (groupTypes.get(q.groupId) !== q.type) {
        errors.push(`${prefix} groupId '${q.groupId}' spans multiple types: '${groupTypes.get(q.groupId)}' and '${q.type}'`);
      }
    }

    // Prompt check
    if (typeof q.prompt !== 'string' || !q.prompt.trim()) {
      errors.push(`${prefix} 'prompt' must be a non-empty string`);
    }

    // Section check
    if (typeof q.section !== 'string' || !q.section.trim()) {
      errors.push(`${prefix} 'section' must be a non-empty string`);
    }

    // Topic check
    if (typeof q.topic !== 'string' || !q.topic.trim()) {
      errors.push(`${prefix} 'topic' must be a non-empty string`);
    }

    // Type-specific checks
    if (q.type === 'mcq') {
      // Options checks
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`${prefix} MCQ must have exactly 4 options`);
      } else {
        const trimmedOptions = [];
        for (let optIdx = 0; optIdx < 4; optIdx++) {
          const opt = q.options[optIdx];
          if (typeof opt !== 'string' || !opt.trim()) {
            errors.push(`${prefix} Option [${optIdx}] must be a non-empty string`);
          } else {
            trimmedOptions.push(opt.trim());
          }
        }

        // Distinct options check
        const uniqueOptions = new Set(trimmedOptions);
        if (uniqueOptions.size !== 4 && trimmedOptions.length === 4) {
          errors.push(`${prefix} Options must be mutually distinct: ${JSON.stringify(q.options)}`);
        }

        // Shuffling safety checks:
        // No option starts with "All of the above" or "None of the above"
        // No option references other option letters (e.g. "Both A and B", "Option A")
        for (const opt of trimmedOptions) {
          if (/^(all|none)\s+of\s+the\s+above/i.test(opt)) {
            errors.push(`${prefix} Option references position ("All/None of the above"): '${opt}'`);
          }
          if (/\b(?:both|either)\s+[a-d]\s+(?:and|or)\s+[a-d]\b/i.test(opt) || /\boption\s+[a-d]\b/i.test(opt)) {
            errors.push(`${prefix} Option references option letter: '${opt}'`);
          }
        }
      }

      // answerIndex check: must be integer in 0..3
      if (typeof q.answerIndex !== 'number' || !Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) {
        errors.push(`${prefix} MCQ 'answerIndex' must be an integer between 0 and 3, got: ${q.answerIndex}`);
      }
    } else if (q.type === 'open_response' || q.type === 'scenario_response') {
      // Open types
      if (q.rubricMax !== 3 && q.rubricMax !== 4) {
        errors.push(`${prefix} Open question 'rubricMax' must be 3 or 4, got: ${q.rubricMax}`);
      }
      if (q.scored !== false) {
        errors.push(`${prefix} Open question 'scored' must be explicitly false`);
      }
    } else {
      errors.push(`${prefix} Unknown question type: '${q.type}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalQuestions: questions.length,
      uniqueIds: seenIds.size,
      uniqueGroups: groupSections.size
    }
  };
}

// CLI Execution
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || process.argv[1]);

if (isMain) {
  const defaultPaths = [
    process.argv[2],
    'practice/data/questions.json',
    'reference/data/questions.json',
    'reference/questions.json'
  ].filter(Boolean);

  let targetPath = null;
  for (const candidate of defaultPaths) {
    if (fs.existsSync(candidate)) {
      targetPath = candidate;
      break;
    }
  }

  if (!targetPath) {
    console.error('Error: Could not locate questions.json file to validate.');
    process.exit(1);
  }

  console.log(`Validating question bank at: ${targetPath}`);
  let rawData;
  try {
    rawData = fs.readFileSync(targetPath, 'utf8');
  } catch (err) {
    console.error(`Failed to read ${targetPath}:`, err.message);
    process.exit(1);
  }

  let questions;
  try {
    questions = JSON.parse(rawData);
  } catch (err) {
    console.error(`Failed to parse JSON in ${targetPath}:`, err.message);
    process.exit(1);
  }

  const result = validateQuestionBank(questions);

  if (result.valid) {
    console.log('✓ Validation PASSED:');
    console.log(`  - Total items: ${result.summary.totalQuestions}`);
    console.log(`  - Unique IDs: ${result.summary.uniqueIds}`);
    console.log(`  - Unique Groups: ${result.summary.uniqueGroups}`);
    console.log('  - All MCQs have 4 mutually distinct non-empty options');
    console.log('  - All answerIndex values within 0..3');
    console.log('  - All groupIds have consistent section and type');
    console.log('  - No options reference position ("All/None of the above") or option letters');
    console.log('  - Open questions have rubricMax in {3, 4} and scored === false');
    process.exit(0);
  } else {
    console.error(`✗ Validation FAILED with ${result.errors.length} error(s):`);
    for (const err of result.errors.slice(0, 50)) {
      console.error(`  - ${err}`);
    }
    if (result.errors.length > 50) {
      console.error(`  ... and ${result.errors.length - 50} more errors.`);
    }
    process.exit(1);
  }
}

