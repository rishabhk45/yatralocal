/**
 * YatraLocal - Custom 404 Route (#/404)
 * Provides an accessible error state with clear recovery options.
 */

export function renderNotFoundView() {
  const container = document.createElement('div');
  container.className = 'container not-found-container';
  container.style.maxWidth = '640px';
  container.style.margin = '0 auto';
  container.style.padding = 'var(--space-8) var(--space-4) 100px var(--space-4)';

  container.innerHTML = `
    <div class="card flow" style="text-align: center; padding: var(--space-6); border: 2px solid var(--color-border);">
      <div style="font-size: 3.5rem; margin-bottom: var(--space-2);" aria-hidden="true">🗺️</div>
      <span class="badge" style="background: #FEE2E2; color: #991B1B; font-weight: 700;">404 ERROR</span>
      <h1 style="color: var(--color-text-main); margin: var(--space-2) 0;">Page Not Found</h1>
      <p style="color: var(--color-text-muted); font-size: var(--font-size-base); max-width: 440px; margin: 0 auto;">
        We couldn't locate this mountain trail or page. Let's get you back to planning authentic local travel.
      </p>

      <div style="display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; margin-top: var(--space-4);">
        <a href="#/" class="btn btn-primary">Return to Home</a>
        <a href="#/plan" class="btn btn-outline">Plan a Trip</a>
        <a href="#/sos" class="btn btn-outline" style="color: var(--color-danger); border-color: #FCA5A5;">Safety SOS</a>
      </div>
    </div>
  `;

  return container;
}
