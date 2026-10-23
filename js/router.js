/**
 * YatraLocal - Hash-based Client Router
 * Handles routing across #/, #/plan, #/itinerary, #/stays, #/booking, #/owner, #/saral, #/styleguide.
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
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

  _handleRouteChange() {
    let hash = window.location.hash || '#/';
    if (!hash.startsWith('#/')) {
      hash = '#/';
    }

    this.currentRoute = hash;

    // Update active nav links in header
    document.querySelectorAll('.nav-link').forEach((link) => {
      if (link.getAttribute('href') === hash) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    let handler = this.routes.get(hash);
    let is404 = false;

    // Check if route exists, otherwise render custom 404
    if (!handler) {
      if (this.routes.has('#/404')) {
        handler = this.routes.get('#/404');
        is404 = true;
      } else {
        handler = this.routes.get('#/');
      }
    }

    if (this.appContainer && handler) {
      this.appContainer.innerHTML = '';
      try {
        const content = handler();
        if (typeof content === 'string') {
          this.appContainer.innerHTML = content;
        } else if (content instanceof Node) {
          this.appContainer.appendChild(content);
        }
      } catch (err) {
        console.error(`Error rendering route ${hash}:`, err);
        this.appContainer.innerHTML = `
          <div class="container" style="padding: var(--space-8) var(--space-4);">
            <div class="card flow" style="border-color: var(--color-danger); max-width: 600px; margin: 0 auto;">
              <h1 style="color: var(--color-danger);">View Error</h1>
              <p>Could not render view for ${hash}.</p>
              <a href="#/" class="btn btn-primary">Return Home</a>
            </div>
          </div>
        `;
      }

      // Scroll to top
      window.scrollTo(0, 0);

      // Focus management: move focus directly to the first <h1> on the new page
      requestAnimationFrame(() => {
        const h1 = this.appContainer.querySelector('h1');
        if (h1) {
          h1.setAttribute('tabindex', '-1');
          h1.focus({ preventScroll: true });
          document.title = `YatraLocal - ${h1.textContent.trim().split('\n')[0]}`;
        } else {
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            mainContent.setAttribute('tabindex', '-1');
            mainContent.focus({ preventScroll: true });
          }
        }
      });
    }
  }
}

export const router = new Router();
