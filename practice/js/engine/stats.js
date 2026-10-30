/**
 * practice/js/engine/stats.js
 * Historical performance tracking, Laplace-smoothed topic mastery,
 * and anti-repeat seen memory per 04_TEST_ENGINE_SPEC.md §6 & §9.
 */

/**
 * Calculates Laplace-smoothed mastery: (correct + 1) / (attempts + 2).
 * For unknown topic (0, 0), returns 0.5.
 * @param {number} correct
 * @param {number} attempts
 * @returns {number} Float in (0, 1)
 */
export function computeMastery(correct = 0, attempts = 0) {
  return (correct + 1) / (attempts + 2);
}

/**
 * Calculates topic weight: w = 1.5 - mastery (range 0.5 - 1.5).
 * Weak topics (low mastery) get higher weight.
 * @param {number} mastery
 * @returns {number}
 */
export function computeTopicWeight(mastery) {
  const w = 1.5 - mastery;
  return Math.max(0.5, Math.min(1.5, w));
}

/**
 * Updates history with results of a finished test.
 * Pure function: returns a new updated history object.
 * Caps seenIds at 600 items.
 * @param {object} [history={}]
 * @param {object} [scoredResult={}]
 * @returns {object} Updated history
 */
export function updateStats(history = {}, scoredResult = {}) {
  const prevSeen = Array.isArray(history.seenIds)
    ? history.seenIds
    : (Array.isArray(history.seen) ? history.seen : []);

  const newIds = [];
  if (Array.isArray(scoredResult.items)) {
    for (const it of scoredResult.items) {
      const qid = it.qid || it.id;
      if (qid) newIds.push(qid);
    }
  } else if (Array.isArray(scoredResult.test?.items)) {
    for (const it of scoredResult.test.items) {
      const qid = it.qid || it.id;
      if (qid) newIds.push(qid);
    }
  }

  // Combine and deduplicate maintaining most recent order
  const combinedSeen = [...prevSeen, ...newIds];
  const seenSet = new Set();
  const dedupedReversed = [];

  for (let i = combinedSeen.length - 1; i >= 0; i--) {
    const id = combinedSeen[i];
    if (!seenSet.has(id)) {
      seenSet.add(id);
      dedupedReversed.push(id);
    }
  }

  // Keep last <= 600
  const updatedSeen = dedupedReversed.reverse().slice(-600);

  // Update topic stats
  const topicStats = {};
  if (history.topicStats && typeof history.topicStats === 'object') {
    for (const [top, st] of Object.entries(history.topicStats)) {
      topicStats[top] = {
        attempts: st.attempts || 0,
        correct: st.correct || 0,
        mastery: computeMastery(st.correct, st.attempts),
        weight: computeTopicWeight(computeMastery(st.correct, st.attempts))
      };
    }
  }

  if (scoredResult.byTopic && typeof scoredResult.byTopic === 'object') {
    for (const [top, b] of Object.entries(scoredResult.byTopic)) {
      if (!topicStats[top]) {
        topicStats[top] = { attempts: 0, correct: 0, mastery: 0.5, weight: 1.0 };
      }
      topicStats[top].attempts += (b.attempted || 0);
      topicStats[top].correct += (b.correct || 0);
      topicStats[top].mastery = computeMastery(topicStats[top].correct, topicStats[top].attempts);
      topicStats[top].weight = computeTopicWeight(topicStats[top].mastery);
    }
  }

  return {
    ...history,
    seenIds: updatedSeen,
    seen: updatedSeen,
    topicStats
  };
}

