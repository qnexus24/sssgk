/**
 * practice/js/ui/home.js
 * Practice Home Screen (#/)
 * Displays a grid of owner-configured preset test cards.
 * Clicking "Start Test" on any preset immediately generates and launches that test.
 */

import { el, showModal } from './components.js';
import { store } from '../store.js';
import { availability, generateTest } from '../engine/index.js';
import { PRESETS } from '../config.js';

export const homeView = {
  render(container, ctx) {
    const bank = ctx.bank;
    const avail = availability(bank);
    const activeTest = store.getActiveTest();
    const attempts = store.getAttempts();

    // Helper to immediately start a test from a preset configuration
    const startPresetTest = (preset) => {
      const history = {
        seenIds: store.getSeenIds(),
        topicStats: store.getTopicStats()
      };
      const hasHistory = Object.keys(history.topicStats || {}).length > 0;

      const clampedSections = preset.sections.map(s => ({
        key: s.key,
        count: avail.clamp(s.key, s.count)
      }));

      const test = generateTest({
        sections: clampedSections,
        mode: hasHistory ? 'smart' : 'random',
        config: {
          timeLimitMinutes: preset.timeMinutes,
          markingScheme: preset.marking || 'neet',
          includeGenerated: Boolean(preset.includeGenerated)
        },
        markingScheme: preset.marking || 'neet',
        timeLimitMinutes: preset.timeMinutes,
        includeGenerated: Boolean(preset.includeGenerated),
        history,
        bank
      });

      test.config.presetId = preset.id;
      test.config.presetName = preset.name;

      const now = Date.now();
      const endsAt = preset.timeMinutes > 0 ? now + (preset.timeMinutes * 60 * 1000) : 0;

      store.saveActiveTest({
        test,
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
    };

    // Hero Section
    const heroSection = el('section', { className: 'hero-band' }, [
      el('div', { className: 'wrap home-hero' }, [
        el('span', { className: 'kicker' }, 'Interactive Practice Lab'),
        el('h1', {}, 'NEET-Style Practice & Cognitive Drills'),
        el('p', {}, 'Select a practice test preset below to begin immediately. Every test generates fresh questions with smart adaptive calibration.'),
        el('div', { style: 'display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; align-items: center;' }, [
          el('a', { href: '#/history', className: 'btn btn-outline-white btn-lg' }, 'My History')
        ])
      ])
    ]);

    const contentWrap = el('div', { className: 'wrap', style: 'padding-top: 20px;' });

    // Resume Active Test Banner if present
    if (activeTest && activeTest.test && Array.isArray(activeTest.test.items)) {
      const remainingSec = activeTest.endsAt ? Math.max(0, Math.ceil((activeTest.endsAt - Date.now()) / 1000)) : null;
      const isExpired = remainingSec !== null && remainingSec <= 0;

      const resumeBanner = el('div', { className: 'resume-banner' }, [
        el('div', { className: 'resume-info' }, [
          el('h3', {}, isExpired ? 'Test Ready for Submission' : 'In-Progress Practice Test Found'),
          el('p', {}, `${activeTest.test.items.length} questions • Started: ${new Date(activeTest.startedAt).toLocaleTimeString()}${remainingSec !== null ? ` • Time left: ${Math.floor(remainingSec / 60)}m` : ''}`)
        ]),
        el('div', { className: 'resume-actions' }, [
          el('a', { href: '#/test', className: 'btn btn-gold' }, isExpired ? 'Submit Now' : 'Resume Test →'),
          el('button', {
            type: 'button',
            className: 'btn btn-outline-white',
            onClick: () => {
              showModal({
                title: 'Discard Active Test?',
                body: 'Are you sure you want to discard this test? All unsaved progress will be lost.',
                confirmText: 'Discard Test',
                cancelText: 'Keep Test',
                onConfirm: () => {
                  store.clearActiveTest();
                  ctx.router.navigate('#/');
                }
              });
            }
          }, 'Discard')
        ])
      ]);
      contentWrap.appendChild(resumeBanner);
    }

    // Presets Grid Section Title
    const sectionHeader = el('div', { className: 'home-section-title' }, [
      el('div', {}, [
        el('h2', {}, 'Practice Presets'),
        el('p', { style: 'color: var(--muted); font-size: 0.95rem; margin: 0;' },
          'Instant tests generated with randomized questions and balanced topic distribution.'
        )
      ])
    ]);
    contentWrap.appendChild(sectionHeader);

    // Presets Cards Grid
    const presetsGrid = el('div', { className: 'preset-grid' });

    PRESETS.forEach(preset => {
      const card = el('div', {
        className: 'preset-card',
        style: preset.recommended ? 'border-color: var(--gold); box-shadow: 0 4px 16px rgba(230,175,46,0.18);' : ''
      });

      // Compute clamped count and metadata
      const clampedCount = preset.sections.reduce((sum, s) => sum + avail.clamp(s.key, s.count), 0);
      const subjectNames = preset.sections.map(s => s.key).join(', ');
      const timeStr = preset.timeMinutes > 0 ? `${preset.timeMinutes} min` : 'Untimed';

      // Card Header
      const headerRow = el('div', { className: 'preset-card-header' }, [
        el('span', { className: 'pill pill-navy' }, preset.tag || 'Drill'),
        preset.recommended ? el('span', { className: 'pill pill-gold' }, 'Recommended ✦') : null
      ]);

      // Card Body
      const bodyEl = el('div', {}, [
        el('h3', { className: 'preset-title' }, preset.title || preset.name),
        el('p', { className: 'preset-desc' }, preset.desc)
      ]);

      // Card Metadata
      const metaRow = el('div', { className: 'preset-meta' }, [
        el('span', { style: 'font-weight: 600; color: var(--navy);' }, `${clampedCount} Qs`),
        el('span', {}, '•'),
        el('span', {}, timeStr),
        el('span', {}, '•'),
        el('span', { style: 'color: var(--muted);' }, subjectNames)
      ]);

      // Immediate Start Action Button
      const actionBtn = el('button', {
        type: 'button',
        className: `btn ${preset.recommended ? 'btn-gold' : 'btn-navy'}`,
        style: 'margin-top: 14px; width: 100%;',
        onClick: () => startPresetTest(preset)
      }, 'Start Test →');

      card.appendChild(headerRow);
      card.appendChild(bodyEl);
      card.appendChild(metaRow);
      card.appendChild(actionBtn);

      presetsGrid.appendChild(card);
    });

    contentWrap.appendChild(presetsGrid);

    // Quick Stats / History Footer Banner
    if (attempts.length > 0) {
      const latest = attempts[0];
      const statsBanner = el('div', { className: 'card', style: 'margin-bottom: 40px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;' }, [
        el('div', {}, [
          el('span', { className: 'kicker' }, 'Recent Progress'),
          el('h3', { style: 'margin: 4px 0;' }, `Last Attempt: ${latest.score}/${latest.max} (${Math.round((latest.score / (latest.max || 1)) * 100)}%)`),
          el('p', { style: 'color: var(--muted); font-size: 0.9rem; margin: 0;' }, `Completed on ${new Date(latest.finishedAt).toLocaleDateString()} • ${attempts.length} total tests taken`)
        ]),
        el('a', { href: '#/history', className: 'btn btn-outline' }, 'View All Past Attempts →')
      ]);
      contentWrap.appendChild(statsBanner);
    }

    container.appendChild(heroSection);
    container.appendChild(contentWrap);

    return {
      destroy() { }
    };
  }
};
