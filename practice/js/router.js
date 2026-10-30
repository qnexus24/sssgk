/**
 * practice/js/router.js
 * Hash-based router per 05_ARCHITECTURE.md with view lifecycle cleanup (destroy()).
 */

export class Router {
  constructor(container, getContext = () => ({})) {
    this.container = container;
    this.getContext = getContext;
    this.routes = [];
    this.currentView = null;

    this.handleHashChange = this.handleHashChange.bind(this);
    window.addEventListener('hashchange', this.handleHashChange);
  }

  /**
   * Registers a route pattern.
   * Pattern e.g. '#/', '#/setup', '#/test', '#/result/:id', '#/review/:id', '#/history'
   * @param {string} pattern
   * @param {{ render: (container: HTMLElement, ctx: object) => ({ destroy?: () => void } | void) }} viewModule
   */
  register(pattern, viewModule) {
    const paramNames = [];
    const regexSource = '^' + pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }) + '$';

    this.routes.push({
      pattern,
      regex: new RegExp(regexSource),
      paramNames,
      viewModule
    });
  }

  /**
   * Navigates to a hash path.
   * @param {string} hash
   */
  navigate(hash) {
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      this.handleHashChange();
    }
  }

  /**
   * Resolves current location.hash and renders matching view.
   */
  handleHashChange() {
    let hash = window.location.hash.trim();
    if (!hash || hash === '#') {
      hash = '#/';
    }

    let match = null;
    let matchedRoute = null;
    let params = {};

    for (const route of this.routes) {
      const m = hash.match(route.regex);
      if (m) {
        match = m;
        matchedRoute = route;
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(m[i + 1]);
        });
        break;
      }
    }

    if (!matchedRoute) {
      // Default fallback to home
      window.location.hash = '#/';
      return;
    }

    // Clean up current view lifecycle
    if (this.currentView && typeof this.currentView.destroy === 'function') {
      try {
        this.currentView.destroy();
      } catch (err) {
        console.error('Error destroying previous view:', err);
      }
    }
    this.currentView = null;

    // Clear container
    this.container.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Render new view
    const ctx = {
      ...this.getContext(),
      router: this,
      params,
      hash
    };

    try {
      const viewResult = matchedRoute.viewModule.render(this.container, ctx);
      if (viewResult && typeof viewResult.destroy === 'function') {
        this.currentView = viewResult;
      }
    } catch (err) {
      console.error('Render error in view:', matchedRoute.pattern, err);
      this.container.innerHTML = `
        <div class="wrap" style="padding: 40px 0;">
          <div class="notice notice-warn">
            <b>Failed to load screen:</b> ${err.message}
          </div>
          <a href="#/" class="btn btn-navy">Return Home</a>
        </div>
      `;
    }
  }

  start() {
    this.handleHashChange();
  }

  destroy() {
    window.removeEventListener('hashchange', this.handleHashChange);
    if (this.currentView && typeof this.currentView.destroy === 'function') {
      this.currentView.destroy();
    }
  }
}

