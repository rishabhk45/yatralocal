/**
 * YatraLocal - Trip Preference Form View (#/plan)
 * Multi-input planning interface with destination selection, crowd level badges,
 * dual budget control (slider + number input), days stepper, travellers count,
 * travel mood chips (max 3), accessibility checkboxes, inline validation,
 * and automatic persistence to store before navigating to #/itinerary.
 */

import { store } from '../js/store.js';
import { loadSeasonsData, getSeason, renderSeasonBadgeHTML } from '../js/season.js';
import { searchPlacesInIndia } from '../js/places.js';

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
            <div class="flex-between" style="align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 4px;">
              <label class="form-label" for="plan-destination" style="margin: 0;">
                <strong>Select Destination</strong>
                <span style="color: var(--color-danger);">*</span>
              </label>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">6 Curated Cultural Gems</span>
            </div>

            <select id="plan-destination" class="form-select" required aria-describedby="destination-crowd-hint">
              <option value="manali" data-crowd="High">Manali, Himachal Pradesh (High Crowd in Town • Peaceful Hamlets)</option>
              <option value="jaipur" data-crowd="Moderate">Jaipur, Rajasthan (Moderate Crowd • Heritage Walking)</option>
              <option value="varanasi" data-crowd="High">Varanasi, Uttar Pradesh (Dense Ghats • Calm Morning Boats)</option>
              <option value="rishikesh" data-crowd="Moderate">Rishikesh, Uttarakhand (Moderate • Serene Upstream)</option>
              <option value="hampi" data-crowd="Low">Hampi, Karnataka (Low Crowd • Expansive Ruins)</option>
              <option value="munnar" data-crowd="Moderate">Munnar, Kerala (Moderate • Tea Estates & Spice Groves)</option>
            </select>

            <!-- Search ANY Place in India Autocomplete (Phase 17) -->
            <div style="margin-top: var(--space-3); position: relative;">
              <label for="plan-custom-place-input" style="font-size: var(--font-size-xs); font-weight: 700; color: var(--color-primary); display: block; margin-bottom: 4px;">
                🔍 Or Search ANY Place, Village, or Hill Station in India:
              </label>
              <div style="display: flex; gap: 6px; align-items: center;">
                <input type="text" id="plan-custom-place-input" class="form-input" placeholder="Type 3+ letters (e.g. Harsil, Belur, Orchha, Kaza...)" autocomplete="off" style="flex: 1;" />
              </div>
              <div id="plan-place-dropdown" class="place-autocomplete-dropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #FFFFFF; border: 1.5px solid var(--color-border); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 1000; max-height: 240px; overflow-y: auto;"></div>
              <div id="plan-selected-custom-badge" style="display: none; margin-top: 8px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; padding: 6px 12px; font-size: var(--font-size-xs); color: #1E40AF; display: none; align-items: center; justify-content: space-between;">
                <span>📍 <strong id="plan-selected-custom-name">Custom Place</strong> (Community OpenStreetMap data)</span>
                <button type="button" id="btn-clear-custom-place" class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.75rem;">Clear ✕</button>
              </div>
            </div>

            <div id="destination-crowd-hint" class="flex gap-2" style="align-items: center; margin-top: var(--space-2);">
              <span id="crowd-badge-pill" class="badge badge-local">📍 High Crowd in Town • Peaceful Hamlets</span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">We suggest calm offbeat hamlets 5-15km away.</span>
            </div>
            <div class="form-error-msg" id="err-destination" style="display: none; color: var(--color-danger); font-size: var(--font-size-xs);"></div>
          </div>

          <!-- 1B. Travel Month & Seasonal Demand Insights -->
          <div class="form-group" style="background-color: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2); align-items: center; margin-bottom: 6px;">
              <label class="form-label" for="plan-month" style="margin: 0;">
                <strong>🗓️ Travel Month (Best time to avoid crowds)</strong>
              </label>
              <div id="plan-season-badge-container"></div>
            </div>
            <select id="plan-month" class="form-select" style="width: 100%; max-width: 340px;">
              ${[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((mName, idx) => `
                <option value="${idx}" ${idx === (currentPrefs.travelMonth !== undefined ? currentPrefs.travelMonth : new Date().getMonth()) ? 'selected' : ''}>
                  ${mName} ${idx === new Date().getMonth() ? '(Current Month)' : ''}
                </option>
              `).join('')}
            </select>
            <div id="plan-season-reason-text" style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 6px; line-height: 1.4;"></div>
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
    bindPlanFormInteractions(container, currentPrefs);
  }, 0);

  return container;
}

function bindPlanFormInteractions(container, currentPrefs = {}) {
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
  const activePrefs = Object.keys(currentPrefs).length > 0 ? currentPrefs : (store.getState().preferences || {});
  let selectedDays = parseInt(displayDays.textContent, 10) || 3;
  let selectedCustomPlace = activePrefs.customPlace || null;

  // Custom Place Search Interactions (Phase 17)
  const customInput = container.querySelector('#plan-custom-place-input');
  const customDropdown = container.querySelector('#plan-place-dropdown');
  const customBadge = container.querySelector('#plan-selected-custom-badge');
  const customBadgeName = container.querySelector('#plan-selected-custom-name');
  const clearCustomBtn = container.querySelector('#btn-clear-custom-place');

  if (selectedCustomPlace && customBadge && customBadgeName) {
    customBadgeName.textContent = selectedCustomPlace.displayName || selectedCustomPlace.name;
    customBadge.style.display = 'flex';
  }

  if (customInput && customDropdown) {
    let debounceTimer = null;
    let abortCtrl = null;

    customInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = customInput.value.trim();
      if (q.length < 3) {
        customDropdown.style.display = 'none';
        return;
      }

      debounceTimer = setTimeout(() => {
        if (abortCtrl) abortCtrl.abort();
        abortCtrl = new AbortController();

        customDropdown.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--color-text-muted); font-size: 0.8rem;">Searching India via OpenStreetMap...</div>';
        customDropdown.style.display = 'block';

        searchPlacesInIndia(q, { signal: abortCtrl.signal, timeoutMs: 5000 })
          .then(results => {
            if (!results || results.length === 0) {
              customDropdown.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--color-text-muted); font-size: 0.8rem;">No matching places found. Try another town or district.</div>';
              return;
            }

            customDropdown.innerHTML = '';
            results.forEach(place => {
              const item = document.createElement('div');
              item.style.padding = '8px 12px';
              item.style.cursor = 'pointer';
              item.style.borderBottom = '1px solid #F3F4F6';
              item.style.display = 'flex';
              item.style.justifyContent = 'space-between';
              item.style.alignItems = 'center';

              item.innerHTML = `
                <div>
                  <strong style="color: var(--color-primary); font-size: 0.9rem;">${escapeHTML(place.name)}</strong>
                  <div style="font-size: 0.72rem; color: var(--color-text-muted);">${escapeHTML(place.displayName)}</div>
                </div>
                <span class="badge badge-outline" style="font-size: 0.68rem;">${escapeHTML(place.category)}</span>
              `;

              item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#F0FDF4'; });
              item.addEventListener('mouseleave', () => { item.style.backgroundColor = 'transparent'; });

              item.addEventListener('click', () => {
                selectedCustomPlace = place;
                store.setState({ activePlace: place });
                sessionStorage.setItem(`yl_place_cache_${place.placeKey}`, JSON.stringify(place));

                customBadgeName.textContent = place.displayName;
                customBadge.style.display = 'flex';
                customDropdown.style.display = 'none';
                customInput.value = '';

                // Update crowd pill
                crowdPill.className = 'badge badge-local';
                crowdPill.textContent = '🌐 Community Destination (OpenStreetMap)';
              });

              customDropdown.appendChild(item);
            });
          })
          .catch(err => {
            if (err.name !== 'AbortError') {
              customDropdown.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--color-text-muted); font-size: 0.8rem;">Search unavailable.</div>';
            }
          });
      }, 400);
    });

    if (clearCustomBtn) {
      clearCustomBtn.addEventListener('click', () => {
        selectedCustomPlace = null;
        customBadge.style.display = 'none';
        // restore curated destination status
        const selectedOption = destSelect.options[destSelect.selectedIndex];
        crowdPill.textContent = selectedOption.textContent.includes('High') ? '⚠️ High Crowd in Town' : '📍 Curated Destination';
      });
    }

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        customDropdown.style.display = 'none';
      }
    });
  }

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

  // Seasonality & Travel Month Live Updates
  const monthSelect = container.querySelector('#plan-month');
  const badgeContainer = container.querySelector('#plan-season-badge-container');
  const reasonText = container.querySelector('#plan-season-reason-text');

  const updateSeasonUI = () => {
    const destId = destSelect.value;
    const mIdx = parseInt(monthSelect.value, 10);
    const season = getSeason(destId, mIdx);
    const lang = store.getState().language || 'EN';
    if (badgeContainer) badgeContainer.innerHTML = renderSeasonBadgeHTML(season.demandLevel, lang);
    if (reasonText) {
      reasonText.innerHTML = `<strong>${season.monthName} in ${season.destinationName}:</strong> ${season.reason}. <em>(Estimate)</em>`;
    }
  };

  loadSeasonsData().then(() => updateSeasonUI());
  destSelect.addEventListener('change', updateSeasonUI);
  monthSelect.addEventListener('change', updateSeasonUI);

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

    // Save preferences to state store and reset stale itinerary
    const preferences = {
      destination: selectedCustomPlace ? selectedCustomPlace.name : destSelect.value,
      destinationName: selectedCustomPlace ? selectedCustomPlace.displayName : destSelect.options[destSelect.selectedIndex].text.split('(')[0].trim(),
      customPlace: selectedCustomPlace,
      travelMonth: parseInt(monthSelect.value, 10),
      travelMonthName: monthSelect.options[monthSelect.selectedIndex].text.split('(')[0].trim(),
      budget: budgetVal,
      days: selectedDays,
      travellers: parseInt(container.querySelector('#plan-travellers').value, 10) || 2,
      moods: activeMoods,
      accessibility: accessibilityNeeds
    };

    const submitBtn = container.querySelector('#btn-submit-plan');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳ Crafting Itinerary...</span>';
    }

    store.setState({ preferences, itinerary: null });
    window.YatraApp.showToast('Preferences saved! Crafting your crowd-smart itinerary...');

    // Route to itinerary view
    setTimeout(() => {
      window.location.hash = '#/itinerary';
    }, 250);
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
