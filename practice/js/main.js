/**
 * practice/js/main.js
 * Application entry point and router bootstrapper.
 */

import { Router } from './router.js';
import { homeView } from './ui/home.js';
import { testView } from './ui/test.js';
import { resultView } from './ui/result.js';
import { reviewView } from './ui/review.js';
import { historyView } from './ui/history.js';

const BANK_VERSION = '1.0';

async function bootstrap() {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container #app not found in DOM.');
    return;
  }

  // Show loading indicator while questions.json loads
  appContainer.innerHTML = `
    <div class="wrap" style="padding: 80px 0; text-align: center;">
      <span class="pill pill-gold" style="font-size: 0.9rem; padding: 6px 16px;">Loading Practice Lab...</span>
    </div>
  `;

  let bank = [];
  try {
    const res = await fetch('data/questions.json');
    if (!res.ok) {
      throw new Error(`Failed to fetch questions.json: HTTP ${res.status}`);
    }
    bank = await res.json();
    bank.bankVersion = BANK_VERSION;
  } catch (err) {
    console.error('Failed to load question bank:', err);
    appContainer.innerHTML = `
      <div class="wrap" style="padding: 60px 0;">
        <div class="notice notice-warn">
          <b>Unable to load questions data:</b> ${err.message}
        </div>
        <p>Please ensure practice/data/questions.json is available.</p>
        <button class="btn btn-navy" onclick="window.location.reload()">Reload Application</button>
      </div>
    `;
    return;
  }

  // Initialize router with application context
  const getContext = () => ({
    bank,
    bankVersion: BANK_VERSION
  });

  const router = new Router(appContainer, getContext);

  // Register all active routes
  router.register('#/', homeView);
  router.register('#/test', testView);
  router.register('#/result/:id', resultView);
  router.register('#/review/:id', reviewView);
  router.register('#/history', historyView);

  // Start routing
  router.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
