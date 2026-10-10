/**
 * YatraLocal - Trip Preference Form View (#/plan)
 * Multi-input planning interface with destination selection, crowd level badges,
 * dual budget control (slider + number input), days stepper, travellers count,
 * travel mood chips (max 3), accessibility checkboxes, inline validation,
 * and automatic persistence to store before navigating to #/itinerary.
 */

import { store } from '../js/store.js';

export function renderPlanView() {
  const container = document.createElement('div');
  container.className = 'container';
  container.style.padding = 'var(--space-8) var(--space-4)';

  const state = store.getState();
  const currentPrefs = state.preferences || {};

  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <!-- Stepper Header -->
      <div class="stepper" aria-label="Trip planning step 1 of 4" style="margin-bottom: var(--space-8);">
        <div class="step-item active">
          <div class="step-number">1</div>
          <span class="step-label">1. Preferences</span>
        </div>
        <div class="step-item">
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

      <div class="card flow" style="padding: var(--space-8);">
        <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2);">
          <div>
            <h1 style="margin-bottom: var(--space-1); font-size: var(--font-size-2xl);">Customise Your Yatra</h1>
            <p style="color: var(--color-text-muted); margin: 0;">Tell us your pace, budget, and needs — we'll steer you away from crowds.</p>
          </div>
          <span class="badge badge-verified">Smart Pacing</span>
        </div>

        <form id="trip-plan-form" novalidate style="margin-top: var(--space-6);" class="flow">
          <!-- 1. Destination Selection with Crowd Level -->
          <div class="form-group">
            <label class="form-label" for="plan-destination">
              <strong>Select Destination</strong>
              <span style="color: var(--color-danger);">*</span>
            </label>
            <select id="plan-destination" class="form-select" required aria-describedby="destination-crowd-hint">
              <option value="manali" data-crowd="High">Manali, Himachal Pradesh (High Crowd in Town • Peaceful Hamlets)</option>
              <option value="jaipur" data-crowd="Moderate">Jaipur, Rajasthan (Moderate Crowd • Heritage Walking)</option>
              <option value="varanasi" data-crowd="High">Varanasi, Uttar Pradesh (Dense Ghats • Calm Morning Boats)</option>
              <option value="rishikesh" data-crowd="Moderate">Rishikesh, Uttarakhand (Moderate • Serene Upstream)</option>
              <option value="hampi" data-crowd="Low">Hampi, Karnataka (Low Crowd • Expansive Ruins)</option>
              <option value="munnar" data-crowd="Moderate">Munnar, Kerala (Moderate • Tea Estates & Spice Groves)</option>
            </select>
            <div id="destination-crowd-hint" class="flex gap-2" style="align-items: center; margin-top: var(--space-1);">
              <span id="crowd-badge-pill" class="badge badge-local">📍 High Crowd in Town • Peaceful Hamlets</span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">We suggest calm offbeat hamlets 5-15km away.</span>
            </div>
            <div class="form-error-msg" id="err-destination" style="display: none; color: var(--color-danger); font-size: var(--font-size-xs);"></div>
          </div>

          <!-- 2. Dual Budget Input (Slider + Number) -->
          <div class="form-group" style="background-color: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div class="flex-between" style="align-items: center;">
              <label class="form-label" for="plan-budget-input" style="margin: 0;">
                <strong>Estimated Budget (₹ INR)</strong>
              </label>
              <div class="flex" style="align-items: center; gap: var(--space-1);">
                <span style="font-weight: 700; color: var(--color-primary); font-size: var(--font-size-md);">₹</span>
                <input type="number" id="plan-budget-input" class="form-input" min="3000" max="100000" step="500" value="${currentPrefs.budget || 8000}" style="width: 130px; font-weight: 700; text-align: right;" />
              </div>
            </div>
            <input type="range" id="plan-budget-slider" min="3000" max="100000" step="500" value="${currentPrefs.budget || 8000}" style="width: 100%; margin-top: var(--space-3); cursor: pointer;" aria-label="Budget Slider" />
            <div class="flex-between" style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-1);">
              <span>₹3,000 (Backpacker/Pilgrim)</span>
              <span>₹1,00,000 (Luxury Heritage)</span>
            </div>
            <div class="form-error-msg" id="err-budget" style="display: none; color: var(--color-danger); font-size: var(--font-size-xs);"></div>
          </div>

          <!-- 3. Days & Travellers -->
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4);">
            <!-- Days Stepper -->
            <div class="form-group">
              <label class="form-label">
                <strong>Trip Duration</strong>
              </label>
              <div class="flex" style="align-items: center; gap: var(--space-2);">
                <button type="button" id="btn-decrease-days" class="btn btn-ghost" style="min-width: 44px; padding: 0; font-size: 1.25rem;" aria-label="Decrease days">-</button>
                <div style="flex: 1; text-align: center; background-color: var(--color-bg-surface); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-3); font-weight: 700; font-size: var(--font-size-md);">
                  <span id="display-days">${currentPrefs.days || 3}</span> Days
                </div>
                <button type="button" id="btn-increase-days" class="btn btn-ghost" style="min-width: 44px; padding: 0; font-size: 1.25rem;" aria-label="Increase days">+</button>
              </div>
              <span class="form-helper">Recommended: 2 to 5 days for a relaxed trip</span>
            </div>

            <!-- Travellers Count -->
            <div class="form-group">
              <label class="form-label" for="plan-travellers">
                <strong>Number of Travellers</strong>
              </label>
              <select id="plan-travellers" class="form-select">
                <option value="1">Solo Traveller (1 person)</option>
                <option value="2" selected>Couple / 2 Travellers</option>
                <option value="3">Small Family / Group (3 people)</option>
                <option value="4">Family (4 people)</option>
                <option value="6">Large Family / Pilgrim Group (5-8 people)</option>
              </select>
              <span class="form-helper">Helps match appropriate room size & guide</span>
            </div>
          </div>

          <!-- 4. Travel Mood Chips (Multi-select, max 3) -->
          <div class="form-group">
            <div class="flex-between">
              <label class="form-label" style="margin: 0;">
                <strong>Travel Mood / Vibe</strong> (Select up to 3)
              </label>
              <span id="mood-counter" style="font-size: var(--font-size-xs); color: var(--color-text-muted);">1/3 selected</span>
            </div>
            <div class="flex gap-2" id="mood-chips-container" style="flex-wrap: wrap; margin-top: var(--space-2);">
              <button type="button" class="chip active" data-mood="Relaxed" aria-pressed="true">🌿 Relaxed & Slow</button>
              <button type="button" class="chip" data-mood="Adventure" aria-pressed="false">🧗 Adventure & Trekking</button>
              <button type="button" class="chip" data-mood="Spiritual" aria-pressed="false">🛕 Spiritual / Pilgrimage</button>
              <button type="button" class="chip" data-mood="Cultural" aria-pressed="false">🎨 Cultural & Crafts</button>
              <button type="button" class="chip" data-mood="Nature" aria-pressed="false">🌲 Nature & Orchards</button>
              <button type="button" class="chip" data-mood="Family" aria-pressed="false">👨‍👩‍👧 Family Friendly</button>
              <button type="button" class="chip" data-mood="Foodie" aria-pressed="false">🍲 Local Food & Cafes</button>
            </div>
            <div class="form-error-msg" id="err-mood" style="display: none; color: var(--color-danger); font-size: var(--font-size-xs); margin-top: var(--space-1);"></div>
          </div>

          <!-- 5. Accessibility Needs Checkboxes -->
          <div class="form-group" style="background-color: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-md); border: 1.5px solid var(--color-border);">
            <label class="form-label" style="margin-bottom: var(--space-2); color: var(--color-primary);">
              ♿ Inclusive & Accessibility Needs
            </label>
            <div class="flex gap-4" style="flex-direction: column;">
              <label class="flex gap-3" style="align-items: center; cursor: pointer;">
                <input type="checkbox" id="acc-senior" style="width: 20px; height: 20px;" />
                <div>
                  <strong>Senior-friendly:</strong> Ground floor rooms, minimal stairs, slow pacing
                </div>
              </label>
              <label class="flex gap-3" style="align-items: center; cursor: pointer;">
                <input type="checkbox" id="acc-walking" style="width: 20px; height: 20px;" />
                <div>
                  <strong>Minimal walking:</strong> Easy vehicle access, flat walking pathways
                </div>
              </label>
              <label class="flex gap-3" style="align-items: center; cursor: pointer;">
                <input type="checkbox" id="acc-wheelchair" style="width: 20px; height: 20px;" />
                <div>
                  <strong>Wheelchair assistance:</strong> Ramp access and dedicated assistance
                </div>
              </label>
            </div>
          </div>

          <!-- Submit Button -->
          <div style="padding-top: var(--space-4); border-top: 1px solid var(--color-border);" class="flex-between" style="flex-wrap: wrap; gap: var(--space-3);">
            <a href="#/" class="btn btn-ghost">← Back</a>
            <button type="submit" id="btn-submit-plan" class="btn btn-primary" style="font-size: var(--font-size-md); padding: var(--space-3) var(--space-8);">
              ✨ Generate Itinerary ➔
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Bind Interactions & Validation after render
  setTimeout(() => {
    bindPlanFormInteractions(container);
  }, 0);

  return container;
}

function bindPlanFormInteractions(container) {
  const form = container.querySelector('#trip-plan-form');
  const destSelect = container.querySelector('#plan-destination');
  const crowdPill = container.querySelector('#crowd-badge-pill');
  const budgetInput = container.querySelector('#plan-budget-input');
  const budgetSlider = container.querySelector('#plan-budget-slider');
  const displayDays = container.querySelector('#display-days');
  const btnDecDays = container.querySelector('#btn-decrease-days');
  const btnIncDays = container.querySelector('#btn-increase-days');
  const moodContainer = container.querySelector('#mood-chips-container');
  const moodCounter = container.querySelector('#mood-counter');
  let selectedDays = parseInt(displayDays.textContent, 10) || 3;

  // Destination crowd pill update
  destSelect.addEventListener('change', () => {
    const selectedOption = destSelect.options[destSelect.selectedIndex];
    const text = selectedOption.textContent;
    if (text.includes('High Crowd')) {
      crowdPill.className = 'badge badge-danger';
      crowdPill.textContent = '⚠️ Dense Tourist Center • Peaceful Hamlets Nearby';
    } else if (text.includes('Moderate')) {
      crowdPill.className = 'badge badge-local';
      crowdPill.textContent = '📍 Moderate Crowds • Heritage Enclaves';
    } else {
      crowdPill.className = 'badge badge-verified';
      crowdPill.textContent = '✓ Low Crowds • Open & Serene';
    }
  });

  // Sync budget slider and numeric input
  budgetSlider.addEventListener('input', () => {
    budgetInput.value = budgetSlider.value;
  });
  budgetInput.addEventListener('input', () => {
    let val = parseInt(budgetInput.value, 10);
    if (!isNaN(val)) {
      if (val < 3000) val = 3000;
      if (val > 100000) val = 100000;
      budgetSlider.value = val;
    }
  });

  // Days stepper
  btnDecDays.addEventListener('click', () => {
    if (selectedDays > 1) {
      selectedDays -= 1;
      displayDays.textContent = selectedDays;
    }
  });
  btnIncDays.addEventListener('click', () => {
    if (selectedDays < 10) {
      selectedDays += 1;
      displayDays.textContent = selectedDays;
    }
  });

  // Mood chips selection (max 3)
  const chips = moodContainer.querySelectorAll('.chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const activeChips = moodContainer.querySelectorAll('.chip.active');
      const isAlreadyActive = chip.classList.contains('active');

      if (!isAlreadyActive && activeChips.length >= 3) {
        window.YatraApp.showToast('You can select a maximum of 3 travel moods.');
        return;
      }

      chip.classList.toggle('active');
      chip.setAttribute('aria-pressed', String(!isAlreadyActive));

      const updatedCount = moodContainer.querySelectorAll('.chip.active').length;
      moodCounter.textContent = `${updatedCount}/3 selected`;
    });
  });

  // Form submit handler with inline validation
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;

    // Validate budget
    const budgetVal = parseInt(budgetInput.value, 10);
    const errBudget = container.querySelector('#err-budget');
    if (isNaN(budgetVal) || budgetVal < 3000 || budgetVal > 100000) {
      errBudget.textContent = 'Please enter a realistic trip budget between ₹3,000 and ₹1,00,000.';
      errBudget.style.display = 'block';
      isValid = false;
    } else {
      errBudget.style.display = 'none';
    }

    // Validate mood
    const activeMoods = Array.from(moodContainer.querySelectorAll('.chip.active')).map((c) => c.dataset.mood);
    const errMood = container.querySelector('#err-mood');
    if (activeMoods.length === 0) {
      errMood.textContent = 'Please choose at least 1 travel mood to customize your pace.';
      errMood.style.display = 'block';
      isValid = false;
    } else {
      errMood.style.display = 'none';
    }

    if (!isValid) return;

    // Collect accessibility options
    const accessibilityNeeds = {
      seniorFriendly: container.querySelector('#acc-senior').checked,
      minimalWalking: container.querySelector('#acc-walking').checked,
      wheelchairAccess: container.querySelector('#acc-wheelchair').checked
    };

    // Save preferences to state store
    const preferences = {
      destination: destSelect.value,
      destinationName: destSelect.options[destSelect.selectedIndex].text.split('(')[0].trim(),
      budget: budgetVal,
      days: selectedDays,
      travellers: parseInt(container.querySelector('#plan-travellers').value, 10) || 2,
      moods: activeMoods,
      accessibility: accessibilityNeeds
    };

    store.setState({ preferences });
    window.YatraApp.showToast('Preferences saved! Crafting your crowd-smart itinerary...');

    // Route to itinerary view
    setTimeout(() => {
      window.location.hash = '#/itinerary';
    }, 300);
  });
}
