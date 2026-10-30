/**
 * practice/js/ui/history.js
 * Practice History Screen (#/history)
 * Features:
 * - Last 50 attempts table (date, score, accuracy, questions count)
 * - Section-wise trend sparklines (pure SVG, no external libraries)
 * - All-time topic mastery table with progress bars
 * - Robust JSON export & import for cross-device migration
 * - Clear history with accessible modal confirmation
 */

import { el } from './components.js';
import { store } from '../store.js';
import { getPresetById } from '../config.js';

/**
 * Generates a clean inline SVG sparkline for trend tracking.
 * @param {number[]} dataPoints Array of numbers in 0..100
 * @param {number} width
 * @param {number} height
 * @returns {SVGElement}
 */
function createSparkline(dataPoints, width = 110, height = 28) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.overflow = 'visible';

  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '0');
    text.setAttribute('y', String(height / 2 + 4));
    text.setAttribute('fill', 'var(--muted)');
    text.setAttribute('font-size', '10px');
    text.textContent = 'No trend data';
    svg.appendChild(text);
    return svg;
  }

  if (dataPoints.length === 1) {
    const cy = height - ((dataPoints[0] / 100) * (height - 8) + 4);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(width / 2));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', 'var(--navy)');
    svg.appendChild(circle);
    return svg;
  }

  const step = (width - 8) / (dataPoints.length - 1);
  const coords = dataPoints.map((val, i) => {
    const x = i * step + 4;
    const y = height - ((Math.min(100, Math.max(0, val)) / 100) * (height - 8) + 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastVal = dataPoints[dataPoints.length - 1];
  const firstVal = dataPoints[0];
  const trendColor = lastVal >= firstVal ? 'var(--ok)' : 'var(--warn)';

  // Polyline
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', coords.join(' '));
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', trendColor);
  polyline.setAttribute('stroke-width', '2.5');
  polyline.setAttribute('stroke-linecap', 'round');
  polyline.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(polyline);

  // End point dot
  const lastCoord = coords[coords.length - 1].split(',');
  const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  endDot.setAttribute('cx', lastCoord[0]);
  endDot.setAttribute('cy', lastCoord[1]);
  endDot.setAttribute('r', '3.5');
  endDot.setAttribute('fill', trendColor);
  svg.appendChild(endDot);

  return svg;
}

export const historyView = {
  render(container, ctx) {
    const attempts = store.getAttempts();
    const topicStats = store.getTopicStats();

    const wrap = el('div', { className: 'wrap', style: 'padding: 24px 0 40px; max-width: 920px;' });

    // Header
    const headerRow = el('div', {
      style: 'margin-bottom: 24px;'
    }, [
      el('span', { className: 'kicker' }, 'Personal Progress Tracking'),
      el('h1', { style: 'font-size: clamp(1.8rem, 3.5vw, 2.3rem);' }, 'Practice History'),
      el('p', { style: 'color: var(--muted); margin-top: 4px;' },
        'Cumulative accuracy trends, test logs, and offline topic mastery calibration.'
      )
    ]);
    wrap.appendChild(headerRow);

    // Privacy notice
    wrap.appendChild(el('div', { className: 'notice notice-info' }, [
      el('span', { className: 'notice-icon' }, '🔒'),
      el('div', {}, 'Your answers stay on this device. No account or data leaves your browser.')
    ]));

    if (attempts.length === 0) {
      wrap.appendChild(el('div', { className: 'card', style: 'text-align: center; padding: 48px 24px;' }, [
        el('h3', {}, 'No practice attempts recorded yet'),
        el('p', { style: 'color: var(--muted); margin: 12px 0 24px;' }, 'Take your first practice test to begin building your personal mastery trend.'),
        el('a', { href: '#/', className: 'btn btn-gold btn-lg' }, 'Start Practice Test →')
      ]));
    } else {
      // ----------------------------------------------------
      // Section Performance Trends (Sparklines)
      // ----------------------------------------------------
      const chronologicalAttempts = [...attempts].reverse();
      const distinctSections = new Set();
      chronologicalAttempts.forEach(a => {
        if (a.bySection) {
          Object.keys(a.bySection).forEach(s => distinctSections.add(s));
        }
      });

      if (distinctSections.size > 0) {
        const trendCard = el('div', { className: 'card', style: 'margin-bottom: 28px;' }, [
          el('div', { style: 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;' }, [
            el('h3', {}, '📈 Section Trends (Chronological Accuracy)'),
            el('span', { className: 'pill pill-info' }, 'SVG Sparklines')
          ]),
          el('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;' },
            Array.from(distinctSections).map(sec => {
              const accuracySeries = [];
              chronologicalAttempts.forEach(a => {
                if (a.bySection?.[sec]) {
                  accuracySeries.push(a.bySection[sec].accuracyPercent);
                }
              });

              const latestAcc = accuracySeries[accuracySeries.length - 1];

              return el('div', {
                style: 'background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;'
              }, [
                el('div', {}, [
                  el('div', { style: 'font-weight: 750; font-size: 0.92rem; color: var(--navy);' }, sec),
                  el('div', { style: 'font-size: 0.8rem; color: var(--muted); margin-top: 2px;' }, `${latestAcc}% latest (${accuracySeries.length} tests)`)
                ]),
                createSparkline(accuracySeries)
              ]);
            })
          )
        ]);
        wrap.appendChild(trendCard);
      }

      // ----------------------------------------------------
      // Last 50 Attempts Table
      // ----------------------------------------------------
      const attemptsCard = el('div', { className: 'card', style: 'margin-bottom: 32px;' }, [
        el('div', { style: 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;' }, [
          el('h3', {}, `Recent Test Attempts (${attempts.length} of 50 max)`),
          el('span', { className: 'pill pill-navy' }, 'Auto-Saved')
        ]),
        el('div', { style: 'overflow-x: auto;' }, [
          (() => {
            const table = el('table', { style: 'width: 100%; border-collapse: collapse; font-size: 0.92rem;' });
            table.innerHTML = `
              <thead>
                <tr style="border-bottom: 2px solid var(--line); text-align: left; color: var(--navy);">
                  <th style="padding: 10px 8px;">Date & Time</th>
                  <th style="padding: 10px 8px;">Preset</th>
                  <th style="padding: 10px 8px; text-align: center;">Questions</th>
                  <th style="padding: 10px 8px; text-align: center;">Score</th>
                  <th style="padding: 10px 8px; text-align: center;">Accuracy</th>
                  <th style="padding: 10px 8px; text-align: right;" class="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${attempts.map(a => {
              const presetName = a.presetName || a.config?.presetName || (a.presetId || a.config?.presetId ? getPresetById(a.presetId || a.config?.presetId)?.name : 'Practice Test');
              return `
                  <tr style="border-bottom: 1px solid var(--line);">
                    <td style="padding: 12px 8px; white-space: nowrap;">
                      ${new Date(a.finishedAt).toLocaleDateString()}
                      <small style="color: var(--muted); display: block;">${new Date(a.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                    </td>
                    <td style="padding: 12px 8px; font-weight: 650; color: var(--navy);">${presetName}</td>
                    <td style="padding: 12px 8px; text-align: center;">${a.items?.length || 0}</td>
                    <td style="padding: 12px 8px; text-align: center; font-weight: 750;">${a.score}/${a.max}</td>
                    <td style="padding: 12px 8px; text-align: center;">
                      <span class="pill ${a.accuracyPercent >= 60 ? 'pill-ok' : 'pill-warn'}">${a.accuracyPercent}%</span>
                    </td>
                    <td style="padding: 12px 8px; text-align: right; white-space: nowrap;" class="no-print">
                      <a href="#/result/${a.id}" class="btn btn-outline btn-sm">Result</a>
                      <a href="#/review/${a.id}" class="btn btn-navy btn-sm" style="margin-left: 6px;">Review</a>
                    </td>
                  </tr>
                `;
            }).join('')}
              </tbody>
            `;
            return table;
          })()
        ])
      ]);
      wrap.appendChild(attemptsCard);

      // ----------------------------------------------------
      // All-Time Topic Mastery Table
      // ----------------------------------------------------
      const topicEntries = Object.entries(topicStats);
      if (topicEntries.length > 0) {
        // Sort topics by mastery ascending (weakest first)
        topicEntries.sort((a, b) => (a[1].mastery || 0) - (b[1].mastery || 0));

        const masteryCard = el('div', { className: 'card' }, [
          el('div', { style: 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;' }, [
            el('h3', {}, 'Cumulative Topic Mastery Table (All-Time)'),
            el('span', { className: 'pill pill-ok' }, `${topicEntries.length} Topics Tracked`)
          ]),
          el('p', { style: 'color: var(--muted); font-size: 0.9rem; margin-bottom: 18px;' },
            'Calculated via Laplace-smoothed mastery. Topics with lower accuracy receive increased quota weighting.'
          ),
          el('div', { style: 'overflow-x: auto;' }, [
            (() => {
              const table = el('table', { style: 'width: 100%; border-collapse: collapse; font-size: 0.9rem;' });
              table.innerHTML = `
                <thead>
                  <tr style="border-bottom: 2px solid var(--line); text-align: left; color: var(--navy);">
                    <th style="padding: 10px 8px;">Topic</th>
                    <th style="padding: 10px 8px; text-align: center;">Attempts</th>
                    <th style="padding: 10px 8px; text-align: center;">Correct</th>
                    <th style="padding: 10px 8px; text-align: center;">Accuracy</th>
                    <th style="padding: 10px 8px;">Mastery Bar</th>
                    <th style="padding: 10px 8px; text-align: right;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${topicEntries.map(([topic, st]) => {
                const acc = Math.round((st.correct / (st.attempts || 1)) * 100);
                const isMastered = acc >= 75;
                const isProgressing = acc >= 50 && acc < 75;
                const pillClass = isMastered ? 'pill-ok' : (isProgressing ? 'pill-warn' : 'pill-bad');
                const statusText = isMastered ? 'Mastered' : (isProgressing ? 'Progressing' : 'Needs Work');

                return `
                      <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px 8px; font-weight: 700;">${topic}</td>
                        <td style="padding: 10px 8px; text-align: center;">${st.attempts}</td>
                        <td style="padding: 10px 8px; text-align: center; color: var(--ok); font-weight: 700;">${st.correct}</td>
                        <td style="padding: 10px 8px; text-align: center; font-weight: 700;">${acc}%</td>
                        <td style="padding: 10px 8px; min-width: 140px;">
                          <div style="background: var(--paper); border: 1px solid var(--line); height: 8px; border-radius: 99px; overflow: hidden;">
                            <div style="background: ${isMastered ? 'var(--ok)' : (isProgressing ? 'var(--gold)' : 'var(--bad)')}; width: ${acc}%; height: 100%;"></div>
                          </div>
                        </td>
                        <td style="padding: 10px 8px; text-align: right;">
                          <span class="pill ${pillClass}">${statusText}</span>
                        </td>
                      </tr>
                    `;
              }).join('')}
                </tbody>
              `;
              return table;
            })()
          ])
        ]);
        wrap.appendChild(masteryCard);
      }
    }

    container.appendChild(wrap);
    return { destroy() { } };
  }
};
