/**
 * practice/js/ui/palette.js
 * Question palette component showing question status and allowing quick navigation.
 */

import { el } from './components.js';

/**
 * Creates the question palette UI.
 * @param {object} options
 * @param {object[]} options.items Test items
 * @param {Record<string, any>} options.answers User answers
 * @param {string[]} options.marks Marked question IDs
 * @param {string[]} options.bookmarks Bookmarked question IDs
 * @param {number} options.currentIndex Active question index
 * @param {(idx: number) => void} options.onSelectQuestion Jump to question callback
 * @returns {{ element: HTMLElement, update: (props: object) => void, toggleMobile: () => void }}
 */
export function createPalette({ items, answers, marks, bookmarks, currentIndex, onSelectQuestion }) {
  const card = el('div', { className: 'palette-card', id: 'question-palette' });

  const header = el('div', { className: 'palette-header' }, [
    el('h3', {}, 'Question Palette'),
    el('span', { className: 'pill pill-navy', id: 'palette-summary' }, '0/0')
  ]);

  const grid = el('div', { className: 'palette-grid', role: 'navigation', 'aria-label': 'Questions navigation' });

  const legend = el('div', { className: 'palette-legend' }, [
    el('div', { className: 'legend-item' }, [el('span', { className: 'legend-dot answered' }), 'Answered']),
    el('div', { className: 'legend-item' }, [el('span', { className: 'legend-dot unanswered' }), 'Unanswered']),
    el('div', { className: 'legend-item' }, [el('span', { className: 'legend-dot marked' }), 'Marked']),
    el('div', { className: 'legend-item' }, [el('span', { className: 'legend-dot current' }), 'Current'])
  ]);

  card.appendChild(header);
  card.appendChild(grid);
  card.appendChild(legend);

  function renderGrid(props) {
    const activeItems = props.items || items;
    const activeAnswers = props.answers || answers;
    const activeMarks = new Set(props.marks || marks);
    const activeBookmarks = new Set(props.bookmarks || bookmarks);
    const curIdx = props.currentIndex !== undefined ? props.currentIndex : currentIndex;

    let answeredCount = 0;

    if (grid.children.length === activeItems.length) {
      // Fast in-place DOM update: avoids destroying elements or resetting focus
      activeItems.forEach((item, idx) => {
        const qid = item.qid || item.id;
        const ans = activeAnswers[qid];
        const isAnswered = ans !== undefined && ans !== null && ans !== '';
        const isMarked = activeMarks.has(qid);
        const isBookmarked = activeBookmarks.has(qid);
        const isCurrent = idx === curIdx;

        if (isAnswered) answeredCount++;

        const classNames = ['palette-btn'];
        if (isCurrent) classNames.push('current');
        if (isAnswered) classNames.push('answered');
        if (isMarked) classNames.push('marked');
        if (isBookmarked) classNames.push('bookmarked');

        const btn = grid.children[idx];
        btn.className = classNames.join(' ');
        btn.setAttribute(
          'aria-label',
          `Question ${idx + 1}${isCurrent ? ' (Current)' : ''}${isAnswered ? ', Answered' : ''}${isMarked ? ', Marked for review' : ''}`
        );
      });
    } else {
      grid.innerHTML = '';
      activeItems.forEach((item, idx) => {
        const qid = item.qid || item.id;
        const ans = activeAnswers[qid];
        const isAnswered = ans !== undefined && ans !== null && ans !== '';
        const isMarked = activeMarks.has(qid);
        const isBookmarked = activeBookmarks.has(qid);
        const isCurrent = idx === curIdx;

        if (isAnswered) answeredCount++;

        const classNames = ['palette-btn'];
        if (isCurrent) classNames.push('current');
        if (isAnswered) classNames.push('answered');
        if (isMarked) classNames.push('marked');
        if (isBookmarked) classNames.push('bookmarked');

        const btn = el('button', {
          className: classNames.join(' '),
          type: 'button',
          'aria-label': `Question ${idx + 1}${isCurrent ? ' (Current)' : ''}${isAnswered ? ', Answered' : ''}${isMarked ? ', Marked for review' : ''}`,
          onClick: () => {
            if (typeof onSelectQuestion === 'function') {
              onSelectQuestion(idx);
            }
            card.classList.remove('open');
          }
        }, String(idx + 1));

        grid.appendChild(btn);
      });
    }

    const summaryEl = card.querySelector('#palette-summary');
    if (summaryEl) {
      summaryEl.textContent = `${answeredCount}/${activeItems.length} Answered`;
    }
  }

  renderGrid({ items, answers, marks, bookmarks, currentIndex });

  return {
    element: card,
    update(newProps) {
      renderGrid(newProps);
    },
    toggleMobile() {
      card.classList.toggle('open');
    }
  };
}

