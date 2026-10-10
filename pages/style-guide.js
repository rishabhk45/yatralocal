/**
 * YatraLocal - Style Guide View (#/styleguide)
 * Comprehensive display of design tokens, colors, typography, buttons,
 * form inputs, cards, badges, chips, tabs, stepper, modal, toast, and skeletons.
 */

export function renderStyleGuide() {
  const container = document.createElement('div');
  container.className = 'container';
  container.style.padding = 'var(--space-8) var(--space-4)';

  container.innerHTML = `
    <header style="margin-bottom: var(--space-8);">
      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-3);">
        <div>
          <h1>Design System & Component Library</h1>
          <p style="color: var(--color-text-muted);">
            WCAG AA compliant design tokens and components built for India-first accessibility.
          </p>
        </div>
        <div>
          <span class="badge badge-verified">Phase 1 Active</span>
        </div>
      </div>
    </header>

    <!-- Colors & Palette -->
    <section class="card flow" style="margin-bottom: var(--space-8);">
      <h2>1. Brand Palette & Contrast Verification</h2>
      <p>All combinations pass WCAG AA standards with minimum contrast ratio 4.5:1 for body and 3:1 for large text.</p>
      
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
        <div style="background-color: var(--color-primary); color: white; padding: var(--space-4); border-radius: var(--radius-md);">
          <strong>Deep Teal (Primary)</strong>
          <div>#0D5C5B</div>
          <small>Contrast: 7.2:1 (AAA)</small>
        </div>
        <div style="background-color: var(--color-accent); color: white; padding: var(--space-4); border-radius: var(--radius-md);">
          <strong>Marigold Accent</strong>
          <div>#C85A17</div>
          <small>High Contrast Terracotta</small>
        </div>
        <div style="background-color: var(--color-bg); color: var(--color-text-main); padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <strong>Khadi Sand (Base BG)</strong>
          <div>#FBF8F3</div>
          <small>Slate Text: 13.8:1 (AAA)</small>
        </div>
        <div style="background-color: var(--color-danger); color: white; padding: var(--space-4); border-radius: var(--radius-md);">
          <strong>SOS Crimson</strong>
          <div>#C5221F</div>
          <small>Emergency Signal</small>
        </div>
      </div>
    </section>

    <!-- Buttons -->
    <section class="card flow" style="margin-bottom: var(--space-8);">
      <h2>2. Interactive Buttons</h2>
      <p>Every interactive button enforces a minimum 44px tap target for touch devices and keyboard accessibility.</p>
      
      <div class="flex gap-3" style="flex-wrap: wrap; align-items: center;">
        <button type="button" class="btn btn-primary">Primary Action</button>
        <button type="button" class="btn btn-secondary">Secondary Action</button>
        <button type="button" class="btn btn-ghost">Ghost Action</button>
        <button type="button" class="btn btn-danger">Emergency SOS</button>
        <button type="button" class="btn btn-primary" disabled>Disabled State</button>
      </div>
    </section>

    <!-- Badges & Chips -->
    <section class="card flow" style="margin-bottom: var(--space-8);">
      <h2>3. Badges & Chips</h2>
      <p>System status badges and filter chips.</p>
      
      <div class="flex gap-3" style="flex-wrap: wrap; align-items: center;">
        <span class="badge badge-verified">✓ Verified Local</span>
        <span class="badge badge-local">📍 Offbeat Homestay</span>
        <span class="badge badge-demo">Demo / Simulated</span>
        <span class="badge badge-danger">High Crowd Alert</span>
        <span class="stat-placeholder">[Add verified statistic + source]</span>
      </div>

      <div style="margin-top: var(--space-4);" class="flex gap-2" style="flex-wrap: wrap;">
        <button type="button" class="chip active" aria-pressed="true">All Stays</button>
        <button type="button" class="chip" aria-pressed="false">Seniors Friendly</button>
        <button type="button" class="chip" aria-pressed="false">₹1000 - ₹2500 / night</button>
        <button type="button" class="chip" aria-pressed="false">Spiritual / Peaceful</button>
      </div>
    </section>

    <!-- Form Inputs -->
    <section class="card flow" style="margin-bottom: var(--space-8);">
      <h2>4. Form Controls</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
        <div class="form-group">
          <label class="form-label" for="sg-destination">Destination</label>
          <input type="text" id="sg-destination" class="form-input" value="Manali, Himachal Pradesh" />
          <span class="form-helper">Explore peaceful local villages nearby</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="sg-budget">Budget (INR)</label>
          <input type="number" id="sg-budget" class="form-input" value="8000" />
          <span class="form-helper">Estimated budget for whole trip</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="sg-mood">Travel Mood</label>
          <select id="sg-mood" class="form-select">
            <option value="peaceful">Peaceful & Offbeat</option>
            <option value="spiritual">Spiritual & Temple Yatra</option>
            <option value="heritage">Heritage & Crafts</option>
            <option value="adventure">Trekking & Nature</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Stepper & Tabs -->
    <section class="card flow" style="margin-bottom: var(--space-8);">
      <h2>5. Stepper & Tabs</h2>
      
      <div class="stepper" aria-label="Trip Planning Stepper">
        <div class="step-item completed">
          <div class="step-number">✓</div>
          <span class="step-label">1. Preferences</span>
        </div>
        <div class="step-item active">
          <div class="step-number">2</div>
          <span class="step-label">2. Itinerary</span>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <span class="step-label">3. Stay & Guide</span>
        </div>
        <div class="step-item">
          <div class="step-number">4</div>
          <span class="step-label">4. Confirm</span>
        </div>
      </div>

      <div class="tab-list" role="tablist">
        <button class="tab-button active" role="tab" aria-selected="true">Day 1: Arrival & Village Walk</button>
        <button class="tab-button" role="tab" aria-selected="false">Day 2: Monastery & Apple Orchards</button>
        <button class="tab-button" role="tab" aria-selected="false">Day 3: Local Craft & Riverside</button>
      </div>
    </section>

    <!-- Skeleton Loader -->
    <section class="card flow" style="margin-bottom: var(--space-8);">
      <h2>6. Skeleton Loader (Loading State)</h2>
      <div class="skeleton skeleton-rect"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text" style="width: 80%;"></div>
      <div class="skeleton skeleton-text" style="width: 60%;"></div>
    </section>

    <!-- Interactive Elements Trigger (Modal & Toast) -->
    <section class="card flow" style="margin-bottom: var(--space-8);">
      <h2>7. Interactive Modals & Toast Alerts</h2>
      <div class="flex gap-3">
        <button type="button" id="trigger-sample-modal" class="btn btn-primary">Open Sample Modal</button>
        <button type="button" id="trigger-sample-toast" class="btn btn-secondary">Trigger Toast Message</button>
      </div>
    </section>
  `;

  // Bind interactive demo handlers
  setTimeout(() => {
    const modalBtn = container.querySelector('#trigger-sample-modal');
    if (modalBtn) {
      modalBtn.addEventListener('click', () => {
        window.YatraApp?.openModal({
          title: 'Sample Component Modal',
          content: '<p>This is a reusable, accessible modal dialog with focus trapping and ESC key dismissal.</p>'
        });
      });
    }

    const toastBtn = container.querySelector('#trigger-sample-toast');
    if (toastBtn) {
      toastBtn.addEventListener('click', () => {
        window.YatraApp?.showToast('Local homestay saved to your shortlist!');
      });
    }
  }, 0);

  return container;
}
