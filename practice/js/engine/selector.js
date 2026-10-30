/**
 * practice/js/engine/selector.js
 * Core test generation algorithm per 04_TEST_ENGINE_SPEC.md §1–4, §6, §8.
 */

import { createRng, generateTestCode, hashString } from './prng.js';
import { shuffleArray, shuffleQuestionOptions, balanceAnswerDistribution } from './shuffle.js';
import { computeMastery, computeTopicWeight } from './stats.js';
import { generatorRegistry, generateParametricQuestion, getTemplatesForSection } from './generators/index.js';

export const SECTION_ORDER = [
  'Physics',
  'Chemistry',
  'Biology',
  'Cognitive skills',
  'Learning behaviours',
  'Human values',
  'Learner development'
];

/**
 * Computes pool sizes and availability for each section in the question bank.
 * Pool for a section = distinct groupIds of that section.
 * @param {object[]|{questions: object[]}} bank
 * @returns {object}
 */
export function availability(bank) {
  const list = Array.isArray(bank) ? bank : (Array.isArray(bank?.questions) ? bank.questions : []);
  const sections = {};

  for (const q of list) {
    const sec = q.section || 'General';
    if (!sections[sec]) {
      sections[sec] = {
        name: sec,
        total: 0,
        groups: new Set(),
        topics: new Set(),
        types: new Set()
      };
    }
    sections[sec].total++;
    if (q.groupId) sections[sec].groups.add(q.groupId);
    if (q.topic) sections[sec].topics.add(q.topic);
    if (q.type) sections[sec].types.add(q.type);
  }

  const result = {};
  for (const [sec, data] of Object.entries(sections)) {
    const uniqueCount = data.groups.size;
    result[sec] = {
      name: sec,
      totalRows: data.total,
      uniqueGroups: uniqueCount,
      available: uniqueCount,
      topics: Array.from(data.topics),
      types: Array.from(data.types),
      reason: uniqueCount < data.totalRows
        ? `Max ${uniqueCount} for ${sec}: bank has ${uniqueCount} unique question groups across ${data.totalRows} rows.`
        : `All ${uniqueCount} questions in ${sec} are unique.`
    };
  }

  return {
    sections: result,
    getAvailable(secName) {
      return result[secName]?.available || 0;
    },
    clamp(secName, requested) {
      const avail = result[secName]?.available || 0;
      return Math.max(0, Math.min(requested, avail));
    }
  };
}

/**
 * Selects groups from a topic queue based on quotas or round-robin.
 * @param {Map<string, object[]>} topicQueues Map of topic -> group array (unseen first, then seen)
 * @param {string[]} topicList Order of topics
 * @param {number} targetCount Total questions to select
 * @param {() => number} rng
 * @param {'random'|'smart'} mode
 * @param {Record<string, { attempts: number, correct: number }>} [topicStats={}]
 * @returns {object[]} Chosen groups
 */
function selectGroupsFromTopics(topicQueues, topicList, targetCount, rng, mode, topicStats = {}) {
  const chosen = [];
  const activeTopics = topicList.filter(t => (topicQueues.get(t)?.length || 0) > 0);
  if (activeTopics.length === 0 || targetCount <= 0) return chosen;

  if (mode === 'smart' && Object.keys(topicStats).length > 0) {
    // Weighted quota allocation based on w = 1.5 - mastery
    const topicWeights = {};
    let totalWeight = 0;
    for (const top of activeTopics) {
      const st = topicStats[top] || { attempts: 0, correct: 0 };
      const m = computeMastery(st.correct, st.attempts);
      const w = computeTopicWeight(m);
      topicWeights[top] = w;
      totalWeight += w;
    }

    const quotas = {};
    for (const top of activeTopics) {
      quotas[top] = 0;
    }

    if (targetCount >= activeTopics.length) {
      // Each topic gets min 1 if targetCount >= activeTopics.length
      // Calculate ideal share: ideal = (weight / totalWeight) * targetCount
      const remainders = [];
      let assignedCount = 0;

      for (const top of activeTopics) {
        const availableInTopic = topicQueues.get(top).length;
        const ideal = (topicWeights[top] / totalWeight) * targetCount;
        const intShare = Math.min(Math.max(1, Math.floor(ideal)), availableInTopic);
        quotas[top] = intShare;
        assignedCount += intShare;
        remainders.push({
          top,
          rem: (ideal - Math.floor(ideal)) + rng() * 0.001,
          canTake: availableInTopic - intShare
        });
      }

      // If assignedCount exceeded targetCount (due to min 1 constraint):
      if (assignedCount > targetCount) {
        remainders.sort((a, b) => topicWeights[a.top] - topicWeights[b.top]);
        for (const r of remainders) {
          if (assignedCount <= targetCount) break;
          if (quotas[r.top] > 1) {
            quotas[r.top]--;
            assignedCount--;
          }
        }
      } else if (assignedCount < targetCount) {
        // Distribute remaining slots to topics with highest remainders
        remainders.sort((a, b) => b.rem - a.rem);
        let left = targetCount - assignedCount;
        for (const r of remainders) {
          if (left <= 0) break;
          if (r.canTake > 0) {
            quotas[r.top]++;
            left--;
          }
        }
      }
    } else {
      // targetCount < activeTopics.length: pick targetCount distinct topics weighted by weight
      const candidateTopics = [...activeTopics];
      while (candidateTopics.length > 0 && Object.values(quotas).reduce((a, b) => a + b, 0) < targetCount) {
        const totalW = candidateTopics.reduce((sum, t) => sum + topicWeights[t], 0);
        let pickVal = rng() * totalW;
        let pickedIdx = 0;
        for (let i = 0; i < candidateTopics.length; i++) {
          pickVal -= topicWeights[candidateTopics[i]];
          if (pickVal <= 0) {
            pickedIdx = i;
            break;
          }
        }
        const pickedTopic = candidateTopics.splice(pickedIdx, 1)[0];
        quotas[pickedTopic] = 1;
      }
    }

    // Draw according to quotas
    for (const top of activeTopics) {
      const q = quotas[top] || 0;
      const queue = topicQueues.get(top);
      for (let i = 0; i < q && queue.length > 0; i++) {
        chosen.push(queue.shift());
      }
    }

    // If still short due to capped topic capacities, fill with round-robin
    while (chosen.length < targetCount) {
      let tookAny = false;
      for (const top of activeTopics) {
        if (chosen.length >= targetCount) break;
        const queue = topicQueues.get(top);
        if (queue && queue.length > 0) {
          chosen.push(queue.shift());
          tookAny = true;
        }
      }
      if (!tookAny) break;
    }
  } else {
    // Mode: 'random' — pure round-robin across shuffled topics
    const shuffledTopics = shuffleArray(activeTopics, rng);
    while (chosen.length < targetCount) {
      let tookAny = false;
      for (const top of shuffledTopics) {
        if (chosen.length >= targetCount) break;
        const queue = topicQueues.get(top);
        if (queue && queue.length > 0) {
          chosen.push(queue.shift());
          tookAny = true;
        }
      }
      if (!tookAny) break;
    }
  }

  return chosen;
}

/**
 * Generates a test attempt per 04_TEST_ENGINE_SPEC.md §1–4, §6.
 * Pure function: identical inputs and seed produce identical test output.
 * @param {object} params
 * @param {object[]|{questions: object[]}} params.bank
 * @param {Array<{key: string, count: number}>} params.sections
 * @param {'random'|'smart'} [params.mode='random']
 * @param {string|number} [params.seed]
 * @param {object} [params.history]
 * @param {object} [params.config]
 * @param {boolean} [params.includeGenerated=false]
 * @param {boolean} [params.groupBySection=true]
 * @returns {object} Test object
 */
export function generateTest(params = {}) {
  const rawBank = params.bank || [];
  const bank = Array.isArray(rawBank)
    ? rawBank
    : (Array.isArray(rawBank.questions) ? rawBank.questions : []);
  const bankVersion = rawBank.bankVersion || '0.1-review-draft';

  const sectionsReq = Array.isArray(params.sections) ? params.sections : [];
  const mode = params.mode === 'smart' ? 'smart' : 'random';
  const history = params.history || {};
  const seenIds = new Set(Array.isArray(history.seenIds) ? history.seenIds : (Array.isArray(history.seen) ? history.seen : []));
  const topicStats = history.topicStats || {};
  const includeGenerated = Boolean(params.includeGenerated ?? params.config?.includeGenerated);
  const groupBySection = params.groupBySection ?? params.config?.groupBySection ?? true;

  // Determine test code and PRNG
  let testCode = '';
  if (params.seed !== undefined && params.seed !== null && String(params.seed).trim() !== '') {
    testCode = String(params.seed).trim().toUpperCase();
  } else {
    testCode = generateTestCode();
  }
  const rng = createRng(testCode);

  const avail = availability(bank);
  const allChosenItems = [];

  for (const secReq of sectionsReq) {
    const secName = secReq.key;
    const requestedCount = secReq.count;
    if (typeof requestedCount !== 'number' || requestedCount <= 0) continue;

    const availableCount = avail.getAvailable(secName);
    const clampedCount = Math.min(requestedCount, availableCount);
    if (clampedCount <= 0) continue;

    // Filter questions belonging to this section
    const secQuestions = bank.filter(q => q.section.toLowerCase() === secName.toLowerCase());

    // Group rows by groupId
    const groupMap = new Map();
    for (const q of secQuestions) {
      if (!groupMap.has(q.groupId)) {
        groupMap.set(q.groupId, {
          groupId: q.groupId,
          section: q.section,
          topic: q.topic,
          difficulty: q.difficulty,
          type: q.type,
          variants: []
        });
      }
      groupMap.get(q.groupId).variants.push(q);
    }

    const allGroups = Array.from(groupMap.values());

    // Parametric generators support for Physics
    let generatedItemsForSection = [];
    let bankCountNeeded = clampedCount;

    if (includeGenerated && secName.toLowerCase() === 'physics') {
      const templates = getTemplatesForSection('Physics');
      if (templates.length > 0) {
        // Include 1 or 2 generated questions (up to 20% of section)
        const genCount = Math.min(Math.max(1, Math.floor(clampedCount * 0.2)), templates.length, clampedCount);
        const shuffledTemplates = shuffleArray(templates, rng);
        for (let i = 0; i < genCount; i++) {
          const genQ = generateParametricQuestion(shuffledTemplates[i], rng, `${testCode}-${i + 1}`);
          generatedItemsForSection.push(genQ);
        }
        bankCountNeeded = clampedCount - genCount;
      }
    }

    // Check mixed difficulty (Cognitive skills: Easy / Moderate target 40% / 60%)
    const hasEasy = allGroups.some(g => g.difficulty === 'Easy');
    const hasMod = allGroups.some(g => g.difficulty === 'Moderate');
    const isMixedDifficulty = hasEasy && hasMod;

    let selectedGroups = [];

    if (isMixedDifficulty) {
      let targetEasy = Math.round(bankCountNeeded * 0.40);
      let targetMod = bankCountNeeded - targetEasy;

      const easyGroups = allGroups.filter(g => g.difficulty === 'Easy');
      const modGroups = allGroups.filter(g => g.difficulty === 'Moderate');

      if (easyGroups.length < targetEasy) {
        targetEasy = easyGroups.length;
        targetMod = bankCountNeeded - targetEasy;
      }
      if (modGroups.length < targetMod) {
        targetMod = modGroups.length;
        targetEasy = bankCountNeeded - targetMod;
      }

      // Helper to build topic queues (unseen first, then seen, shuffled)
      const buildQueues = (groupList) => {
        const queues = new Map();
        for (const g of groupList) {
          if (!queues.has(g.topic)) queues.set(g.topic, []);
          queues.get(g.topic).push(g);
        }
        for (const [top, list] of queues.entries()) {
          const unseen = [];
          const seen = [];
          for (const g of list) {
            const hasSeen = g.variants.some(v => seenIds.has(v.id));
            if (hasSeen) seen.push(g);
            else unseen.push(g);
          }
          queues.set(top, [...shuffleArray(unseen, rng), ...shuffleArray(seen, rng)]);
        }
        return queues;
      };

      const easyQueues = buildQueues(easyGroups);
      const modQueues = buildQueues(modGroups);

      const chosenEasy = selectGroupsFromTopics(easyQueues, Array.from(easyQueues.keys()), targetEasy, rng, mode, topicStats);
      const chosenMod = selectGroupsFromTopics(modQueues, Array.from(modQueues.keys()), targetMod, rng, mode, topicStats);

      selectedGroups = [...chosenEasy, ...chosenMod];
    } else {
      // Single difficulty or general section
      const queues = new Map();
      for (const g of allGroups) {
        if (!queues.has(g.topic)) queues.set(g.topic, []);
        queues.get(g.topic).push(g);
      }
      for (const [top, list] of queues.entries()) {
        const unseen = [];
        const seen = [];
        for (const g of list) {
          const hasSeen = g.variants.some(v => seenIds.has(v.id));
          if (hasSeen) seen.push(g);
          else unseen.push(g);
        }
        queues.set(top, [...shuffleArray(unseen, rng), ...shuffleArray(seen, rng)]);
      }

      selectedGroups = selectGroupsFromTopics(queues, Array.from(queues.keys()), bankCountNeeded, rng, mode, topicStats);
    }

    // Step 6: For each chosen group pick a variant (prefer matching group topic, then unseen variant)
    const sectionItems = [];
    for (const group of selectedGroups) {
      const topicMatches = group.variants.filter(v => v.topic === group.topic);
      const pool = topicMatches.length > 0 ? topicMatches : group.variants;
      const unseenVariants = pool.filter(v => !seenIds.has(v.id));
      let pickedVariant;
      if (unseenVariants.length > 0) {
        pickedVariant = unseenVariants[Math.floor(rng() * unseenVariants.length)];
      } else {
        pickedVariant = pool[Math.floor(rng() * pool.length)];
      }

      // Shuffle options for MCQ
      const prepared = shuffleQuestionOptions(pickedVariant, rng);
      sectionItems.push({
        qid: prepared.id,
        id: prepared.id,
        groupId: prepared.groupId,
        section: prepared.section,
        topic: prepared.topic,
        skill: prepared.skill,
        difficulty: prepared.difficulty,
        type: prepared.type,
        prompt: prepared.prompt,
        options: prepared.options,
        answerIndex: prepared.answerIndex,
        hint: prepared.hint,
        rationale: prepared.rationale,
        rubricMax: prepared.rubricMax,
        scored: prepared.scored !== false,
        generated: false
      });
    }

    // Combine with generated items for this section (if any)
    const combinedSecItems = [...sectionItems, ...generatedItemsForSection];
    // Shuffle chosen items inside this section block
    const finalSecItems = shuffleArray(combinedSecItems, rng);
    allChosenItems.push({
      section: secName,
      items: finalSecItems
    });
  }

  // Final ordering across sections
  let orderedItems = [];
  if (groupBySection) {
    // Sort section blocks according to SECTION_ORDER
    allChosenItems.sort((a, b) => {
      const idxA = SECTION_ORDER.findIndex(s => s.toLowerCase() === a.section.toLowerCase());
      const idxB = SECTION_ORDER.findIndex(s => s.toLowerCase() === b.section.toLowerCase());
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      return posA - posB;
    });
    for (const block of allChosenItems) {
      orderedItems.push(...block.items);
    }
  } else {
    // Interleave / shuffle everything
    const flat = [];
    for (const block of allChosenItems) {
      flat.push(...block.items);
    }
    orderedItems = shuffleArray(flat, rng);
  }

  // Enforce MCQ answer distribution rule across the test (max 40% per letter for >= 8 MCQs)
  orderedItems = balanceAnswerDistribution(orderedItems, rng);

  const totalQuestions = orderedItems.length;
  const timeLimitMinutes = params.config?.timeLimitMinutes !== undefined
    ? params.config.timeLimitMinutes
    : Math.round(totalQuestions * 1.2 * 10) / 10;

  return {
    code: testCode,
    createdAt: new Date().toISOString(),
    bankVersion,
    config: {
      sections: sectionsReq,
      mode,
      markingScheme: params.config?.markingScheme || 'neet',
      timeLimitMinutes,
      includeGenerated,
      groupBySection
    },
    items: orderedItems
  };
}
