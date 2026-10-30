/**
 * tools/test-results-history.mjs
 * Verification of Results, Review, History, and Print Features per New Product Flow:
 * - Hand-checked scoreTest scenarios
 * - Result view: score/max, accuracy, section SVG chart, topics to revise, pacing, hint questions, "Take another test"
 * - Removal of test code display, copy button, and "retake same test"
 * - Review view: filters, green/red options, rationale, no draft notice
 * - History view: last 50 attempts, SVG sparklines, mastery table, JSON export/import/clear
 * - Print stylesheet: A4 print optimization
 */

import fs from 'node:fs';
import { scoreTest, generateTest } from '../practice/js/engine/index.js';
import { store } from '../practice/js/store.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(message);
  }
  passed++;
  console.log(`  ✓ PASS: ${message}`);
}

async function runResultsAndHistoryTests() {
  console.log('====================================================');
  console.log('     RESULTS, REVIEW, HISTORY & PRINT TESTS         ');
  console.log('====================================================\n');

  const bank = JSON.parse(fs.readFileSync('practice/data/questions.json', 'utf8'));

  // ----------------------------------------------------
  // TEST C1: 5 Hand-Checked Scenarios for scoreTest
  // ----------------------------------------------------
  console.log('--- Test 1: 5 Hand-Checked Scenarios for scoreTest ---');

  // Scenario 1: All Correct (NEET +4 / -1)
  {
    const test1 = generateTest({ sections: [{ key: 'Physics', count: 10 }], seed: 'SCEN1', bank });
    const answers1 = {};
    test1.items.forEach(it => { answers1[it.qid] = it.answerIndex; });

    const res1 = scoreTest({ test: test1, answers: answers1, markingScheme: 'neet' });
    assert(res1.score === 40, `Scenario 1: All correct score is 40/40 (got ${res1.score})`);
    assert(res1.correct === 10, 'Scenario 1: 10 correct');
    assert(res1.wrong === 0, 'Scenario 1: 0 wrong');
    assert(res1.skipped === 0, 'Scenario 1: 0 skipped');
    assert(res1.accuracyPercent === 100, 'Scenario 1: 100% accuracy');
    assert(res1.topicsToRevise.length === 0, 'Scenario 1: No topics to revise');
  }

  // Scenario 2: All Wrong (NEET +4 / -1)
  {
    const test2 = generateTest({ sections: [{ key: 'Physics', count: 10 }], seed: 'SCEN2', bank });
    const answers2 = {};
    test2.items.forEach(it => { answers2[it.qid] = (it.answerIndex + 1) % 4; });

    const res2 = scoreTest({ test: test2, answers: answers2, markingScheme: 'neet' });
    assert(res2.score === -10, `Scenario 2: All wrong score is -10 (got ${res2.score})`);
    assert(res2.correct === 0, 'Scenario 2: 0 correct');
    assert(res2.wrong === 10, 'Scenario 2: 10 wrong');
    assert(res2.skipped === 0, 'Scenario 2: 0 skipped');
    assert(res2.accuracyPercent === 0, 'Scenario 2: 0% accuracy');
    assert(res2.topicsToRevise.length > 0, 'Scenario 2: All attempted topics flagged for revision');
  }

  // Scenario 3: Mixed NEET (6 Correct, 2 Wrong, 2 Skipped)
  // Expected score: 6 * 4 - 2 * 1 + 0 = 22 out of 40 (Accuracy: 60%)
  {
    const test3 = generateTest({ sections: [{ key: 'Chemistry', count: 10 }], seed: 'SCEN3', bank });
    const answers3 = {};
    for (let i = 0; i < 6; i++) answers3[test3.items[i].qid] = test3.items[i].answerIndex; // 6 correct (+24)
    for (let i = 6; i < 8; i++) answers3[test3.items[i].qid] = (test3.items[i].answerIndex + 1) % 4; // 2 wrong (-2)

    const res3 = scoreTest({ test: test3, answers: answers3, markingScheme: 'neet' });
    assert(res3.score === 22, `Scenario 3: Mixed NEET score is 22 (got ${res3.score})`);
    assert(res3.maxScore === 40, 'Scenario 3: Max score is 40');
    assert(res3.correct === 6, 'Scenario 3: 6 correct');
    assert(res3.wrong === 2, 'Scenario 3: 2 wrong');
    assert(res3.skipped === 2, 'Scenario 3: 2 skipped');
    assert(res3.accuracyPercent === 60, 'Scenario 3: 60% accuracy');
  }

  // Scenario 4: All Skipped (NEET +4 / -1)
  {
    const test4 = generateTest({ sections: [{ key: 'Biology', count: 10 }], seed: 'SCEN4', bank });
    const res4 = scoreTest({ test: test4, answers: {}, markingScheme: 'neet' });
    assert(res4.score === 0, `Scenario 4: All skipped score is 0 (got ${res4.score})`);
    assert(res4.skipped === 10, 'Scenario 4: 10 skipped');
    assert(res4.attempted === 0, 'Scenario 4: 0 attempted');
    assert(res4.accuracyPercent === 0, 'Scenario 4: 0% accuracy');
  }

  // Scenario 5: Simple Marking (+1 / 0) with Reflection Items (Unscored)
  // 5 MCQs (3 correct, 1 wrong, 1 skipped) + 2 Reflection items
  {
    const test5 = generateTest({
      sections: [
        { key: 'Physics', count: 5 },
        { key: 'Learning behaviours', count: 2 }
      ],
      seed: 'SCEN5',
      bank
    });

    const mcqs = test5.items.filter(it => it.type === 'mcq');
    const refls = test5.items.filter(it => it.type !== 'mcq');

    const answers5 = {
      [mcqs[0].qid]: mcqs[0].answerIndex,
      [mcqs[1].qid]: mcqs[1].answerIndex,
      [mcqs[2].qid]: mcqs[2].answerIndex,
      [mcqs[3].qid]: (mcqs[3].answerIndex + 1) % 4,
      [refls[0].qid]: 'I will create a priority checklist.',
      [refls[1].qid]: 'I will monitor my recall with flashcards.'
    };
    const selfScores5 = {
      [refls[0].qid]: 3,
      [refls[1].qid]: 4
    };

    const res5 = scoreTest({
      test: test5,
      answers: answers5,
      markingScheme: 'simple',
      selfScores: selfScores5
    });

    assert(res5.score === 3, `Scenario 5: Simple score is 3 out of 5 (got ${res5.score})`);
    assert(res5.maxScore === 5, 'Scenario 5: Max score is 5 (MCQs only)');
    assert(res5.correct === 3, 'Scenario 5: 3 correct');
    assert(res5.wrong === 1, 'Scenario 5: 1 wrong');
    assert(res5.skipped === 1, 'Scenario 5: 1 skipped');
    assert(res5.reflection.length === 2, 'Scenario 5: 2 reflection items recorded');
    assert(res5.reflection[0].selfScore === 3, 'Scenario 5: Reflection selfScore captured');
    assert(res5.reflection[1].selfScore === 4, 'Scenario 5: Reflection selfScore captured');
  }

  // ----------------------------------------------------
  // TEST C1.2: Result View & Review View Features
  // ----------------------------------------------------
  console.log('\n--- Test 2: Result View & Review View Features ---');
  {
    const resultSrc = fs.readFileSync('practice/js/ui/result.js', 'utf8');
    assert(resultSrc.includes('http://www.w3.org/2000/svg'), 'Result view implements pure SVG chart');
    assert(resultSrc.includes('topicsToRevise'), 'Result view includes topicsToRevise section');
    assert(resultSrc.includes('fastestItem'), 'Result view computes fastest response');
    assert(resultSrc.includes('slowestItem'), 'Result view computes slowest response');
    assert(resultSrc.includes('hintQuestions'), 'Result view includes hint-used questions analysis');
    assert(resultSrc.includes('Take Another Test'), 'Result view implements "Take Another Test" action');
    assert(resultSrc.includes('Choose Another Test'), 'Result view implements "Choose Another Test" action');
    assert(resultSrc.includes('PRESETS') || resultSrc.includes('TEST_CONFIG'), 'Result view imports preset configuration for fresh test generation');

    // Test code and retake must NOT be present on result screen
    assert(!resultSrc.includes('clipboard.writeText'), 'Result view does NOT include test code copy button');
    assert(!resultSrc.includes('Retake Same Test'), 'Result view does NOT include "Retake Same Test" button');
    assert(!resultSrc.includes('STRINGS.draftNotice'), 'Result view does NOT include draft notice');

    const reviewSrc = fs.readFileSync('practice/js/ui/review.js', 'utf8');
    assert(reviewSrc.includes('all') && reviewSrc.includes('wrong') && reviewSrc.includes('skipped'), 'Review view supports All, Wrong, Skipped filters');
    assert(reviewSrc.includes('marked') && reviewSrc.includes('bookmarked') && reviewSrc.includes('correct'), 'Review view supports Marked, Bookmarked, Correct filters');
    assert(reviewSrc.includes('var(--ok)') && reviewSrc.includes('var(--bad)'), 'Review view color-codes options in green (correct) and red (wrong)');
    assert(reviewSrc.includes('rationale'), 'Review view displays rationale explanation');
    assert(!reviewSrc.includes('STRINGS.draftNotice'), 'Review view does NOT include draft notice');
    assert(!reviewSrc.includes('STRINGS.reflectionNotice'), 'Review view does NOT include reflection disclaimer');
  }

  // ----------------------------------------------------
  // TEST C2: History Lifecycle (Export -> Clear -> Import)
  // ----------------------------------------------------
  console.log('\n--- Test 3: History Management & JSON Lifecycle ---');
  {
    store.clearAllData();

    // Populate with 5 diverse attempts
    for (let k = 1; k <= 5; k++) {
      store.saveAttempt({
        id: `ATT-TEST-${k}`,
        code: `CODE${k}X`,
        finishedAt: new Date(Date.now() - k * 86400000).toISOString(),
        score: k * 10,
        max: 50,
        accuracyPercent: k * 20,
        bySection: {
          Physics: { accuracyPercent: 50 + k * 5 },
          Chemistry: { accuracyPercent: 40 + k * 8 }
        }
      });
    }

    store.saveSeenIds(['Q-100', 'Q-101', 'Q-102']);
    store.saveTopicStats({
      'Kinematics': { attempts: 10, correct: 8, mastery: 0.75 },
      'Electricity': { attempts: 6, correct: 2, mastery: 0.375 }
    });

    assert(store.getAttempts().length === 5, 'Stored 5 test attempts');

    // 1. Export Data to JSON
    const exportedJSON = store.exportData();
    assert(typeof exportedJSON === 'string', 'exportData produces string JSON');
    const parsed = JSON.parse(exportedJSON);
    assert(parsed.attempts?.length === 5, 'Exported JSON contains all 5 attempts');
    assert(parsed.seen?.length === 3, 'Exported JSON contains seenIds');
    assert(parsed.topicStats?.Kinematics?.correct === 8, 'Exported JSON contains topicStats');

    // 2. Clear All Data
    store.clearAllData();
    assert(store.getAttempts().length === 0, 'clearAllData cleared all attempts');
    assert(store.getSeenIds().length === 0, 'clearAllData cleared seenIds');
    assert(Object.keys(store.getTopicStats()).length === 0, 'clearAllData cleared topicStats');

    // 3. Import Data from JSON
    const importResult = store.importData(exportedJSON);
    assert(importResult.success === true, 'importData successfully executed');
    assert(store.getAttempts().length === 5, 'All 5 attempts restored after import');
    assert(store.getAttemptById('ATT-TEST-1') !== null, 'Specific attempt retrievable by ID');
    assert(store.getSeenIds().length === 3, 'All seenIds restored after import');
    assert(store.getTopicStats()['Electricity'].correct === 2, 'topicStats restored accurately after import');

    // Verify History view does NOT display test code column
    const historySrc = fs.readFileSync('practice/js/ui/history.js', 'utf8');
    assert(!historySrc.includes('>${a.code}<'), 'History table does NOT display test code to students');
  }

  // ----------------------------------------------------
  // TEST C2.2: Print Stylesheet Validation
  // ----------------------------------------------------
  console.log('\n--- Test 4: Print Stylesheet (print.css) Validation ---');
  {
    const printCss = fs.readFileSync('practice/css/print.css', 'utf8');
    assert(printCss.includes('@media print'), 'print.css defines @media print styles');
    assert(printCss.includes('size: A4') || printCss.includes('A4 portrait'), 'print.css specifies A4 page dimensions');
    assert(printCss.includes('.no-print') && printCss.includes('display: none'), 'print.css hides interactive elements (.no-print, nav, buttons)');
    assert(printCss.includes('page-break-inside: avoid') || printCss.includes('break-inside: avoid'), 'print.css prevents page breaks inside question cards');
    assert(printCss.includes('.print-only'), 'print.css includes print-only header formatting');
    assert(!printCss.toLowerCase().includes('draft'), 'print.css contains zero occurrences of "draft"');
  }

  console.log('\n====================================================');
  console.log(`✓ ALL RESULTS & HISTORY TESTS PASSED: ${passed}/${total} checks succeeded.`);
  console.log('====================================================');
}

runResultsAndHistoryTests().catch(err => {
  console.error('\n✗ TEST FAILED:', err);
  process.exit(1);
});
