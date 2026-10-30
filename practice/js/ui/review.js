/**
 * practice/js/ui/review.js
 * Review Answers Screen (#/review/:id)
 * Features:
 * - Full filters: All / Wrong / Skipped / Marked / Bookmarked / Correct
 * - Color-coded options: Correct option in green, user's wrong option in red
 * - Detailed rationale & hint disclosure
 * - Reflection open items with student response and rubric for self-check
 * - Safe textContent escaping
 */

import { el } from './components.js';
import { store } from '../store.js';

export const reviewView = {
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
    const marks = new Set(attempt.marks || []);
    const bookmarks = new Set(attempt.bookmarks || []);
    const hintUsed = new Set(attempt.hintUsed || []);

    let activeFilter = 'all';

    // Header Row
    const headerRow = el('div', {
      style: 'display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;'
    }, [
      el('div', {}, [
        el('span', { className: 'kicker' }, 'Item-by-Item Review'),
        el('h1', { style: 'font-size: clamp(1.8rem, 3.5vw, 2.3rem);' }, 'Test Review'),
        el('p', { style: 'color: var(--muted); margin-top: 4px;' },
          `Score: ${attempt.score}/${attempt.max} • Accuracy: ${attempt.accuracyPercent}% • Completed on ${new Date(attempt.finishedAt).toLocaleDateString()}`
        )
      ]),
      el('div', { className: 'no-print', style: 'display: flex; gap: 10px; flex-wrap: wrap;' }, [
        el('button', {
          type: 'button',
          className: 'btn btn-outline btn-sm',
          onClick: () => window.print()
        }, '🖨️ Print Review'),
        el('a', {
          href: `#/result/${attempt.id}`,
          className: 'btn btn-navy btn-sm'
        }, '← Summary Report')
      ])
    ]);
    wrap.appendChild(headerRow);

    // Compute filter counts
    let countWrong = 0;
    let countSkipped = 0;
    let countCorrect = 0;
    let countMarked = 0;
    let countBookmarked = 0;

    items.forEach(it => {
      const qid = it.qid || it.id;
      const isMcq = it.type === 'mcq';
      const userAns = answers[qid];
      const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';

      if (marks.has(qid)) countMarked++;
      if (bookmarks.has(qid)) countBookmarked++;

      if (isMcq) {
        if (!isAnswered) countSkipped++;
        else if (Number(userAns) === it.answerIndex) countCorrect++;
        else countWrong++;
      }
    });

    const filterDefs = [
      { id: 'all', label: `All (${items.length})` },
      { id: 'wrong', label: `Incorrect (${countWrong})` },
      { id: 'skipped', label: `Skipped (${countSkipped})` },
      { id: 'marked', label: `Marked (${countMarked})` },
      { id: 'bookmarked', label: `Bookmarked (${countBookmarked})` },
      { id: 'correct', label: `Correct (${countCorrect})` }
    ];

    const filtersBar = el('div', {
      className: 'no-print',
      style: 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--line);'
    });

    const questionsListContainer = el('div', { style: 'display: flex; flex-direction: column; gap: 24px;' });

    function renderFilteredList() {
      filtersBar.innerHTML = '';
      questionsListContainer.innerHTML = '';

      filterDefs.forEach(def => {
        const btn = el('button', {
          type: 'button',
          className: `btn btn-sm ${activeFilter === def.id ? 'btn-navy' : 'btn-outline'}`,
          onClick: () => {
            activeFilter = def.id;
            renderFilteredList();
          }
        }, def.label);
        filtersBar.appendChild(btn);
      });

      let displayedCount = 0;

      items.forEach((item, idx) => {
        const qid = item.qid || item.id;
        const isMcq = item.type === 'mcq';
        const userAns = answers[qid];
        const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';
        const isCorrect = isMcq && isAnswered && Number(userAns) === item.answerIndex;
        const isWrong = isMcq && isAnswered && Number(userAns) !== item.answerIndex;
        const isSkipped = isMcq && !isAnswered;
        const isMarked = marks.has(qid);
        const isBookmarked = bookmarks.has(qid);
        const isHintViewed = hintUsed.has(qid);

        // Filter evaluation
        if (activeFilter === 'wrong' && !isWrong) return;
        if (activeFilter === 'skipped' && !isSkipped) return;
        if (activeFilter === 'marked' && !isMarked) return;
        if (activeFilter === 'bookmarked' && !isBookmarked) return;
        if (activeFilter === 'correct' && !isCorrect) return;

        displayedCount++;

        const card = el('div', {
          className: 'question-card',
          style: `padding: 24px; ${isCorrect ? 'border-left: 4px solid var(--ok);' : (isWrong ? 'border-left: 4px solid var(--bad);' : '')}`
        });

        // Question metadata bar
        let statusBadge;
        if (isMcq) {
          if (isCorrect) statusBadge = el('span', { className: 'pill pill-ok' }, '✓ Correct (+4)');
          else if (isWrong) statusBadge = el('span', { className: 'pill pill-bad' }, '✗ Incorrect (-1)');
          else statusBadge = el('span', { className: 'pill pill-warn' }, '○ Skipped (0)');
        } else {
          statusBadge = el('span', { className: 'pill pill-review' }, 'Reflection (Unscored)');
        }

        const topRow = el('div', { className: 'question-meta', style: 'margin-bottom: 14px;' }, [
          el('div', { className: 'question-tags' }, [
            el('span', { className: 'pill pill-navy' }, `Q${idx + 1}`),
            el('span', { className: 'pill pill-gold' }, item.topic),
            el('span', { className: 'pill' }, item.difficulty),
            item.generated ? el('span', { className: 'pill pill-warn' }, 'Parametric') : null,
            statusBadge,
            isMarked ? el('span', { className: 'pill pill-review' }, 'Marked') : null,
            isBookmarked ? el('span', { className: 'pill pill-gold' }, '★ Bookmarked') : null,
            isHintViewed ? el('span', { className: 'pill pill-info' }, '💡 Hint Used') : null
          ])
        ]);
        card.appendChild(topRow);

        // Question Prompt
        const promptEl = el('div', { className: 'question-prompt', style: 'font-size: 1.15rem; margin-bottom: 20px;' }, item.prompt);
        card.appendChild(promptEl);

        // Options or Open Response
        if (isMcq) {
          const optList = el('div', { style: 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;' });

          item.options.forEach((optText, optIdx) => {
            const isCorrectOption = optIdx === item.answerIndex;
            const isUserSelection = isAnswered && Number(userAns) === optIdx;

            let borderStyle = '1px solid var(--line)';
            let bgStyle = 'var(--white)';
            let textWeight = 'normal';
            let tagEl = null;

            if (isCorrectOption) {
              borderStyle = '2px solid var(--ok)';
              bgStyle = 'var(--ok-bg)';
              textWeight = '650';
              tagEl = el('span', { style: 'color: var(--ok); font-weight: 750; font-size: 0.82rem; margin-left: 8px;' }, '✓ Correct Answer');
            }

            if (isUserSelection && !isCorrectOption) {
              borderStyle = '2px solid var(--bad)';
              bgStyle = 'var(--bad-bg)';
              textWeight = '650';
              tagEl = el('span', { style: 'color: var(--bad); font-weight: 750; font-size: 0.82rem; margin-left: 8px;' }, '✗ Your Answer');
            }

            if (isUserSelection && isCorrectOption) {
              tagEl = el('span', { style: 'color: var(--ok); font-weight: 750; font-size: 0.82rem; margin-left: 8px;' }, '✓ Correct (Your Answer)');
            }

            const optRow = el('div', {
              style: `display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: ${borderStyle}; border-radius: var(--radius-sm); background: ${bgStyle}; font-weight: ${textWeight};`
            }, [
              el('div', { style: 'display: flex; align-items: center; gap: 10px;' }, [
                el('span', {
                  style: `display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; font-size: 0.82rem; font-weight: 750; ${isCorrectOption ? 'background: var(--ok); color: #fff;' : (isUserSelection ? 'background: var(--bad); color: #fff;' : 'background: var(--paper); color: var(--muted);')}`
                }, String.fromCharCode(65 + optIdx)),
                el('span', {}, optText)
              ]),
              tagEl
            ]);

            optList.appendChild(optRow);
          });

          card.appendChild(optList);
        } else {
          // Reflection Open Response Card
          const reflContainer = el('div', {
            style: 'background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;'
          }, [
            el('div', { style: 'font-weight: 700; color: var(--navy); margin-bottom: 6px;' }, 'Your Submitted Response:'),
            el('div', {
              style: 'color: var(--ink); white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5; margin-bottom: 14px; background: var(--white); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--line);'
            }, userAns || '(No response recorded)')
          ]);
          card.appendChild(reflContainer);
        }

        // Hint Viewed Box (if hint was opened)
        if (isHintViewed && item.hint) {
          const hintBox = el('div', {
            style: 'background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 14px; font-size: 0.88rem; color: #78350f;'
          }, [
            el('b', {}, '💡 Hint Viewed: '),
            item.hint
          ]);
          card.appendChild(hintBox);
        }

        // Rationale / Rubric Explanation
        if (item.rationale) {
          const rationaleBox = el('div', {
            style: 'background: var(--info-bg); border: 1px solid var(--info-border); border-radius: var(--radius-sm); padding: 14px 18px; font-size: 0.92rem; color: #0c4a6e; line-height: 1.5;'
          }, [
            el('b', { style: 'display: block; margin-bottom: 4px; color: var(--navy);' }, isMcq ? 'Rationale & Solution:' : 'Rubric Evaluation Criteria:'),
            item.rationale
          ]);
          card.appendChild(rationaleBox);
        }

        questionsListContainer.appendChild(card);
      });

      if (displayedCount === 0) {
        questionsListContainer.appendChild(el('div', {
          className: 'card',
          style: 'text-align: center; color: var(--muted); padding: 48px;'
        }, [
          el('h3', { style: 'margin-bottom: 8px;' }, 'No Questions Match This Filter'),
          el('p', { style: 'margin: 0;' }, 'Try selecting "All Questions" to inspect your complete test paper.')
        ]));
      }
    }

    renderFilteredList();

    wrap.appendChild(filtersBar);
    wrap.appendChild(questionsListContainer);

    // Bottom Navigation Row
    const bottomNav = el('div', {
      className: 'no-print',
      style: 'display: flex; justify-content: space-between; align-items: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--line);'
    }, [
      el('a', { href: `#/result/${attempt.id}`, className: 'btn btn-outline' }, '← Back to Performance Summary'),
      el('button', {
        type: 'button',
        className: 'btn btn-navy',
        onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
      }, '↑ Back to Top')
    ]);
    wrap.appendChild(bottomNav);

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
