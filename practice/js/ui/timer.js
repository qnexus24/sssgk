/**
 * practice/js/ui/timer.js
 * Resilient timer based on absolute `endsAt` timestamp per 06 §B3 and 01 §5.3.
 * Survives page refreshes and device sleep.
 */

import { el, formatTime } from './components.js';

/**
 * Creates and starts a countdown timer element.
 * @param {object} options
 * @param {number} options.endsAt Timestamp in ms when timer expires (0 = untimed)
 * @param {number} options.totalDurationMs Total duration in ms
 * @param {() => void} options.onTimeOut Callback triggered when time runs out
 * @returns {{ element: HTMLElement, destroy: () => void, getRemainingSeconds: () => number }}
 */
export function createTimer({ endsAt, totalDurationMs, onTimeOut }) {
  const isUntimed = !endsAt || endsAt <= 0;

  const timerEl = el('div', {
    className: 'timer-badge',
    'aria-label': isUntimed ? 'Untimed test' : 'Time remaining'
  });

  const iconEl = el('span', { 'aria-hidden': 'true' }, '⏱');
  const textEl = el('span', { className: 'timer-text' }, isUntimed ? 'Untimed' : '--:--');
  const srEl = el('span', { className: 'sr-only', 'aria-live': 'polite' });

  timerEl.appendChild(iconEl);
  timerEl.appendChild(textEl);
  timerEl.appendChild(srEl);

  if (isUntimed) {
    return {
      element: timerEl,
      destroy: () => {},
      getRemainingSeconds: () => 0
    };
  }

  let intervalId = null;
  let hasExpired = false;
  let lastAnnouncedMilestone = null;

  function update() {
    const now = Date.now();
    const remainingMs = endsAt - now;
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

    textEl.textContent = formatTime(remainingSec);

    // Visual warning classes (amber at 10%, red at 5%)
    if (totalDurationMs > 0) {
      const fraction = remainingMs / totalDurationMs;
      timerEl.classList.remove('timer-warn', 'timer-crit');

      if (fraction <= 0.05) {
        timerEl.classList.add('timer-crit');
      } else if (fraction <= 0.10) {
        timerEl.classList.add('timer-warn');
      }
    }

    // Accessible aria-live announcements at milestones only (10m, 5m, 1m, 30s)
    const milestones = [600, 300, 60, 30];
    for (const m of milestones) {
      if (remainingSec === m && lastAnnouncedMilestone !== m) {
        lastAnnouncedMilestone = m;
        srEl.textContent = `${Math.floor(m / 60)} minutes remaining`;
      }
    }

    if (remainingSec <= 0 && !hasExpired) {
      hasExpired = true;
      clearInterval(intervalId);
      timerEl.classList.add('timer-crit');
      if (typeof onTimeOut === 'function') {
        onTimeOut();
      }
    }
  }

  update();
  intervalId = setInterval(update, 1000);

  return {
    element: timerEl,
    destroy() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    getRemainingSeconds() {
      return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    }
  };
}

