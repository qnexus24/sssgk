/**
 * practice/js/ui/result.js
 * Result Screen (#/result/:id)
 * Features:
 * - Score / max, accuracy %, correct/wrong/skipped counts, time taken, avg time per question
 * - Section-wise table + pure CSS/SVG bar chart (no external libraries)
 * - Topic-wise accuracy with highlighted "Topics to revise" (< 60% accuracy)
 * - Time analysis: fastest / slowest questions and hint-used questions
 * - Action buttons: Review Answers, Take Another Test, My History, Print / Save as PDF
 * - Print-ready scorecard header
 */

import { el, formatTime } from './components.js';
import { STRINGS } from '../strings.js';
import { store } from '../store.js';
import { generateTest, availability } from '../engine/index.js';
import { PRESETS, getPresetById, TEST_CONFIG } from '../config.js';

export const resultView = {
  render(container, ctx) {
    const attemptId = ctx.params?.id;
    const attempt = store.getAttemptById(attemptId);

    const wrap = el('div', { className: 'wrap', style: 'padding: 24px 0 40px; max-width: 900px;' });

    if (!attempt) {
      wrap.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px 24px;">
          <h2>Attempt Not Found</h2>
          <p style="color: var(--muted); margin: 12px 0 24px;">Could not locate test attempt ID: ${attemptId || 'Unknown'}</p>
          <a href="#/" class="btn btn-navy">Return to Practice Home</a>
        </div>
      `;
      container.appendChild(wrap);
      return { destroy() { } };
    }

    const items = attempt.items || [];
    const answers = attempt.answers || {};
    const timeMs = attempt.timeMs || {};
    const hintUsed = new Set(attempt.hintUsed || []);

    // Compute basic counts if not stored directly
    let correctCount = attempt.correct !== undefined ? attempt.correct : 0;
    let wrongCount = attempt.wrong !== undefined ? attempt.wrong : 0;
    let skippedCount = attempt.skipped !== undefined ? attempt.skipped : 0;
    let mcqCount = 0;

    if (attempt.correct === undefined) {
      items.forEach(it => {
        if (it.type === 'mcq') {
          mcqCount++;
          const qid = it.qid || it.id;
          const userAns = answers[qid];
          if (userAns === undefined || userAns === null || userAns === '') {
            skippedCount++;
          } else if (Number(userAns) === it.answerIndex) {
            correctCount++;
          } else {
            wrongCount++;
          }
        }
      });
    } else {
      mcqCount = attempt.mcqCount || (correctCount + wrongCount + skippedCount);
    }

    const totalTimeMs = attempt.timeAnalysis?.totalTimeMs || Object.values(timeMs).reduce((a, b) => a + b, 0);
    const avgTimePerQSec = items.length > 0 ? Math.round((totalTimeMs / items.length) / 1000) : 0;

    // ----------------------------------------------------
    // Print-Only Scorecard Header (Visible only when printing)
    // ----------------------------------------------------
    const printHeader = el('div', { className: 'print-only', style: 'display: none; margin-bottom: 20px; border-bottom: 2px solid var(--navy); padding-bottom: 12px;' }, [
      el('div', { style: 'display: flex; align-items: center; justify-content: space-between;' }, [
        el('div', { style: 'display: flex; align-items: center; gap: 12px;' }, [
          el('img', { src: '../assets/logo.png', width: '48', height: '48', alt: 'SSSGK Logo', style: 'border-radius: 6px;' }),
          el('div', {}, [
            el('b', { style: 'font-size: 1.2rem; color: var(--navy); display: block;' }, 'SSSGK EduTech Pvt. Ltd.'),
            el('span', { style: 'font-size: 0.85rem; color: var(--muted);' }, 'Practice Test Scorecard & Performance Analysis')
          ])
        ]),
        el('div', { style: 'text-align: right; font-size: 0.85rem;' }, [
          el('div', {}, [el('b', {}, 'Date: '), new Date(attempt.finishedAt).toLocaleDateString()])
        ])
      ])
    ]);
    wrap.appendChild(printHeader);

    // ----------------------------------------------------
    // Screen Header & Action Bar
    // ----------------------------------------------------
    const headerRow = el('div', { style: 'display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;' }, [
      el('div', {}, [
        el('span', { className: 'kicker' }, 'Performance Analysis'),
        el('h1', { style: 'font-size: clamp(1.8rem, 3.5vw, 2.3rem);' }, STRINGS.resultTitle),
        el('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; font-size: 0.9rem; color: var(--muted);' }, [
          el('span', {}, `Completed on ${new Date(attempt.finishedAt).toLocaleDateString()} at ${new Date(attempt.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
        ])
      ]),
      el('div', { className: 'no-print', style: 'display: flex; gap: 10px; flex-wrap: wrap;' }, [
        el('button', {
          type: 'button',
          className: 'btn btn-outline btn-sm',
          onClick: () => window.print()
        }, '🖨️ Print / Save PDF'),
        el('a', {
          href: `#/review/${attempt.id}`,
          className: 'btn btn-gold btn-sm'
        }, 'Review Answers →')
      ])
    ]);
    wrap.appendChild(headerRow);

    // ----------------------------------------------------
    // Metric Summary Cards (Score, Accuracy, Breakdown, Timing)
    // ----------------------------------------------------
    const metricsGrid = el('div', {
      style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 14px; margin-bottom: 28px;'
    }, [
      // 1. Overall Score
      el('div', { className: 'card', style: 'padding: 18px 14px; text-align: center;' }, [
        el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--muted); font-weight: 750; letter-spacing: 0.06em;' }, 'Score / Max'),
        el('div', { style: 'font-size: 1.85rem; font-weight: 850; color: var(--navy); margin: 4px 0;' }, `${attempt.score}/${attempt.max}`),
        el('div', { style: 'font-size: 0.78rem; color: var(--muted);' }, `${attempt.config?.markingScheme?.toUpperCase() || 'NEET'} Marking`)
      ]),
      // 2. Accuracy
      el('div', { className: 'card', style: 'padding: 18px 14px; text-align: center;' }, [
        el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--muted); font-weight: 750; letter-spacing: 0.06em;' }, 'Accuracy'),
        el('div', { style: `font-size: 1.85rem; font-weight: 850; color: ${attempt.accuracyPercent >= 60 ? 'var(--ok)' : 'var(--warn)'}; margin: 4px 0;` }, `${attempt.accuracyPercent}%`),
        el('div', { style: 'font-size: 0.78rem; color: var(--muted);' }, `${correctCount}/${mcqCount} MCQs correct`)
      ]),
      // 3. Correct
      el('div', { className: 'card', style: 'padding: 18px 14px; text-align: center; border-bottom: 3px solid var(--ok);' }, [
        el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--muted); font-weight: 750; letter-spacing: 0.06em;' }, 'Correct'),
        el('div', { style: 'font-size: 1.85rem; font-weight: 850; color: var(--ok); margin: 4px 0;' }, String(correctCount)),
        el('div', { style: 'font-size: 0.78rem; color: var(--ok); font-weight: 600;' }, `+${correctCount * 4} pts`)
      ]),
      // 4. Wrong
      el('div', { className: 'card', style: 'padding: 18px 14px; text-align: center; border-bottom: 3px solid var(--bad);' }, [
        el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--muted); font-weight: 750; letter-spacing: 0.06em;' }, 'Wrong'),
        el('div', { style: 'font-size: 1.85rem; font-weight: 850; color: var(--bad); margin: 4px 0;' }, String(wrongCount)),
        el('div', { style: 'font-size: 0.78rem; color: var(--bad); font-weight: 600;' }, `-${wrongCount} pts`)
      ]),
      // 5. Skipped
      el('div', { className: 'card', style: 'padding: 18px 14px; text-align: center;' }, [
        el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--muted); font-weight: 750; letter-spacing: 0.06em;' }, 'Skipped'),
        el('div', { style: 'font-size: 1.85rem; font-weight: 850; color: var(--muted); margin: 4px 0;' }, String(skippedCount)),
        el('div', { style: 'font-size: 0.78rem; color: var(--muted);' }, '0 pts')
      ]),
      // 6. Time & Avg Pace
      el('div', { className: 'card', style: 'padding: 18px 14px; text-align: center;' }, [
        el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--muted); font-weight: 750; letter-spacing: 0.06em;' }, 'Time & Pace'),
        el('div', { style: 'font-size: 1.85rem; font-weight: 850; color: var(--navy); margin: 4px 0;' }, formatTime(totalTimeMs / 1000)),
        el('div', { style: 'font-size: 0.78rem; color: var(--muted);' }, `~${avgTimePerQSec}s / question`)
      ])
    ]);
    wrap.appendChild(metricsGrid);

    // ----------------------------------------------------
    // Section-Wise Breakdown Table + Pure SVG Bar Chart
    // ----------------------------------------------------
    const bySection = attempt.bySection || {};
    const sectionList = Object.values(bySection);

    if (sectionList.length > 0) {
      const sectionCard = el('div', { className: 'card', style: 'margin-bottom: 28px;' }, [
        el('div', { style: 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;' }, [
          el('h3', {}, 'Section-Wise Performance & Accuracy Chart'),
          el('span', { className: 'pill pill-info' }, 'Accuracy Breakdown')
        ])
      ]);

      // SVG Bar Chart (no external library, clean pure SVG)
      const chartContainer = el('div', { style: 'margin-bottom: 24px; padding: 16px; background: var(--paper); border-radius: var(--radius-md); border: 1px solid var(--line);' });

      const svgHeight = Math.max(140, sectionList.length * 38);
      const chartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chartSvg.setAttribute('width', '100%');
      chartSvg.setAttribute('height', String(svgHeight));
      chartSvg.setAttribute('viewBox', `0 0 600 ${svgHeight}`);
      chartSvg.style.overflow = 'visible';

      sectionList.forEach((s, idx) => {
        const y = idx * 38 + 10;
        const barWidth = Math.max(4, (s.accuracyPercent / 100) * 360);
        const barColor = s.accuracyPercent >= 75 ? 'var(--ok)' : (s.accuracyPercent >= 50 ? 'var(--gold)' : 'var(--bad)');

        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '135');
        text.setAttribute('y', String(y + 14));
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('fill', 'var(--navy)');
        text.setAttribute('font-size', '12px');
        text.setAttribute('font-weight', '700');
        text.textContent = s.section.length > 18 ? s.section.slice(0, 16) + '..' : s.section;
        chartSvg.appendChild(text);

        // Background track
        const track = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        track.setAttribute('x', '145');
        track.setAttribute('y', String(y));
        track.setAttribute('width', '360');
        track.setAttribute('height', '18');
        track.setAttribute('rx', '4');
        track.setAttribute('fill', 'var(--line)');
        chartSvg.appendChild(track);

        // Value bar
        const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bar.setAttribute('x', '145');
        bar.setAttribute('y', String(y));
        bar.setAttribute('width', String(barWidth));
        bar.setAttribute('height', '18');
        bar.setAttribute('rx', '4');
        bar.setAttribute('fill', barColor);
        chartSvg.appendChild(bar);

        // Value text
        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.setAttribute('x', '515');
        valText.setAttribute('y', String(y + 14));
        valText.setAttribute('fill', 'var(--ink)');
        valText.setAttribute('font-size', '12px');
        valText.setAttribute('font-weight', '700');
        valText.textContent = `${s.accuracyPercent}% (${s.correct}/${s.total})`;
        chartSvg.appendChild(valText);
      });

      chartContainer.appendChild(chartSvg);
      sectionCard.appendChild(chartContainer);

      // Section Table
      const tableWrapper = el('div', { style: 'overflow-x: auto;' });
      const table = el('table', { style: 'width: 100%; border-collapse: collapse; font-size: 0.92rem;' });
      table.innerHTML = `
        <thead>
          <tr style="border-bottom: 2px solid var(--line); text-align: left; color: var(--navy);">
            <th style="padding: 10px 8px;">Section</th>
            <th style="padding: 10px 8px; text-align: center;">Questions</th>
            <th style="padding: 10px 8px; text-align: center;">Correct</th>
            <th style="padding: 10px 8px; text-align: center;">Wrong</th>
            <th style="padding: 10px 8px; text-align: center;">Skipped</th>
            <th style="padding: 10px 8px; text-align: center;">Score</th>
            <th style="padding: 10px 8px; text-align: right;">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${sectionList.map(s => `
            <tr style="border-bottom: 1px solid var(--line);">
              <td style="padding: 12px 8px; font-weight: 700;">${s.section}</td>
              <td style="padding: 12px 8px; text-align: center;">${s.total}</td>
              <td style="padding: 12px 8px; text-align: center; color: var(--ok); font-weight: 700;">${s.correct}</td>
              <td style="padding: 12px 8px; text-align: center; color: var(--bad);">${s.wrong}</td>
              <td style="padding: 12px 8px; text-align: center; color: var(--muted);">${s.skipped}</td>
              <td style="padding: 12px 8px; text-align: center; font-weight: 700;">${s.score}/${s.maxScore}</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: ${s.accuracyPercent >= 60 ? 'var(--ok)' : 'var(--warn)'};">${s.accuracyPercent}%</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      tableWrapper.appendChild(table);
      sectionCard.appendChild(tableWrapper);
      wrap.appendChild(sectionCard);
    }

    // ----------------------------------------------------
    // Highlighted "Topics to Revise" Card (< 60% accuracy)
    // ----------------------------------------------------
    const topicsToRevise = attempt.topicsToRevise || [];
    if (topicsToRevise.length > 0) {
      const reviseCard = el('div', {
        className: 'card',
        style: 'margin-bottom: 28px; border-left: 5px solid var(--warn); background: #fffdfa;'
      }, [
        el('div', { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;' }, [
          el('span', { style: 'font-size: 1.3rem;' }, '🎯'),
          el('h3', { style: 'color: var(--warn); margin: 0;' }, 'Priority Topics to Revise (< 60% Accuracy)')
        ]),
        el('p', { style: 'color: var(--muted); font-size: 0.92rem; margin-bottom: 16px;' },
          'Your performance in these topics fell below 60%. Prioritise these conceptual areas for focused study:'
        ),
        el('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;' },
          topicsToRevise.map(t => el('div', {
            style: 'border: 1px solid var(--warn-border); background: var(--warn-bg); border-radius: var(--radius-sm); padding: 12px 14px;'
          }, [
            el('div', { style: 'font-weight: 700; font-size: 0.95rem; color: #78350f; margin-bottom: 4px;' }, t.topic),
            el('div', { style: 'font-size: 0.82rem; color: var(--warn); display: flex; justify-content: space-between;' }, [
              el('span', {}, `${t.correct}/${t.total} correct`),
              el('span', { style: 'font-weight: 700;' }, `${t.accuracyPercent}% Accuracy`)
            ])
          ]))
        )
      ]);
      wrap.appendChild(reviseCard);
    }

    // ----------------------------------------------------
    // All Topics Accuracy Breakdown
    // ----------------------------------------------------
    const byTopic = attempt.byTopic || {};
    const topicList = Object.values(byTopic);
    if (topicList.length > 0) {
      const topicCard = el('div', { className: 'card', style: 'margin-bottom: 28px;' }, [
        el('h3', { style: 'margin-bottom: 14px;' }, 'All Topics Breakdown'),
        el('div', { style: 'display: flex; flex-direction: column; gap: 10px;' },
          topicList.map(t => {
            const barW = Math.max(2, t.accuracyPercent);
            const col = t.accuracyPercent >= 75 ? 'var(--ok)' : (t.accuracyPercent >= 50 ? 'var(--gold)' : 'var(--bad)');
            return el('div', { style: 'display: grid; grid-template-columns: 160px 1fr 90px; align-items: center; gap: 14px; font-size: 0.88rem;' }, [
              el('span', { style: 'font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;', title: t.topic }, t.topic),
              el('div', { style: 'background: var(--paper); height: 10px; border-radius: 99px; overflow: hidden; border: 1px solid var(--line);' }, [
                el('div', { style: `background: ${col}; width: ${barW}%; height: 100%; border-radius: 99px;` })
              ]),
              el('span', { style: 'text-align: right; font-weight: 700; color: var(--ink);' }, `${t.correct}/${t.total} (${t.accuracyPercent}%)`)
            ]);
          })
        )
      ]);
      wrap.appendChild(topicCard);
    }

    // ----------------------------------------------------
    // Time & Hint Analysis Card
    // ----------------------------------------------------
    let fastestItem = null;
    let slowestItem = null;

    items.forEach((it, idx) => {
      const qid = it.qid || it.id;
      const ms = timeMs[qid] || 0;
      if (ms > 0) {
        if (!fastestItem || ms < fastestItem.timeMs) {
          fastestItem = { idx: idx + 1, qid, prompt: it.prompt, timeMs: ms };
        }
        if (!slowestItem || ms > slowestItem.timeMs) {
          slowestItem = { idx: idx + 1, qid, prompt: it.prompt, timeMs: ms };
        }
      }
    });

    const hintQuestions = items.filter(it => hintUsed.has(it.qid || it.id));

    const timeCard = el('div', { className: 'card', style: 'margin-bottom: 32px;' }, [
      el('h3', { style: 'margin-bottom: 16px;' }, '⏱️ Time & Strategy Insights'),
      el('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;' }, [
        // Fastest question
        el('div', { style: 'padding: 14px; background: var(--ok-bg); border: 1px solid var(--ok-border); border-radius: var(--radius-sm);' }, [
          el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--ok); font-weight: 750;' }, '⚡ Fastest Response'),
          fastestItem
            ? el('div', { style: 'margin-top: 6px;' }, [
              el('div', { style: 'font-size: 1.25rem; font-weight: 850; color: var(--ok);' }, `${(fastestItem.timeMs / 1000).toFixed(1)}s`),
              el('div', { style: 'font-size: 0.85rem; color: var(--ink); font-weight: 600;' }, `Q${fastestItem.idx}: ${fastestItem.prompt.slice(0, 50)}...`)
            ])
            : el('div', { style: 'font-size: 0.85rem; color: var(--muted); margin-top: 6px;' }, 'Untimed')
        ]),
        // Slowest question
        el('div', { style: 'padding: 14px; background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-sm);' }, [
          el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--muted); font-weight: 750;' }, '⏳ Longest Consideration'),
          slowestItem
            ? el('div', { style: 'margin-top: 6px;' }, [
              el('div', { style: 'font-size: 1.25rem; font-weight: 850; color: var(--navy);' }, `${(slowestItem.timeMs / 1000).toFixed(1)}s`),
              el('div', { style: 'font-size: 0.85rem; color: var(--ink); font-weight: 600;' }, `Q${slowestItem.idx}: ${slowestItem.prompt.slice(0, 50)}...`)
            ])
            : el('div', { style: 'font-size: 0.85rem; color: var(--muted); margin-top: 6px;' }, 'Untimed')
        ]),
        // Hint-used questions
        el('div', { style: 'padding: 14px; background: var(--info-bg); border: 1px solid var(--info-border); border-radius: var(--radius-sm);' }, [
          el('div', { style: 'font-size: 0.75rem; text-transform: uppercase; color: var(--info); font-weight: 750;' }, '💡 Hint Usage'),
          el('div', { style: 'font-size: 1.25rem; font-weight: 850; color: var(--info); margin-top: 6px;' }, `${hintQuestions.length} Question${hintQuestions.length === 1 ? '' : 's'}`),
          el('div', { style: 'font-size: 0.82rem; color: #0c4a6e; margin-top: 4px;' },
            hintQuestions.length > 0
              ? `Hints viewed on: ${hintQuestions.map((_, i) => `Q${items.indexOf(hintQuestions[i]) + 1}`).join(', ')}`
              : 'No hints used during this test'
          )
        ])
      ])
    ]);
    wrap.appendChild(timeCard);

    // ----------------------------------------------------
    // Action Buttons Footer
    // ----------------------------------------------------
    const presetId = attempt.presetId || attempt.config?.presetId;
    const currentPreset = PRESETS.find(p => p.id === presetId) || (presetId ? getPresetById(presetId) : null);

    const footerActions = el('div', {
      className: 'no-print',
      style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; padding-top: 16px; border-top: 1px solid var(--line);'
    }, [
      el('a', { href: `#/review/${attempt.id}`, className: 'btn btn-gold btn-lg' }, 'Review Answers →'),
      el('div', { style: 'display: flex; gap: 10px; flex-wrap: wrap; align-items: center;' }, [
        el('button', {
          type: 'button',
          className: 'btn btn-gold',
          onClick: () => {
            const avail = availability(ctx.bank);
            const history = {
              seenIds: store.getSeenIds(),
              topicStats: store.getTopicStats()
            };
            const hasHistory = Object.keys(history.topicStats || {}).length > 0;

            const sectionsToUse = currentPreset
              ? currentPreset.sections.map(s => ({ key: s.key, count: avail.clamp(s.key, s.count) }))
              : (attempt.config?.sections || [{ key: 'Physics', count: 10 }, { key: 'Chemistry', count: 10 }, { key: 'Biology', count: 10 }]);

            const timeLimit = currentPreset
              ? currentPreset.timeMinutes
              : (attempt.config?.timeLimitMinutes !== undefined ? attempt.config.timeLimitMinutes : 36);

            const markingScheme = currentPreset
              ? (currentPreset.marking || 'neet')
              : (attempt.config?.markingScheme || 'neet');

            const includeGenerated = currentPreset
              ? Boolean(currentPreset.includeGenerated)
              : Boolean(attempt.config?.includeGenerated);

            const newTest = generateTest({
              sections: sectionsToUse,
              mode: hasHistory ? 'smart' : 'random',
              config: {
                timeLimitMinutes: timeLimit,
                markingScheme,
                includeGenerated
              },
              markingScheme,
              timeLimitMinutes: timeLimit,
              includeGenerated,
              history,
              bank: ctx.bank
            });

            newTest.config.presetId = currentPreset?.id || presetId;
            newTest.config.presetName = currentPreset?.name || attempt.presetName || attempt.config?.presetName;

            const now = Date.now();
            const endsAt = timeLimit > 0 ? now + (timeLimit * 60 * 1000) : 0;
            store.saveActiveTest({
              test: newTest,
              answers: {},
              marks: [],
              bookmarks: [],
              timeMs: {},
              hintUsed: [],
              cur: 0,
              startedAt: now,
              endsAt
            });
            ctx.router.navigate('#/test');
          }
        }, 'Take Another Test →'),
        el('a', { href: '#/', className: 'btn btn-navy' }, 'Choose Another Test'),
        el('a', { href: '#/history', className: 'btn btn-outline' }, 'My History')
      ])
    ]);
    wrap.appendChild(footerActions);

    // Print-only footer credit
    const printFooter = el('div', { className: 'print-only print-footer' }, [
      el('span', {}, 'Powered by '),
      el('b', {}, 'amAIze')
    ]);
    wrap.appendChild(printFooter);

    container.appendChild(wrap);
    return { destroy() { } };
  }
};
