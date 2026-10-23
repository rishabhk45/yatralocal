/**
 * YatraLocal - Hash-based Client Router (/js/router.js)
 * Handles routing across #/, #/plan, #/itinerary, #/stays, #/booking, #/owner, #/saral, #/sos, #/styleguide.
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.currentParams = {};
    this.appContainer = null;
    
    window.addEventListener('hashchange', () => this._handleRouteChange());
  }

  init(containerId = 'app-view') {
    this.appContainer = document.getElementById(containerId);
    this._handleRouteChange();
  }

  register(path, viewHandler) {
    this.routes.set(path, viewHandler);
  }

  navigate(path) {
    window.location.hash = path;
  }

  getQueryParams() {
    return { ...this.currentParams };
  }

  _parseQueryParams(queryString) {
    const params = {};
    if (!queryString) return params;
    try {
      const searchParams = new URLSearchParams(queryString);
      for (const [key, val] of searchParams.entries()) {
        params[key] = val;
      }
    } catch (_) {}
    return params;
  }

  _handleRouteChange() {
    let rawHash = window.location.hash || '';

    // If hash is missing, empty, or doesn't start with '#/', normalize to '#/'
    if (!rawHash || rawHash === '#' || !rawHash.startsWith('#/')) {
      rawHash = '#/';
      try {
        if (window.location.hash !== '#/') {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '#/');
          } else {
            window.location.hash = '#/';
          }
        }
      } catch (_) {}
    }

    // Split base route from optional query string (e.g. #/plan?destination=harsil)
    const [baseRoute, queryString] = rawHash.split('?');
    this.currentRoute = baseRoute;
    this.currentParams = this._parseQueryParams(queryString);

    // Update active nav links in header using baseRoute
    document.querySelectorAll('.nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === baseRoute || (href === '#/' && (baseRoute === '#/' || !baseRoute))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    let handler = this.routes.get(baseRoute);
    let routeParam = null;

    // Dynamic parameterized routes (e.g. #/place/:placeKey)
    if (!handler && baseRoute.startsWith('#/place/')) {
      handler = this.routes.get('#/place');
      routeParam = decodeURIComponent(baseRoute.substring('#/place/'.length));
    }

    // Fallback to 404 handler or root landing
    if (!handler) {
      if (this.routes.has('#/404')) {
        handler = this.routes.get('#/404');
      } else {
        handler = this.routes.get('#/');
      }
    }

    if (this.appContainer && handler) {
      this.appContainer.innerHTML = '';
      try {
        const content = handler(routeParam);
        if (content && typeof content.then === 'function') {
          content.then((resolved) => {
            this._mountView(resolved, baseRoute);
          }).catch((err) => {
            this._renderErrorView(baseRoute, err);
          });
        } else {
          this._mountView(content, baseRoute);
        }
      } catch (err) {
        this._renderErrorView(baseRoute, err);
      }
    }
  }

  _mountView(content, route) {
    if (!this.appContainer) return;
    this.appContainer.innerHTML = '';
    if (typeof content === 'string') {
      this.appContainer.innerHTML = content;
    } else if (content instanceof Node) {
      this.appContainer.appendChild(content);
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Accessible focus management: shift focus to first h1 on the new page
    requestAnimationFrame(() => {
      const h1 = this.appContainer.querySelector('h1');
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        if (typeof h1.focus === 'function') {
          h1.focus({ preventScroll: true });
        }
        const text = (h1.textContent || '').trim().split('\n')[0];
        if (text) {
          document.title = `YatraLocal - ${text}`;
        }
      } else {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.setAttribute('tabindex', '-1');
          if (typeof mainContent.focus === 'function') {
            mainContent.focus({ preventScroll: true });
          }
        }
      }
    });
  }

  _renderErrorView(route, err) {
    console.error(`Error rendering view for ${route}:`, err);
    if (!this.appContainer) return;
    this.appContainer.innerHTML = `
      <div class="container" style="padding: var(--space-8) var(--space-4);">
        <div class="card flow" style="border-color: var(--color-danger); max-width: 600px; margin: 0 auto;">
          <h1 style="color: var(--color-danger);">View Error</h1>
          <p>Could not render view for ${route}.</p>
          <pre style="background: #FEE2E2; color: #991B1B; padding: 12px; border-radius: 6px; font-size: 0.85rem; overflow-x: auto;">${err ? (err.stack || err.message || err) : 'Unknown error'}</pre>
          <a href="#/" class="btn btn-primary">Return Home</a>
        </div>
      </div>
    `;
  }
}

export const router = new Router();
