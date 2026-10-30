/**
 * practice/js/store.js
 * Storage wrapper per 05_ARCHITECTURE.md §Storage schema.
 * Supports localStorage with graceful in-memory fallback when storage is disabled/blocked.
 */

const SCHEMA_VERSION = 1;

const KEYS = {
  VERSION: 'sssgk.v',
  ACTIVE: 'sssgk.active',
  ATTEMPTS: 'sssgk.attempts',
  SEEN: 'sssgk.seen',
  TOPIC_STATS: 'sssgk.topicStats',
  PREFS: 'sssgk.prefs'
};

// In-memory fallback dictionary
const memoryFallback = new Map();

/**
 * Checks whether localStorage is available and writable.
 */
function checkLocalStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__sssgk_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const isStorageWorking = checkLocalStorage();

function getItem(key) {
  if (isStorageWorking) {
    try {
      const val = window.localStorage.getItem(key);
      if (val === null) return undefined;
      return JSON.parse(val);
    } catch {
      return memoryFallback.get(key);
    }
  }
  return memoryFallback.get(key);
}

function setItem(key, value) {
  memoryFallback.set(key, value);
  if (isStorageWorking) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or blocked — memoryFallback preserves session
    }
  }
}

function removeItem(key) {
  memoryFallback.delete(key);
  if (isStorageWorking) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
}

// Initialise versioning
if (getItem(KEYS.VERSION) === undefined) {
  setItem(KEYS.VERSION, SCHEMA_VERSION);
}

export const store = {
  isStorageAvailable() {
    return isStorageWorking;
  },

  // Active in-progress test
  getActiveTest() {
    return getItem(KEYS.ACTIVE) || null;
  },

  saveActiveTest(activeState) {
    if (!activeState) {
      removeItem(KEYS.ACTIVE);
    } else {
      setItem(KEYS.ACTIVE, activeState);
    }
  },

  clearActiveTest() {
    removeItem(KEYS.ACTIVE);
  },

  // Completed attempts (max 50)
  getAttempts() {
    const list = getItem(KEYS.ATTEMPTS);
    return Array.isArray(list) ? list : [];
  },

  saveAttempt(attempt) {
    const attempts = store.getAttempts();
    // Add to front
    attempts.unshift(attempt);
    // Cap at 50
    const trimmed = attempts.slice(0, 50);
    setItem(KEYS.ATTEMPTS, trimmed);
    return trimmed;
  },

  getAttemptById(id) {
    const attempts = store.getAttempts();
    return attempts.find(a => String(a.id) === String(id)) || null;
  },

  // Seen question IDs (max 600)
  getSeenIds() {
    const seen = getItem(KEYS.SEEN);
    return Array.isArray(seen) ? seen : [];
  },

  saveSeenIds(seenIds) {
    const arr = Array.isArray(seenIds) ? seenIds.slice(-600) : [];
    setItem(KEYS.SEEN, arr);
  },

  // Topic performance stats for smart mode
  getTopicStats() {
    const stats = getItem(KEYS.TOPIC_STATS);
    return (stats && typeof stats === 'object') ? stats : {};
  },

  saveTopicStats(stats) {
    setItem(KEYS.TOPIC_STATS, stats || {});
  },

  // User preferences (last used setup)
  getPrefs() {
    return getItem(KEYS.PREFS) || null;
  },

  savePrefs(prefs) {
    setItem(KEYS.PREFS, prefs);
  },

  // Full history export/import
  exportData() {
    return JSON.stringify({
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      attempts: store.getAttempts(),
      seen: store.getSeenIds(),
      topicStats: store.getTopicStats(),
      prefs: store.getPrefs()
    }, null, 2);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.attempts)) setItem(KEYS.ATTEMPTS, data.attempts.slice(0, 50));
      if (Array.isArray(data.seen)) setItem(KEYS.SEEN, data.seen.slice(-600));
      if (data.topicStats && typeof data.topicStats === 'object') setItem(KEYS.TOPIC_STATS, data.topicStats);
      if (data.prefs) setItem(KEYS.PREFS, data.prefs);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  clearAllData() {
    removeItem(KEYS.ACTIVE);
    removeItem(KEYS.ATTEMPTS);
    removeItem(KEYS.SEEN);
    removeItem(KEYS.TOPIC_STATS);
    removeItem(KEYS.PREFS);
  }
};

