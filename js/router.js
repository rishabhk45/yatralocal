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

    const handler = this.routes.get(hash) || this.routes.get('#/');
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
          <div class="container" style="padding: var(--space-8) 0;">
            <div class="card" style="border-color: var(--color-danger);">
              <h2>View Error</h2>
              <p>Could not render view for ${hash}.</p>
              <a href="#/" class="btn btn-primary">Return Home</a>
            </div>
          </div>
        `;
      }

      // Respectful focus management
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.setAttribute('tabindex', '-1');
        mainContent.focus({ preventScroll: false });
      }
    }
  }
}

export const router = new Router();
