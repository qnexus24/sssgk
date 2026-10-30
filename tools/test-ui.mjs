/**
 * tools/test-ui.mjs
 * Verification of Shell & UI Acceptance Criteria per Presets & Immediate-Start Flow:
 * Home (Preset Cards Grid) -> [Start Test] -> Test -> Submit -> Result -> Review -> [Take another test / Choose another test]
 *
 * Tests:
 * 1. Store wrapper resilience (survives disabled/throwing localStorage)
 * 2. Router registration and dynamic route matching (#/, #/test, #/result/:id, #/review/:id, #/history, fallback for unknown routes)
 * 3. Lifecycle cleanup (destroy() called on route change)
 * 4. Presets come from config.js (Quick 10, Mini Mock, Subject drills, Cognitive, Reflection)
 * 5. Clamped counts never exceed pool availability
 * 6. Each preset starts immediately without any setup step
 * 7. Two consecutive attempts of the same preset differ in questions or order
 * 8. Zero occurrences of "draft" in student-visible strings and templates
 * 9. Branding credit "Powered by amAIze" in footer and stylesheets
 * 10. Mid-test refresh state persistence (answers, marks, bookmarks, timing, endsAt)
 */

import fs from 'node:fs';
import { store } from '../practice/js/store.js';
import { Router } from '../practice/js/router.js';
import { availability, generateTest } from '../practice/js/engine/index.js';
import { PRESETS, getPresetById, TEST_CONFIG } from '../practice/js/config.js';
import { STRINGS } from '../practice/js/strings.js';

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    throw new Error(msg);
  }
  passed++;
  console.log(`  ✓ PASS: ${msg}`);
}

async function runUITests() {
  console.log('====================================================');
  console.log('       SHELL & UI ACCEPTANCE TESTS (PRESETS FLOW)   ');
  console.log('====================================================\n');

  // Load bank
  const bank = JSON.parse(fs.readFileSync('practice/data/questions.json', 'utf8'));
  const avail = availability(bank);

  // ----------------------------------------------------
  // TEST 1: Storage Wrapper Survives Disabled LocalStorage
  // ----------------------------------------------------
  console.log('--- Test 1: Store Wrapper & LocalStorage Resilience ---');
  {
    store.clearAllData();
    assert(store.getActiveTest() === null, 'Initial active test is null');
    assert(store.getAttempts().length === 0, 'Initial attempts list is empty');

    const dummyTestState = {
      test: { code: 'ABCDEF', items: [{ id: 'AN-0001' }] },
      answers: { 'AN-0001': 1 },
      marks: ['AN-0001'],
      bookmarks: [],
      timeMs: { 'AN-0001': 5000 },
      cur: 0,
      startedAt: Date.now(),
      endsAt: Date.now() + 60000
    };

    store.saveActiveTest(dummyTestState);
    const restored = store.getActiveTest();
    assert(restored !== null, 'Saved active test successfully retrieved');
    assert(restored.test.code === 'ABCDEF', 'Restored test code matches');
    assert(restored.answers['AN-0001'] === 1, 'Restored answers match');
    assert(restored.timeMs['AN-0001'] === 5000, 'Restored timeMs matches');

    // Test attempt saving (capped at 50)
    for (let i = 0; i < 55; i++) {
      store.saveAttempt({ id: `ATT-${i}`, presetId: 'minimock', presetName: 'Mini Mock', score: i, max: 50 });
    }
    const attempts = store.getAttempts();
    assert(attempts.length === 50, `Attempts array capped at exactly 50 (got ${attempts.length})`);
    assert(attempts[0].id === 'ATT-54', 'Most recent attempt is at index 0');
    assert(attempts[0].presetName === 'Mini Mock', 'Saved attempt stores presetName');

    // Test seenIds and topicStats
    store.saveSeenIds(['Q1', 'Q2', 'Q3']);
    assert(store.getSeenIds().length === 3, 'seenIds correctly stored and retrieved');
    store.saveTopicStats({ 'Kinematics': { attempts: 5, correct: 4 } });
    assert(store.getTopicStats()['Kinematics'].correct === 4, 'topicStats stored and retrieved');

    // Test export and import
    const exportedJSON = store.exportData();
    assert(typeof exportedJSON === 'string' && exportedJSON.includes('ATT-54'), 'exportData produces valid JSON with attempts');
    store.clearAllData();
    assert(store.getAttempts().length === 0, 'clearAllData cleared attempts');
    const importRes = store.importData(exportedJSON);
    assert(importRes.success === true, 'importData successfully imported data');
    assert(store.getAttempts().length === 50, 'Imported attempts restored accurately');
  }

  // ----------------------------------------------------
  // TEST 2: Router Registration & Navigation (Setup Route Removed)
  // ----------------------------------------------------
  console.log('\n--- Test 2: Router Registration, Route Matching & Fallback ---');
  {
    let destroyed = false;
    let renderedRoute = '';
    let renderedParams = {};

    const mockContainer = {
      innerHTML: '',
      appendChild: () => {}
    };

    globalThis.window = {
      location: { hash: '#/' },
      addEventListener: () => {},
      removeEventListener: () => {},
      scrollTo: () => {}
    };

    const router = new Router(mockContainer, () => ({ bank }));

    router.register('#/', {
      render() {
        renderedRoute = '#/';
        return {
          destroy() {
            destroyed = true;
          }
        };
      }
    });

    router.register('#/test', {
      render() { renderedRoute = '#/test'; }
    });

    router.register('#/result/:id', {
      render(c, ctx) {
        renderedRoute = '#/result/:id';
        renderedParams = ctx.params;
      }
    });

    router.register('#/review/:id', {
      render(c, ctx) {
        renderedRoute = '#/review/:id';
        renderedParams = ctx.params;
      }
    });

    router.register('#/history', {
      render() { renderedRoute = '#/history'; }
    });

    // Test route navigation
    window.location.hash = '#/';
    router.handleHashChange();
    assert(renderedRoute === '#/', 'Routes to #/ (Home)');

    window.location.hash = '#/test';
    router.handleHashChange();
    assert(destroyed === true, 'Previous view destroy() called during transition');
    assert(renderedRoute === '#/test', 'Routes to #/test');

    window.location.hash = '#/result/ATT-12345';
    router.handleHashChange();
    assert(renderedRoute === '#/result/:id', 'Routes to #/result/:id');
    assert(renderedParams.id === 'ATT-12345', `Extracted param id: ${renderedParams.id}`);

    window.location.hash = '#/review/ATT-99999';
    router.handleHashChange();
    assert(renderedRoute === '#/review/:id', 'Routes to #/review/:id');
    assert(renderedParams.id === 'ATT-99999', `Extracted param id: ${renderedParams.id}`);

    window.location.hash = '#/history';
    router.handleHashChange();
    assert(renderedRoute === '#/history', 'Routes to #/history');

    // Unknown route (#/setup) fallback to #/
    window.location.hash = '#/setup';
    router.handleHashChange();
    assert(window.location.hash === '#/', 'Removed #/setup route gracefully redirects to #/');
  }

  // ----------------------------------------------------
  // TEST 3: Presets Defined in config.js
  // ----------------------------------------------------
  console.log('\n--- Test 3: Presets Defined in config.js ---');
  {
    assert(Array.isArray(PRESETS), 'PRESETS is defined as an array in config.js');
    assert(PRESETS.length >= 7, `PRESETS defines at least 7 presets (found ${PRESETS.length})`);

    const q10 = PRESETS.find(p => p.id === 'quick10');
    const mock = PRESETS.find(p => p.id === 'minimock');
    const pDrill = PRESETS.find(p => p.id === 'physics-drill');
    const cDrill = PRESETS.find(p => p.id === 'chemistry-drill');
    const bDrill = PRESETS.find(p => p.id === 'biology-drill');
    const cog = PRESETS.find(p => p.id === 'cognitive-skills');
    const refl = PRESETS.find(p => p.id === 'reflection');

    assert(Boolean(q10), 'Quick 10 preset exists');
    assert(Boolean(mock), 'Mini Mock preset exists');
    assert(mock?.recommended === true, 'Mini Mock is marked as recommended / featured');
    assert(Boolean(pDrill), 'Physics Drill preset exists');
    assert(Boolean(cDrill), 'Chemistry Drill preset exists');
    assert(Boolean(bDrill), 'Biology Drill preset exists');
    assert(Boolean(cog), 'Cognitive Skills preset exists');
    assert(Boolean(refl), 'Reflection Check-in preset exists');

    // Verify sections and timings
    assert(q10.timeMinutes === 12, 'Quick 10 is 12 minutes');
    assert(mock.timeMinutes === 36, 'Mini Mock is 36 minutes');
    assert(pDrill.timeMinutes === 18, 'Physics Drill is 18 minutes');
    assert(cDrill.timeMinutes === 18, 'Chemistry Drill is 18 minutes');
    assert(bDrill.timeMinutes === 12, 'Biology Drill is 12 minutes');
    assert(cog.timeMinutes === 12, 'Cognitive Skills is 12 minutes');
    assert(refl.timeMinutes === 0 && refl.unscored === true, 'Reflection Check-in is untimed and unscored');
  }

  // ----------------------------------------------------
  // TEST 4: Clamped Counts Never Exceed Pool Availability
  // ----------------------------------------------------
  console.log('\n--- Test 4: Clamped Counts Never Exceed Availability Pool Size ---');
  {
    PRESETS.forEach(preset => {
      preset.sections.forEach(s => {
        const available = avail.getAvailable(s.key);
        const clamped = avail.clamp(s.key, s.count);
        assert(clamped <= available, `Preset '${preset.name}' section ${s.key} count (${clamped}) <= available (${available})`);
        if (s.key.toLowerCase() === 'biology') {
          assert(clamped <= 10, `Biology clamped count (${clamped}) strictly <= 10`);
        }
      });
    });
  }

  // ----------------------------------------------------
  // TEST 5: Each Preset Starts Immediately Without Setup Step
  // ----------------------------------------------------
  console.log('\n--- Test 5: Immediate Test Generation for Every Preset ---');
  {
    PRESETS.forEach(preset => {
      const clampedSections = preset.sections.map(s => ({
        key: s.key,
        count: avail.clamp(s.key, s.count)
      }));

      const test = generateTest({
        sections: clampedSections,
        config: {
          timeLimitMinutes: preset.timeMinutes,
          markingScheme: preset.marking || 'neet',
          includeGenerated: Boolean(preset.includeGenerated)
        },
        markingScheme: preset.marking || 'neet',
        timeLimitMinutes: preset.timeMinutes,
        includeGenerated: Boolean(preset.includeGenerated),
        bank
      });

      const totalExpected = clampedSections.reduce((sum, s) => sum + s.count, 0);
      assert(test.items.length === totalExpected, `Preset '${preset.name}' generates ${totalExpected} items (got ${test.items.length})`);
      assert(test.config.timeLimitMinutes === preset.timeMinutes, `Preset '${preset.name}' sets time limit to ${preset.timeMinutes} min`);
      
      if (preset.unscored) {
        assert(test.items.every(i => i.scored === false), `Preset '${preset.name}' items are all unscored`);
      }
    });
  }

  // ----------------------------------------------------
  // TEST 6: Two Consecutive Attempts of Same Preset Differ in Questions or Order
  // ----------------------------------------------------
  console.log('\n--- Test 6: Consecutive Preset Attempts Question & Order Shuffling ---');
  {
    const miniMockPreset = getPresetById('minimock');
    const clampedSections = miniMockPreset.sections.map(s => ({
      key: s.key,
      count: avail.clamp(s.key, s.count)
    }));

    // Attempt 1
    const test1 = generateTest({
      sections: clampedSections,
      history: { seenIds: [] },
      includeGenerated: false,
      bank
    });

    const attempt1Ids = test1.items.map(i => i.id);

    // Attempt 2 with anti-repeat memory
    const test2 = generateTest({
      sections: clampedSections,
      history: { seenIds: attempt1Ids },
      includeGenerated: false,
      bank
    });

    const attempt2Ids = test2.items.map(i => i.id);

    // Check that questions or order differ
    const areIdentical = JSON.stringify(attempt1Ids) === JSON.stringify(attempt2Ids);
    assert(!areIdentical, 'Two consecutive attempts of Mini Mock produce different question sets/ordering');

    // Physics & Chemistry questions overlap should be < 100%
    const p1 = new Set(test1.items.filter(i => i.section.toLowerCase() === 'physics').map(i => i.id));
    const p2 = test2.items.filter(i => i.section.toLowerCase() === 'physics').map(i => i.id);
    const pOverlap = p2.filter(id => p1.has(id)).length;
    assert(pOverlap < 10, `Physics overlap across attempts is ${pOverlap}/10 (< 10)`);
  }

  // ----------------------------------------------------
  // TEST 7: Home, Result, and History Templates Integration
  // ----------------------------------------------------
  console.log('\n--- Test 7: UI Views Preset Integration & Actions ---');
  {
    const homeSrc = fs.readFileSync('practice/js/ui/home.js', 'utf8');
    assert(homeSrc.includes('PRESETS.forEach'), 'Home view iterates over PRESETS from config.js');
    assert(homeSrc.includes('avail.clamp'), 'Home view calculates clamped counts for card display');
    assert(!homeSrc.includes('setup'), 'Home view has no setup studio links or builders');

    const resultSrc = fs.readFileSync('practice/js/ui/result.js', 'utf8');
    assert(resultSrc.includes('Take Another Test'), 'Result view includes "Take Another Test" action');
    assert(resultSrc.includes('Choose Another Test'), 'Result view includes "Choose Another Test" action');

    const historySrc = fs.readFileSync('practice/js/ui/history.js', 'utf8');
    assert(historySrc.includes('presetName'), 'History view displays preset name for attempts');
  }

  // ----------------------------------------------------
  // TEST 8: Zero Student-Visible "draft" Occurrences
  // ----------------------------------------------------
  console.log('\n--- Test 8: Verify Student-Visible Text Contains Zero "draft" Occurrences ---');
  {
    for (const [key, val] of Object.entries(STRINGS)) {
      if (typeof val === 'string') {
        assert(!val.toLowerCase().includes('draft'), `STRINGS.${key} must not contain 'draft'`);
      }
    }

    const uiFiles = [
      'practice/js/ui/home.js',
      'practice/js/ui/result.js',
      'practice/js/ui/review.js',
      'practice/js/ui/test.js',
      'practice/js/ui/history.js',
      'practice/css/print.css',
      'practice/index.html'
    ];

    for (const filePath of uiFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasDraft = /draft/i.test(content);
      assert(!hasDraft, `${filePath} contains zero occurrences of 'draft'`);
    }
  }

  // ----------------------------------------------------
  // TEST 9: "Powered by amAIze" Footer & Branding Credit
  // ----------------------------------------------------
  console.log('\n--- Test 9: Branding Credit "Powered by amAIze" ---');
  {
    const indexHtml = fs.readFileSync('practice/index.html', 'utf8');
    assert(indexHtml.includes('Powered by'), 'practice/index.html contains "Powered by" text');
    assert(indexHtml.includes('../assets/amaize-logo.png'), 'practice/index.html references ../assets/amaize-logo.png');
    assert(indexHtml.includes('onerror='), 'practice/index.html contains onerror image fallback handler');
    assert(indexHtml.includes('amAIze'), 'practice/index.html includes alt and text fallback for amAIze');

    const compCss = fs.readFileSync('practice/css/components.css', 'utf8');
    assert(compCss.includes('.footer-credit'), 'practice/css/components.css defines .footer-credit styling');
    assert(compCss.includes('.credit-logo'), 'practice/css/components.css defines .credit-logo styling');

    const printCss = fs.readFileSync('practice/css/print.css', 'utf8');
    assert(printCss.includes('.print-footer'), 'practice/css/print.css defines .print-footer styling');
  }

  // ----------------------------------------------------
  // TEST 10: Mid-Test State Persistence
  // ----------------------------------------------------
  console.log('\n--- Test 10: Mid-Test State Persistence & Refresh Restoration ---');
  {
    const generated = generateTest({
      sections: TEST_CONFIG.sections,
      seed: 'PERSISTENCE',
      bank
    });

    const now = Date.now();
    const durationMs = 36 * 60 * 1000;
    const endsAt = now + durationMs;

    const activeState = {
      test: generated,
      answers: {
        [generated.items[0].qid]: 2,
        [generated.items[1].qid]: 0
      },
      marks: [generated.items[2].qid],
      bookmarks: [generated.items[3].qid],
      timeMs: {
        [generated.items[0].qid]: 14500,
        [generated.items[1].qid]: 22000
      },
      hintUsed: [generated.items[1].qid],
      cur: 2,
      startedAt: now,
      endsAt
    };

    store.saveActiveTest(activeState);

    const restoredState = store.getActiveTest();
    assert(restoredState !== null, 'Restored state from store on simulated refresh');
    assert(restoredState.cur === 2, `Current question position restored to index 2 (got ${restoredState.cur})`);
    assert(restoredState.answers[generated.items[0].qid] === 2, 'Answer for Q0 restored correctly');
    assert(restoredState.answers[generated.items[1].qid] === 0, 'Answer for Q1 restored correctly');
    assert(restoredState.marks.includes(generated.items[2].qid), 'Mark for review on Q2 restored');
    assert(restoredState.bookmarks.includes(generated.items[3].qid), 'Bookmark on Q3 restored');
    assert(restoredState.hintUsed.includes(generated.items[1].qid), 'Hint used status on Q1 restored');
    assert(restoredState.timeMs[generated.items[0].qid] === 14500, 'Time spent on Q0 preserved');

    const simulatedElapsedSec = 10;
    const simulatedCurrentTime = now + (simulatedElapsedSec * 1000);
    const remainingMs = restoredState.endsAt - simulatedCurrentTime;
    const remainingSec = Math.ceil(remainingMs / 1000);
    assert(remainingSec === (36 * 60) - simulatedElapsedSec, `Remaining time computed from endsAt: exactly ${remainingSec}s`);
  }

  console.log('\n====================================================');
  console.log(`✓ ALL UI ACCEPTANCE TESTS PASSED: ${passed}/${total} checks succeeded.`);
  console.log('====================================================');
}

runUITests().catch(err => {
  console.error('\n✗ UI TEST FAILED:', err);
  process.exit(1);
});
