/**
 * practice/js/ui/test.js
 * Test Runner Screen (#/test) per 01_PRD.md §5.3 and 06 §B3.
 * Features:
 * - Persistent timer via endsAt timestamp
 * - Full palette integration
 * - Keyboard shortcuts (1-4, A-D, N/Enter, P, M, C)
 * - Autosave after every interaction
 * - Per-question time tracking
 * - Open reflection support
 * - Auto-submit and summary confirmation modal
 */

import { el, showModal } from './components.js';
import { STRINGS } from '../strings.js';
import { store } from '../store.js';
import { createTimer } from './timer.js';
import { createPalette } from './palette.js';
import { scoreTest, updateStats } from '../engine/index.js';

export const testView = {
  render(container, ctx) {
    const activeState = store.getActiveTest();

    if (!activeState || !activeState.test || !Array.isArray(activeState.test.items) || activeState.test.items.length === 0) {
      container.innerHTML = `
        <div class="wrap" style="padding: 60px 0; text-align: center;">
          <h2>No active test found</h2>
          <p style="color: var(--muted); margin: 16px 0 24px;">Start a new practice test from the practice home.</p>
          <a href="#/" class="btn btn-gold btn-lg">Start Practice Test →</a>
        </div>
      `;
      return { destroy() { } };
    }

    const test = activeState.test;
    const items = test.items;
    const totalCount = items.length;

    // Local mutable state restored from storage
    let currentIndex = typeof activeState.cur === 'number' && activeState.cur >= 0 && activeState.cur < totalCount
      ? activeState.cur
      : 0;
    const answers = { ...(activeState.answers || {}) };
    const marks = new Set(activeState.marks || []);
    const bookmarks = new Set(activeState.bookmarks || []);
    const timeMs = { ...(activeState.timeMs || {}) };
    const hintUsed = new Set(activeState.hintUsed || []);

    // Question timing tracking
    let questionEnterTime = Date.now();

    function recordCurrentQuestionTime() {
      const now = Date.now();
      const elapsed = now - questionEnterTime;
      const currentItem = items[currentIndex];
      if (currentItem) {
        const qid = currentItem.qid || currentItem.id;
        timeMs[qid] = (timeMs[qid] || 0) + elapsed;
      }
      questionEnterTime = now;
    }

    function saveState() {
      recordCurrentQuestionTime();
      store.saveActiveTest({
        test,
        answers,
        marks: Array.from(marks),
        bookmarks: Array.from(bookmarks),
        timeMs,
        hintUsed: Array.from(hintUsed),
        cur: currentIndex,
        startedAt: activeState.startedAt,
        endsAt: activeState.endsAt
      });
    }

    // Main layout elements
    const testLayout = el('div', { className: 'test-layout' });

    // Sticky Top Bar
    const topbar = el('div', { className: 'test-topbar' });
    const topbarInner = el('div', { className: 'wrap test-topbar-inner' });

    const topbarLeft = el('div', { className: 'test-topbar-left' }, [
      el('span', { className: 'pill pill-navy', id: 'section-badge' }, items[currentIndex]?.section || 'Section'),
      el('span', { id: 'question-counter', style: 'font-weight: 700; font-size: 0.95rem; color: var(--navy);' },
        `Q ${currentIndex + 1}/${totalCount}`
      )
    ]);

    // Timer creation
    const timerComponent = createTimer({
      endsAt: activeState.endsAt,
      totalDurationMs: activeState.endsAt && activeState.startedAt ? (activeState.endsAt - activeState.startedAt) : 0,
      onTimeOut: () => {
        handleTimeOut();
      }
    });

    const paletteToggleBtn = el('button', {
      type: 'button',
      className: 'btn btn-outline btn-sm palette-toggle-btn',
      'aria-label': 'Toggle question palette',
      onClick: () => {
        paletteComponent.toggleMobile();
      }
    }, '☰ Grid');

    const submitBtn = el('button', {
      type: 'button',
      className: 'btn btn-gold btn-sm',
      onClick: () => {
        handleSubmitClick();
      }
    }, STRINGS.btnSubmit);

    const topbarRight = el('div', { className: 'test-topbar-right' }, [
      timerComponent.element,
      paletteToggleBtn,
      submitBtn
    ]);

    topbarInner.appendChild(topbarLeft);
    topbarInner.appendChild(topbarRight);
    topbar.appendChild(topbarInner);
    testLayout.appendChild(topbar);

    // Workspace: Question Card (Left) + Palette (Right)
    const workspace = el('div', { className: 'wrap test-workspace' });

    // Question Card Container
    const cardContainer = el('div', { className: 'question-card-container' });
    const questionCard = el('div', { className: 'question-card', id: 'active-question-card' });
    cardContainer.appendChild(questionCard);

    // Palette Component
    const paletteComponent = createPalette({
      items,
      answers,
      marks: Array.from(marks),
      bookmarks: Array.from(bookmarks),
      currentIndex,
      onSelectQuestion: (targetIdx) => {
        goToQuestion(targetIdx);
      }
    });

    workspace.appendChild(cardContainer);
    workspace.appendChild(paletteComponent.element);
    testLayout.appendChild(workspace);
    container.appendChild(testLayout);

    // In-place UI state helpers (prevent DOM destruction and eliminating unwanted scroll jumps)
    function selectOption(optIdx) {
      const item = items[currentIndex];
      const qid = item.qid || item.id;
      answers[qid] = optIdx;
      saveState();

      // Update option button styles in-place without rebuilding DOM
      const optButtons = questionCard.querySelectorAll('.option-btn');
      optButtons.forEach((btn, idx) => {
        const isSelected = idx === optIdx;
        btn.classList.toggle('selected', isSelected);
        btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      });

      paletteComponent.update({ answers, currentIndex });
    }

    function clearAnswer() {
      const item = items[currentIndex];
      const qid = item.qid || item.id;
      delete answers[qid];
      saveState();

      const optButtons = questionCard.querySelectorAll('.option-btn');
      optButtons.forEach((btn) => {
        btn.classList.remove('selected');
        btn.setAttribute('aria-checked', 'false');
      });

      const textarea = questionCard.querySelector('.reflection-textarea');
      if (textarea) {
        textarea.value = '';
      }

      paletteComponent.update({ answers, currentIndex });
    }

    function toggleMark() {
      const item = items[currentIndex];
      const qid = item.qid || item.id;
      if (marks.has(qid)) marks.delete(qid);
      else marks.add(qid);
      saveState();

      const isMarked = marks.has(qid);
      const btnMark = questionCard.querySelector('#btn-mark-review');
      if (btnMark) {
        btnMark.className = `btn btn-sm ${isMarked ? 'btn-navy' : 'btn-outline'}`;
        btnMark.textContent = isMarked ? '✓ Marked for Review' : 'Mark for Review';
      }

      paletteComponent.update({ marks: Array.from(marks) });
    }

    function toggleBookmark() {
      const item = items[currentIndex];
      const qid = item.qid || item.id;
      if (bookmarks.has(qid)) bookmarks.delete(qid);
      else bookmarks.add(qid);
      saveState();

      const isBookmarked = bookmarks.has(qid);
      const btnBookmark = questionCard.querySelector('#btn-bookmark-q');
      if (btnBookmark) {
        btnBookmark.className = `btn btn-sm ${isBookmarked ? 'btn-gold' : 'btn-outline'}`;
        btnBookmark.textContent = isBookmarked ? '★ Bookmarked' : '☆ Bookmark';
        btnBookmark.setAttribute('aria-label', isBookmarked ? 'Remove bookmark' : 'Bookmark question');
      }

      paletteComponent.update({ marks: Array.from(marks), bookmarks: Array.from(bookmarks) });
    }

    function revealHint() {
      const item = items[currentIndex];
      const qid = item.qid || item.id;
      hintUsed.add(qid);
      saveState();

      const hintContainer = questionCard.querySelector('.hint-container');
      if (hintContainer) {
        hintContainer.innerHTML = '';
        hintContainer.appendChild(el('div', { className: 'hint-box' }, [
          el('b', {}, 'Hint: '),
          item.hint
        ]));
      }
    }

    // Render Question Function
    function renderQuestion(index) {
      recordCurrentQuestionTime();
      currentIndex = index;

      const item = items[currentIndex];
      const qid = item.qid || item.id;
      const isMcq = item.type === 'mcq';
      const isMarked = marks.has(qid);
      const isBookmarked = bookmarks.has(qid);
      const isHintRevealed = hintUsed.has(qid);

      // Update sticky bar
      const sectionBadge = topbar.querySelector('#section-badge');
      const counterText = topbar.querySelector('#question-counter');
      if (sectionBadge) sectionBadge.textContent = item.section;
      if (counterText) counterText.textContent = `Q ${currentIndex + 1}/${totalCount}`;

      questionCard.innerHTML = '';

      // Meta tags row
      const metaRow = el('div', { className: 'question-meta' }, [
        el('div', { className: 'question-tags' }, [
          el('span', { className: 'pill pill-navy' }, item.section),
          el('span', { className: 'pill pill-gold' }, item.topic),
          el('span', { className: 'pill pill-info' }, item.difficulty),
          item.generated ? el('span', { className: 'pill pill-warn' }, 'Parametric') : null
        ]),
        el('div', { style: 'display: flex; gap: 8px;' }, [
          el('button', {
            type: 'button',
            id: 'btn-bookmark-q',
            className: `btn btn-sm ${isBookmarked ? 'btn-gold' : 'btn-outline'}`,
            'aria-label': isBookmarked ? 'Remove bookmark' : 'Bookmark question',
            onClick: () => toggleBookmark()
          }, isBookmarked ? '★ Bookmarked' : '☆ Bookmark')
        ])
      ]);
      questionCard.appendChild(metaRow);

      // Question Prompt
      const promptEl = el('div', { className: 'question-prompt' }, item.prompt);
      questionCard.appendChild(promptEl);

      // Response Area (MCQ or Open)
      if (isMcq) {
        const optionsList = el('div', { className: 'options-list', role: 'radiogroup', 'aria-label': 'Answer options' });
        const currentAns = answers[qid];
        const letters = ['A', 'B', 'C', 'D'];

        item.options.forEach((optText, optIdx) => {
          const isSelected = currentAns !== undefined && Number(currentAns) === optIdx;
          const optBtn = el('button', {
            type: 'button',
            className: `option-btn ${isSelected ? 'selected' : ''}`,
            role: 'radio',
            'aria-checked': isSelected ? 'true' : 'false',
            onClick: () => selectOption(optIdx)
          }, [
            el('span', { className: 'option-letter' }, letters[optIdx]),
            el('span', { className: 'option-text' }, optText)
          ]);
          optionsList.appendChild(optBtn);
        });

        questionCard.appendChild(optionsList);
      } else {
        // Reflection open response
        const reflBox = el('div', { className: 'reflection-box' }, [
          el('div', { className: 'pill pill-review', style: 'margin-bottom: 12px;' }, STRINGS.reflectionPromptTag)
        ]);

        const textarea = el('textarea', {
          className: 'reflection-textarea',
          placeholder: STRINGS.reflectionPlaceholder,
          'aria-label': 'Reflection response'
        });
        textarea.value = answers[qid] || '';
        textarea.addEventListener('input', () => {
          answers[qid] = textarea.value;
          saveState();
          paletteComponent.update({ answers, currentIndex });
        });

        reflBox.appendChild(textarea);
        questionCard.appendChild(reflBox);
      }

      // Hint Container
      if (item.hint) {
        const hintContainer = el('div', { className: 'hint-container' });
        if (isHintRevealed) {
          hintContainer.appendChild(el('div', { className: 'hint-box' }, [
            el('b', {}, 'Hint: '),
            item.hint
          ]));
        } else {
          hintContainer.appendChild(el('button', {
            type: 'button',
            id: 'btn-show-hint',
            className: 'btn btn-outline-gold btn-sm',
            onClick: () => revealHint()
          }, '💡 Show Hint'));
        }
        questionCard.appendChild(hintContainer);
      }

      // Action Toolbar
      const toolbar = el('div', { className: 'question-toolbar' });

      const leftToolbar = el('div', { className: 'toolbar-group' }, [
        el('button', {
          type: 'button',
          className: 'btn btn-outline btn-sm',
          disabled: currentIndex === 0,
          onClick: () => goToQuestion(currentIndex - 1)
        }, STRINGS.btnPrev),
        el('button', {
          type: 'button',
          className: 'btn btn-navy btn-sm',
          onClick: () => {
            if (currentIndex < totalCount - 1) {
              goToQuestion(currentIndex + 1);
            } else {
              handleSubmitClick();
            }
          }
        }, currentIndex === totalCount - 1 ? 'Review & Submit' : STRINGS.btnNext)
      ]);

      const rightToolbar = el('div', { className: 'toolbar-group' }, [
        el('button', {
          type: 'button',
          id: 'btn-clear-answer',
          className: 'btn btn-outline btn-sm',
          onClick: () => clearAnswer()
        }, STRINGS.btnClear),
        el('button', {
          type: 'button',
          id: 'btn-mark-review',
          className: `btn btn-sm ${isMarked ? 'btn-navy' : 'btn-outline'}`,
          onClick: () => toggleMark()
        }, isMarked ? '✓ Marked for Review' : 'Mark for Review')
      ]);

      toolbar.appendChild(leftToolbar);
      toolbar.appendChild(rightToolbar);
      questionCard.appendChild(toolbar);

      paletteComponent.update({ answers, marks: Array.from(marks), bookmarks: Array.from(bookmarks), currentIndex });
    }

    function goToQuestion(targetIdx) {
      if (targetIdx < 0 || targetIdx >= totalCount) return;
      renderQuestion(targetIdx);

      // Only scroll if question card is scrolled out of view
      const cardRect = cardContainer.getBoundingClientRect();
      const topbarHeight = 120;
      if (cardRect.top < topbarHeight || cardRect.top > window.innerHeight - 100) {
        cardContainer.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      }
    }

    // Submit Handling
    function handleSubmitClick() {
      recordCurrentQuestionTime();

      let answeredCount = 0;
      for (const it of items) {
        const qid = it.qid || it.id;
        const ans = answers[qid];
        if (ans !== undefined && ans !== null && ans !== '') answeredCount++;
      }
      const unansweredCount = totalCount - answeredCount;
      const markedCount = marks.size;

      const summaryBody = el('div', {}, [
        el('p', {}, 'Are you ready to complete your test and view your performance analysis?'),
        el('div', { className: 'card', style: 'background: var(--paper); padding: 16px; margin: 16px 0;' }, [
          el('div', { style: 'display: flex; justify-content: space-between; margin-bottom: 8px;' }, [
            el('span', {}, 'Answered questions:'),
            el('b', { style: 'color: var(--ok);' }, String(answeredCount))
          ]),
          el('div', { style: 'display: flex; justify-content: space-between; margin-bottom: 8px;' }, [
            el('span', {}, 'Unanswered questions:'),
            el('b', { style: 'color: var(--bad);' }, String(unansweredCount))
          ]),
          el('div', { style: 'display: flex; justify-content: space-between;' }, [
            el('span', {}, 'Marked for review:'),
            el('b', { style: 'color: var(--review);' }, String(markedCount))
          ])
        ])
      ]);

      showModal({
        title: STRINGS.submitModalTitle,
        body: summaryBody,
        confirmText: STRINGS.confirmSubmit,
        cancelText: STRINGS.cancelSubmit,
        onConfirm: () => {
          finalizeSubmission();
        }
      });
    }

    function handleTimeOut() {
      recordCurrentQuestionTime();
      showModal({
        title: STRINGS.timeOutTitle,
        body: STRINGS.timeOutMessage,
        confirmText: 'View Performance Analysis',
        cancelText: 'OK',
        onConfirm: () => finalizeSubmission(),
        onCancel: () => finalizeSubmission()
      });
    }

    function finalizeSubmission() {
      recordCurrentQuestionTime();

      // Score the test attempt using engine
      const scoredResult = scoreTest({
        test,
        answers,
        markingScheme: test.config?.markingScheme || 'neet',
        timeMs,
        hintUsed: Array.from(hintUsed)
      });

      // Update history in store
      const currentHistory = {
        seenIds: store.getSeenIds(),
        topicStats: store.getTopicStats()
      };
      const updatedHistory = updateStats(currentHistory, scoredResult);
      store.saveSeenIds(updatedHistory.seenIds);
      store.saveTopicStats(updatedHistory.topicStats);

      // Save finished attempt
      const attemptId = `ATT-${Date.now().toString(36).toUpperCase()}`;
      const attemptRecord = {
        id: attemptId,
        code: test.code,
        presetId: test.config?.presetId,
        presetName: test.config?.presetName,
        finishedAt: new Date().toISOString(),
        config: test.config,
        items,
        answers,
        timeMs,
        hintUsed: Array.from(hintUsed),
        score: scoredResult.score,
        max: scoredResult.maxScore,
        accuracy: scoredResult.accuracy,
        accuracyPercent: scoredResult.accuracyPercent,
        bySection: scoredResult.bySection,
        byTopic: scoredResult.byTopic,
        topicsToRevise: scoredResult.topicsToRevise,
        timeAnalysis: scoredResult.timeAnalysis,
        reflection: scoredResult.reflection
      };

      store.saveAttempt(attemptRecord);
      store.clearActiveTest();

      ctx.router.navigate(`#/result/${attemptId}`);
    }

    // Keyboard Shortcuts Listener (A-D, 1-4, N/Enter, P, M, C)
    function handleKeyDown(e) {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') return;

      const key = e.key.toUpperCase();
      const item = items[currentIndex];
      const qid = item?.qid || item?.id;

      if (item?.type === 'mcq') {
        let selectedIdx = null;
        if (key === '1' || key === 'A') selectedIdx = 0;
        else if (key === '2' || key === 'B') selectedIdx = 1;
        else if (key === '3' || key === 'C') selectedIdx = 2;
        else if (key === '4' || key === 'D') selectedIdx = 3;

        if (selectedIdx !== null && selectedIdx < item.options.length) {
          e.preventDefault();
          selectOption(selectedIdx);
          return;
        }
      }

      if (key === 'N' || key === 'ENTER') {
        e.preventDefault();
        if (currentIndex < totalCount - 1) {
          goToQuestion(currentIndex + 1);
        } else {
          handleSubmitClick();
        }
      } else if (key === 'P') {
        e.preventDefault();
        if (currentIndex > 0) {
          goToQuestion(currentIndex - 1);
        }
      } else if (key === 'M') {
        e.preventDefault();
        toggleMark();
      } else if (key === 'C') {
        e.preventDefault();
        clearAnswer();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    // Initial render
    renderQuestion(currentIndex);

    return {
      destroy() {
        recordCurrentQuestionTime();
        window.removeEventListener('keydown', handleKeyDown);
        timerComponent.destroy();
      }
    };
  }
};

