/**
 * practice/js/engine/shuffle.js
 * Fisher–Yates array shuffling and MCQ option balancing per 04_TEST_ENGINE_SPEC.md §5.
 */

/**
 * Fisher–Yates shuffle of an array (returns a new array).
 * @template T
 * @param {T[]} array
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffleArray(array, rng = Math.random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Shuffles MCQ options and updates answerIndex.
 * Preserves question if pinned or not MCQ.
 * @param {object} item
 * @param {() => number} [rng]
 * @returns {object}
 */
export function shuffleQuestionOptions(item, rng = Math.random) {
  if (item.type !== 'mcq' || item.pin || !Array.isArray(item.options) || item.options.length !== 4) {
    return { ...item };
  }

  const correctText = item.options[item.answerIndex];
  const shuffledOptions = shuffleArray(item.options, rng);
  const newAnswerIndex = shuffledOptions.indexOf(correctText);

  return {
    ...item,
    options: shuffledOptions,
    answerIndex: newAnswerIndex >= 0 ? newAnswerIndex : item.answerIndex
  };
}

/**
 * Enforces the answer distribution rule:
 * Across a test of >= 8 MCQs, no letter (0=A, 1=B, 2=C, 3=D) may hold > 40% of correct answers.
 * Attempts up to 5 reshuffle passes on offending questions; balances deterministically if needed.
 * @param {object[]} items
 * @param {() => number} [rng]
 * @returns {object[]}
 */
export function balanceAnswerDistribution(items, rng = Math.random) {
  const result = items.map(it => ({ ...it }));
  const mcqIndices = [];

  for (let i = 0; i < result.length; i++) {
    if (result[i].type === 'mcq' && !result[i].pin && Array.isArray(result[i].options)) {
      mcqIndices.push(i);
    }
  }

  const mcqCount = mcqIndices.length;
  if (mcqCount < 8) {
    return result;
  }

  const maxAllowed = Math.floor(mcqCount * 0.40);

  // Up to 5 reshuffle attempts
  for (let attempt = 0; attempt < 5; attempt++) {
    const counts = [0, 0, 0, 0];
    for (const idx of mcqIndices) {
      counts[result[idx].answerIndex]++;
    }

    const offendingLetter = counts.findIndex(c => c > maxAllowed);
    if (offendingLetter === -1) {
      // Balanced!
      return result;
    }

    // Reshuffle questions that landed on the offending letter
    for (const idx of mcqIndices) {
      if (result[idx].answerIndex === offendingLetter) {
        result[idx] = shuffleQuestionOptions(result[idx], rng);
      }
    }
  }

  // Fallback guarantee: if after 5 random reshuffles a letter still exceeds 40%,
  // rotate the offending questions' options to target an under-represented letter (< 25%).
  let finalCounts = [0, 0, 0, 0];
  for (const idx of mcqIndices) {
    finalCounts[result[idx].answerIndex]++;
  }

  for (const idx of mcqIndices) {
    const currentLetter = result[idx].answerIndex;
    if (finalCounts[currentLetter] > maxAllowed) {
      // Find the least represented letter
      let minLetter = 0;
      let minCount = finalCounts[0];
      for (let l = 1; l < 4; l++) {
        if (finalCounts[l] < minCount) {
          minCount = finalCounts[l];
          minLetter = l;
        }
      }

      if (minLetter !== currentLetter) {
        // Swap option at currentLetter with option at minLetter
        const opts = [...result[idx].options];
        const temp = opts[currentLetter];
        opts[currentLetter] = opts[minLetter];
        opts[minLetter] = temp;

        result[idx].options = opts;
        result[idx].answerIndex = minLetter;

        finalCounts[currentLetter]--;
        finalCounts[minLetter]++;
      }
    }
  }

  return result;
}

