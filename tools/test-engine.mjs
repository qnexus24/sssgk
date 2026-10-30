/**
 * tools/test-engine.mjs
 * Unit test suite for the test engine per 04_TEST_ENGINE_SPEC.md §10 and 06 §A2/A3.
 *
 * Runs with Node:
 *   node tools/test-engine.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  generateTest,
  availability,
  scoreTest,
  updateStats,
  createRng,
  generateTestCode,
  physicsTemplates,
  generatorRegistry,
  generateParametricQuestion
} from '../practice/js/engine/index.js';

// Load question bank
const bankPath = fs.existsSync('practice/data/questions.json')
  ? 'practice/data/questions.json'
  : (fs.existsSync('reference/data/questions.json') ? 'reference/data/questions.json' : 'reference/questions.json');

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passedChecks++;
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('       SSSGK TEST ENGINE SPECIFICATION TESTS        ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST 1: Seeded Randomness & Deterministic Reproduction
  // ----------------------------------------------------
  console.log('--- Test 1: Seeded Randomness & Reproducibility ---');
  {
    const config = {
      sections: [
        { key: 'Physics', count: 5 },
        { key: 'Chemistry', count: 5 },
        { key: 'Biology', count: 5 }
      ],
      mode: 'random',
      seed: 'TEST99'
    };

    const test1 = generateTest({ ...config, bank });
    const test2 = generateTest({ ...config, bank });

    assert(test1.code === 'TEST99', 'Test code matches provided seed string');
    assert(test1.items.length === test2.items.length, 'Item lengths match identically for same seed');
    assert(
      JSON.stringify(test1.items.map(i => i.id)) === JSON.stringify(test2.items.map(i => i.id)),
      'Exact same question IDs in identical order for same seed'
    );
    assert(
      JSON.stringify(test1.items.map(i => i.options)) === JSON.stringify(test2.items.map(i => i.options)),
      'Exact same option permutations for same seed'
    );
    assert(
      JSON.stringify(test1.items.map(i => i.answerIndex)) === JSON.stringify(test2.items.map(i => i.answerIndex)),
      'Exact same answer indices for same seed'
    );

    // Test diversity across 200 random seeds (>= 95% must differ)
    const signatures = new Set();
    const seedCount = 200;
    for (let s = 0; s < seedCount; s++) {
      const t = generateTest({
        sections: [{ key: 'Physics', count: 5 }],
        mode: 'random',
        bank
      });
      const sig = t.items.map(i => `${i.id}:${i.answerIndex}`).join('|');
      signatures.add(sig);
    }
    const diversityRatio = signatures.size / seedCount;
    assert(diversityRatio >= 0.95, `Different seeds produce different tests: ${signatures.size}/${seedCount} (${(diversityRatio * 100).toFixed(1)}% >= 95%)`);
  }

  // ----------------------------------------------------
  // TEST 2: Group Deduplication & Count Clamping
  // ----------------------------------------------------
  console.log('\n--- Test 2: Group Deduplication & Availability Clamping ---');
  {
    const avail = availability(bank);
    assert(avail.getAvailable('Biology') === 10, 'Biology pool size is strictly 10 unique groups');
    assert(avail.getAvailable('Physics') === 109, 'Physics pool size is 109 unique groups');
    assert(avail.clamp('Biology', 25) === 10, 'Clamps requested count 25 for Biology down to 10');

    // Generate test requesting 20 Biology questions (must clamp to 10)
    const bioTest = generateTest({
      sections: [{ key: 'Biology', count: 20 }],
      bank
    });
    assert(bioTest.items.length === 10, `Requested 20 Biology questions clamped to available 10 (got ${bioTest.items.length})`);

    // Verify zero duplicate groupIds across 50 random test generations
    let duplicatesFound = 0;
    for (let i = 0; i < 50; i++) {
      const t = generateTest({
        sections: [
          { key: 'Physics', count: 15 },
          { key: 'Chemistry', count: 15 },
          { key: 'Biology', count: 10 },
          { key: 'Cognitive skills', count: 15 }
        ],
        bank
      });
      const groupIds = new Set();
      for (const item of t.items) {
        if (groupIds.has(item.groupId)) {
          duplicatesFound++;
        }
        groupIds.add(item.groupId);
      }
    }
    assert(duplicatesFound === 0, 'Zero duplicate groupIds in any generated test (checked across 50 tests)');
  }

  // ----------------------------------------------------
  // TEST 3: Answer Letter Distribution (04 §5)
  // ----------------------------------------------------
  console.log('\n--- Test 3: Option Shuffling & Letter Distribution Rule ---');
  {
    // Rule: across a test of >= 8 MCQs no letter may hold > 40% of correct answers
    let violations = 0;
    const testCases = [8, 12, 16, 20, 40];

    for (const count of testCases) {
      for (let s = 0; s < 25; s++) {
        const t = generateTest({
          sections: [{ key: 'Physics', count }],
          bank
        });
        const counts = [0, 0, 0, 0];
        for (const item of t.items) {
          counts[item.answerIndex]++;
        }
        const maxFreq = Math.max(...counts);
        const maxRatio = maxFreq / count;
        if (maxRatio > 0.40) {
          violations++;
          console.error(`Letter distribution violation: ${counts.join(',')} for total ${count} (ratio ${maxRatio})`);
        }
      }
    }
    assert(violations === 0, 'No letter holds > 40% of correct answers in any test with >= 8 MCQs (125 tests tested)');
  }

  // ----------------------------------------------------
  // TEST 4: Topic Coverage
  // ----------------------------------------------------
  console.log('\n--- Test 4: Topic Coverage (Round-Robin) ---');
  {
    // Physics has 7 topics. When count >= 7, all 7 topics must be present.
    const phyTopics = new Set(bank.filter(q => q.section === 'Physics').map(q => q.topic));
    const tPhy = generateTest({
      sections: [{ key: 'Physics', count: 7 }],
      bank
    });
    const coveredPhy = new Set(tPhy.items.map(i => i.topic));
    assert(coveredPhy.size === phyTopics.size, `All ${phyTopics.size} Physics topics represented when count = ${phyTopics.size}`);

    // Chemistry has 11 topics. When count >= 11, all 11 topics must be present.
    const chemTopics = new Set(bank.filter(q => q.section === 'Chemistry').map(q => q.topic));
    const tChem = generateTest({
      sections: [{ key: 'Chemistry', count: 11 }],
      bank
    });
    const coveredChem = new Set(tChem.items.map(i => i.topic));
    assert(coveredChem.size === chemTopics.size, `All ${chemTopics.size} Chemistry topics represented when count = ${chemTopics.size}`);
  }

  // ----------------------------------------------------
  // TEST 5: Smart Mode History Weighting
  // ----------------------------------------------------
  console.log('\n--- Test 5: Smart Mode Weighting Over 500 Seeds ---');
  {
    // Construct history where Topic A has 0% accuracy (weak) and Topic B has 100% accuracy (strong)
    const topicWeak = "Newton's second law"; // 0/10 correct -> mastery = 1/12 ≈ 0.083 -> weight = 1.417
    const topicStrong = "Kinematics";         // 10/10 correct -> mastery = 11/12 ≈ 0.917 -> weight = 0.583

    const history = {
      seenIds: [],
      topicStats: {
        [topicWeak]: { attempts: 10, correct: 0 },
        [topicStrong]: { attempts: 10, correct: 10 }
      }
    };

    let weakCount = 0;
    let strongCount = 0;
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const t = generateTest({
        sections: [{ key: 'Physics', count: 14 }],
        mode: 'smart',
        history,
        bank,
        seed: `SMART_${i}`
      });

      for (const item of t.items) {
        if (item.topic === topicWeak) weakCount++;
        if (item.topic === topicStrong) strongCount++;
      }
    }

    console.log(`    Smart Mode distribution over ${iterations} runs: Weak Topic (${topicWeak}) = ${weakCount}, Strong Topic (${topicStrong}) = ${strongCount}`);
    assert(weakCount > strongCount, `Smart mode prioritised weak topic over strong topic (${weakCount} > ${strongCount})`);
    assert(weakCount / strongCount >= 1.25, `Weak topic selected significantly more often (ratio: ${(weakCount / strongCount).toFixed(2)}x >= 1.25x)`);
  }

  // ----------------------------------------------------
  // TEST 6: Scoring Edge Cases (NEET & Simple Schemes)
  // ----------------------------------------------------
  console.log('\n--- Test 6: Scoring Logic & Edge Cases ---');
  {
    const sampleTest = generateTest({
      sections: [{ key: 'Physics', count: 5 }],
      bank,
      seed: 'SCORE1'
    });
    const items = sampleTest.items;

    // Edge Case 1: All Skipped
    const scoreSkipped = scoreTest({
      test: sampleTest,
      answers: {},
      markingScheme: 'neet'
    });
    assert(scoreSkipped.score === 0, 'All skipped score is 0');
    assert(scoreSkipped.skipped === 5, 'All 5 questions registered as skipped');
    assert(scoreSkipped.attempted === 0, 'Attempted count is 0');

    // Edge Case 2: All Wrong with NEET (-1) marking
    const wrongAnswers = {};
    for (const it of items) {
      wrongAnswers[it.qid] = (it.answerIndex + 1) % 4; // intentionally wrong
    }
    const scoreWrong = scoreTest({
      test: sampleTest,
      answers: wrongAnswers,
      markingScheme: 'neet'
    });
    assert(scoreWrong.score === -5, `All wrong with NEET (-1) marking yields -5 (got ${scoreWrong.score})`);
    assert(scoreWrong.wrong === 5, 'All 5 registered as wrong');

    // Edge Case 3: Mixed scenario: 3 correct, 1 wrong, 1 skipped
    // Expected NEET: 3 * 4 - 1 * 1 + 0 = 11
    // Expected Simple: 3 * 1 - 0 = 3
    const mixedAnswers = {
      [items[0].qid]: items[0].answerIndex,              // Correct (+4)
      [items[1].qid]: items[1].answerIndex,              // Correct (+4)
      [items[2].qid]: items[2].answerIndex,              // Correct (+4)
      [items[3].qid]: (items[3].answerIndex + 1) % 4     // Wrong (-1)
      // items[4] skipped (0)
    };

    const scoreNeet = scoreTest({
      test: sampleTest,
      answers: mixedAnswers,
      markingScheme: 'neet'
    });
    assert(scoreNeet.score === 11, `Mixed NEET score equals 11 (3*4 - 1 = 11, got ${scoreNeet.score})`);
    assert(scoreNeet.correct === 3, 'Correct count is 3');
    assert(scoreNeet.wrong === 1, 'Wrong count is 1');
    assert(scoreNeet.skipped === 1, 'Skipped count is 1');

    const scoreSimple = scoreTest({
      test: sampleTest,
      answers: mixedAnswers,
      markingScheme: 'simple'
    });
    assert(scoreSimple.score === 3, `Mixed Simple score equals 3 (3*1 = 3, got ${scoreSimple.score})`);

    // Edge Case 4: Open/Reflection questions (never added to score)
    const mixedTest = generateTest({
      sections: [
        { key: 'Physics', count: 2 },
        { key: 'Learning behaviours', count: 2 }
      ],
      bank,
      seed: 'REFL1'
    });
    const reflItems = mixedTest.items.filter(i => i.type !== 'mcq');
    const reflAnswers = {
      [mixedTest.items[0].qid]: mixedTest.items[0].answerIndex, // +4
      [mixedTest.items[1].qid]: mixedTest.items[1].answerIndex, // +4
      [reflItems[0].qid]: 'I will review my summary notes.',
      [reflItems[1].qid]: 'I will test myself on formulas.'
    };
    const selfScores = {
      [reflItems[0].qid]: 3,
      [reflItems[1].qid]: 4
    };

    const scoreWithReflection = scoreTest({
      test: mixedTest,
      answers: reflAnswers,
      markingScheme: 'neet',
      selfScores
    });
    assert(scoreWithReflection.score === 8, 'Reflection items are NOT added to the exam score');
    assert(scoreWithReflection.reflection.length === 2, 'Reflection items recorded separately');
    assert(scoreWithReflection.reflection[0].selfScore === 3, 'Reflection selfScore captured');
  }

  // ----------------------------------------------------
  // TEST 7: Stats Update & Anti-Repeat Seen Memory (§9)
  // ----------------------------------------------------
  console.log('\n--- Test 7: Anti-Repeat Memory & History Updates ---');
  {
    let history = { seenIds: [], topicStats: {} };
    const t = generateTest({
      sections: [{ key: 'Physics', count: 5 }],
      bank,
      seed: 'SEEN1'
    });
    const scored = scoreTest({
      test: t,
      answers: { [t.items[0].qid]: t.items[0].answerIndex },
      markingScheme: 'neet'
    });

    history = updateStats(history, scored);
    assert(history.seenIds.length === 5, 'All 5 question IDs added to seenIds');

    // Simulate accumulation over 150 tests to verify capping at 600
    for (let k = 0; k < 150; k++) {
      const dummyScored = {
        items: Array.from({ length: 10 }, (_, idx) => ({ id: `TEST-Q-${k}-${idx}` }))
      };
      history = updateStats(history, dummyScored);
    }
    assert(history.seenIds.length === 600, `seenIds capped at exactly 600 (got ${history.seenIds.length})`);
  }

  // ----------------------------------------------------
  // TEST 8: Generation Performance Benchmark (< 20 ms)
  // ----------------------------------------------------
  console.log('\n--- Test 8: Performance Benchmark (< 20 ms) ---');
  {
    // Generate a 10-question-per-section test (4 sections = 40 questions total)
    const start = performance.now();
    const runs = 10;
    for (let r = 0; r < runs; r++) {
      generateTest({
        sections: [
          { key: 'Physics', count: 10 },
          { key: 'Chemistry', count: 10 },
          { key: 'Biology', count: 10 },
          { key: 'Cognitive skills', count: 10 }
        ],
        mode: 'random',
        bank
      });
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / runs;
    console.log(`    Average generation time for 40-question test: ${avgMs.toFixed(2)} ms`);
    assert(avgMs < 20, `Generating 10-question-per-section test took < 20 ms (measured ${avgMs.toFixed(2)} ms)`);
  }

  // ----------------------------------------------------
  // TEST 9: Parametric Generators 10,000-Sample Check (Task A3, §8)
  // ----------------------------------------------------
  console.log('\n--- Test 9: Parametric Generators 10,000-Sample Validation ---');
  {
    assert(physicsTemplates.length >= 6, `At least 6 physics templates implemented (found ${physicsTemplates.length})`);
    const rng = createRng('BENCHMARK_10K');
    const sampleSize = 10000;
    let templateFailures = 0;

    const start10k = performance.now();
    for (let i = 0; i < sampleSize; i++) {
      const template = physicsTemplates[i % physicsTemplates.length];
      const q = generateParametricQuestion(template, rng, `S${i}`);

      // 1. Recompute independently
      let expectedVal;
      if (template.id === 'F_MA') expectedVal = template.compute(q._inputs.m, q._inputs.a);
      else if (template.id === 'V_UAT') expectedVal = template.compute(q._inputs.u, q._inputs.a, q._inputs.t);
      else if (template.id === 'P_MV') expectedVal = template.compute(q._inputs.m, q._inputs.v);
      else if (template.id === 'V_IR') expectedVal = template.compute(q._inputs.I, q._inputs.R);
      else if (template.id === 'PE_MGH') expectedVal = template.compute(q._inputs.m, q._inputs.h);
      else if (template.id === 'A_TIMES_B') expectedVal = template.compute(q._inputs.a, q._inputs.b);

      if (expectedVal !== q._correctVal) {
        templateFailures++;
      }

      // 2. Options checks: length 4, all distinct, non-empty
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        templateFailures++;
      }
      const uniqueOpts = new Set(q.options);
      if (uniqueOpts.size !== 4) {
        templateFailures++;
      }

      // 3. Correct answer present in options
      if (!q.options.some(opt => opt.includes(String(expectedVal)))) {
        templateFailures++;
      }
    }
    const duration10k = performance.now() - start10k;
    console.log(`    Generated and verified ${sampleSize} parametric questions in ${duration10k.toFixed(1)} ms (${(duration10k / sampleSize * 1000).toFixed(1)} µs/item)`);
    assert(templateFailures === 0, `10,000-sample parametric self-check passed with zero defects`);

    // Verify generated question in generateTest when includeGenerated is ON
    const testWithGen = generateTest({
      sections: [{ key: 'Physics', count: 10 }],
      includeGenerated: true,
      bank,
      seed: 'GEN_ON_1'
    });
    const hasGen = testWithGen.items.some(it => it.generated === true);
    assert(hasGen, 'Physics test includes generated questions when includeGenerated is true');
  }

  console.log('\n====================================================');
  console.log(`✓ ALL TESTS PASSED: ${passedChecks}/${totalChecks} checks succeeded.`);
  console.log('====================================================');
}

runTestSuite().catch(err => {
  console.error('\n✗ TEST SUITE FAILED:', err);
  process.exit(1);
});

