/**
 * YatraLocal - Itinerary View Page (#/itinerary)
 * Day timeline, swap activity, less-crowded suggestions, sticky cost summary,
 * skeleton loader with 1s simulated generation, and edge case handling.
 */

import { store } from '../js/store.js';
import { planProvider } from '../js/itinerary.js';
import { YatraMap } from '../js/map.js';

export function renderItineraryView() {
  const container = document.createElement('div');
  container.className = 'container';
  container.style.padding = 'var(--space-8) var(--space-4)';

  // Initial State: Render skeleton loader
  container.innerHTML = `
    <div style="max-width: 960px; margin: 0 auto;" class="flow" id="itinerary-loading-state">
      <!-- Stepper -->
      <div class="stepper" aria-label="Trip planning step 2 of 4">
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

      <div class="card flow" style="text-align: center; padding: var(--space-8);">
        <span class="badge badge-demo">Simulated AI Planner</span>
        <h2>Crafting Your Crowd-Smart Yatra...</h2>
        <p style="color: var(--color-text-muted);">
          Balancing pacing, analyzing offbeat hamlets, and checking verified homestay availability.
        </p>
        <div style="max-width: 600px; margin: var(--space-6) auto;" class="flow">
          <div class="skeleton skeleton-rect" style="height: 120px;"></div>
          <div class="skeleton skeleton-title" style="margin: 0 auto; width: 50%;"></div>
          <div class="skeleton skeleton-text" style="margin: 0 auto; width: 70%;"></div>
        </div>
      </div>
    </div>

    <!-- Live Content Container (Hidden during fake generation) -->
    <div style="max-width: 1040px; margin: 0 auto; display: none;" id="itinerary-content-container"></div>
  `;

  // Check if we already have an itinerary cached to render immediately or animate
  const state = store.getState();
  const delay = state.itinerary ? 0 : 800;

  // Trigger generation
  setTimeout(async () => {
    try {
      const currentState = store.getState();
      const prefs = currentState.preferences || {
        destination: 'manali',
        budget: 8000,
        days: 3,
        travellers: 2,
        moods: ['Relaxed'],
        accessibility: {}
      };

      const itineraryData = currentState.itinerary || await planProvider.getItinerary(prefs);
      store.setState({ itinerary: itineraryData });

      // Render actual itinerary content
      const loadingState = container.querySelector('#itinerary-loading-state');
      const contentContainer = container.querySelector('#itinerary-content-container');

      if (loadingState && contentContainer) {
        loadingState.style.display = 'none';
        contentContainer.style.display = 'block';
        contentContainer.innerHTML = buildItineraryHTML(itineraryData);
        bindItineraryInteractions(contentContainer, itineraryData);
      }
    } catch (err) {
      console.error('Failed to generate itinerary:', err);
      container.innerHTML = `
        <div class="card flow" style="max-width: 600px; margin: var(--space-8) auto; border-color: var(--color-danger);">
          <h2>Unable to Load Itinerary</h2>
          <p style="color: var(--color-text-muted);">${err.message}</p>
          <a href="#/plan" class="btn btn-primary">Adjust Preferences</a>
        </div>
      `;
    }
  }, delay);

  return container;
}

/**
 * Builds the complete HTML for the loaded itinerary
 */
function buildItineraryHTML(data) {
  const { destination, days, totalCost, userBudget, budgetStatus, breakdown, whyPlan } = data;
  const isOverBudget = budgetStatus === 'over-budget';
  const budgetRatio = Math.min(100, Math.round((totalCost / userBudget) * 100));

  return `
    <!-- Top Stepper -->
    <div class="stepper" aria-label="Trip planning step 2 of 4" style="margin-bottom: var(--space-8);">
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

    <!-- Header & AI Simulation Badge -->
    <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-6);">
      <div>
        <div class="flex gap-2" style="align-items: center; margin-bottom: var(--space-2);">
          <span class="badge badge-demo">Simulated AI Planner</span>
          <span class="badge badge-verified">Crowd-Smart Route</span>
        </div>
        <h1 style="margin: 0; font-size: clamp(1.75rem, 3.5vw, 2.4rem);">
          ${destination.name} Itinerary (${days.length} Days)
        </h1>
        <p style="color: var(--color-text-muted); margin-top: var(--space-1); margin-bottom: 0;">
          ${destination.state} • ${destination.crowdBadge}
        </p>
      </div>

      <div class="flex gap-2">
        <a href="#/plan" class="btn btn-ghost btn-sm">✏️ Edit Preferences</a>
        <a href="#/stays" class="btn btn-primary btn-sm">Choose Local Stay & Guide ➔</a>
      </div>
    </div>

    <!-- "Why This Plan" Explanation Callout -->
    <section class="card flow" style="margin-bottom: var(--space-8); background: linear-gradient(135deg, #FAF7F2 0%, var(--color-bg-surface) 100%); border-left: 5px solid var(--color-primary);">
      <div class="flex-between" style="align-items: center;">
        <h2 style="margin: 0; font-size: var(--font-size-lg); color: var(--color-primary);">
          ✨ Why This Plan Works For You
        </h2>
        <span class="badge badge-local">Local Insights</span>
      </div>
      <p style="margin: 0; font-size: var(--font-size-sm); color: var(--color-text-main);">
        ${whyPlan.summary}
      </p>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-muted);">
        <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md);">
          <strong>🎯 Mood Match:</strong> ${whyPlan.moodMatch}
        </div>
        <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md);">
          <strong>🚦 Crowd Avoidance:</strong> ${whyPlan.crowdAvoidance}
        </div>
        <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md);">
          <strong>🚶 Pacing:</strong> ${whyPlan.accessibilityNotice}
        </div>
      </div>
    </section>

    <!-- Interactive Route Map & Crowd Awareness Layer -->
    <section class="yatra-map-wrapper" aria-label="Interactive Route Map">
      <div class="yatra-map-toolbar">
        <div class="flex gap-2" style="align-items: center; flex-wrap: wrap;">
          <strong style="color: var(--color-primary); font-size: var(--font-size-sm);">🗺️ Route & Crowd Map</strong>
          <div class="flex gap-1" id="map-day-filter-buttons">
            <button type="button" class="btn btn-outline btn-sm btn-map-day-filter active" data-day="all" style="padding: 4px 10px; font-size: 0.75rem;">
              All Days
            </button>
            ${days.map((d, i) => `
              <button type="button" class="btn btn-outline btn-sm btn-map-day-filter" data-day="${d.day || i + 1}" style="padding: 4px 10px; font-size: 0.75rem;">
                Day ${d.day || i + 1}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="flex gap-2" style="align-items: center;">
          <label class="flex gap-2" style="align-items: center; cursor: pointer; font-size: 0.8rem; font-weight: 600; margin: 0; background: var(--color-bg-surface); padding: 4px 8px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
            <input type="checkbox" id="chk-crowd-layer" style="cursor: pointer;" />
            <span>🚦 Crowd-Aware Layer</span>
          </label>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-map-fit-all" style="padding: 4px 8px; font-size: 0.75rem;">
            ⛶ Fit All
          </button>
        </div>
      </div>

      <!-- Leaflet Map Container -->
      <div id="itinerary-map" class="yatra-map-container" role="region" aria-label="Day route map with numbered markers"></div>
      
      <div style="background: var(--color-bg); padding: 6px 12px; font-size: 0.75rem; color: var(--color-text-muted); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); flex-wrap: wrap; gap: 4px;">
        <span>ℹ️ Numbered pins represent sequential stops (e.g. 1.1 = Day 1, Stop 1). Dashed lines show day route.</span>
        <span>Green = Low Crowd • Red = Popular Chokepoint</span>
      </div>
    </section>

    <!-- Main Layout: Timeline (Left) + Sticky Cost Summary (Right) -->
    <div class="grid" style="grid-template-columns: 1fr; gap: var(--space-6); align-items: flex-start;" id="itinerary-two-column-grid">
      
      <!-- Day Timeline Column -->
      <div class="flow" id="itinerary-timeline-column">
        ${days.map((dayObj) => buildDayCardHTML(dayObj, destination)).join('')}
      </div>

      <!-- Sticky Cost Summary Column -->
      <aside class="flow" id="itinerary-cost-sidebar">
        <div class="card flow" style="position: sticky; top: 80px; box-shadow: var(--shadow-md); border-top: 4px solid ${isOverBudget ? 'var(--color-danger)' : 'var(--color-primary)'};">
          <div class="flex-between">
            <h3 style="margin: 0; font-size: var(--font-size-md);">Estimated Trip Cost</h3>
            <span class="badge ${isOverBudget ? 'badge-danger' : 'badge-verified'}">
              ${isOverBudget ? '⚠️ Over Budget' : '✓ Within Budget'}
            </span>
          </div>

          <!-- Price Display -->
          <div>
            <div style="font-size: 2rem; font-weight: 700; color: ${isOverBudget ? 'var(--color-danger)' : 'var(--color-primary)'};">
              ₹${totalCost.toLocaleString('en-IN')}
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              Preferred Budget: ₹${userBudget.toLocaleString('en-IN')} (${budgetRatio}% used)
            </div>
          </div>

          <!-- Progress Bar -->
          <div style="width: 100%; height: 8px; background-color: var(--color-bg-subtle); border-radius: var(--radius-full); overflow: hidden;">
            <div style="width: ${budgetRatio}%; height: 100%; background-color: ${isOverBudget ? 'var(--color-danger)' : 'var(--color-primary)'}; transition: width 0.3s ease;"></div>
          </div>

          ${isOverBudget ? `
            <div style="background-color: var(--color-danger-bg); color: var(--color-danger); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: 600;">
              Exceeds target by ₹${(totalCost - userBudget).toLocaleString('en-IN')}. Swap premium activities below or choose homestays with seasonal discounts.
            </div>
          ` : ''}

          <!-- Cost Breakdown List -->
          <div class="flow" style="font-size: var(--font-size-sm); border-top: 1px solid var(--color-border); padding-top: var(--space-3);">
            <div class="flex-between">
              <span>🏡 Local Homestay:</span>
              <strong>₹${breakdown.stay.toLocaleString('en-IN')}</strong>
            </div>
            <div class="flex-between">
              <span>🍲 Authentic Meals:</span>
              <strong>₹${breakdown.food.toLocaleString('en-IN')}</strong>
            </div>
            <div class="flex-between">
              <span>🎟️ Activities & Entries:</span>
              <strong>₹${breakdown.activities.toLocaleString('en-IN')}</strong>
            </div>
            <div class="flex-between">
              <span>🛺 Local Transport:</span>
              <strong>₹${breakdown.transport.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div style="border-top: 1px solid var(--color-border); padding-top: var(--space-4);">
            <a href="#/stays" class="btn btn-primary" style="width: 100%; font-size: var(--font-size-md);">
              Choose Local Stay & Guide ➔
            </a>
            <div style="text-align: center; margin-top: var(--space-2);">
              <span class="stat-placeholder">[Add verified statistic + source]</span>
            </div>
          </div>
        </div>
      </aside>

    </div>
  `;
}

/**
 * Builds HTML for each Day Card in the timeline
 */
function buildDayCardHTML(dayObj, destination) {
  return `
    <article class="card flow day-card" data-day="${dayObj.day}" style="border: 1.5px solid var(--color-border);">
      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2); border-bottom: 1.5px solid var(--color-bg-subtle); padding-bottom: var(--space-3);">
        <div>
          <h2 style="margin: 0; font-size: var(--font-size-lg); color: var(--color-text-main);">
            ${dayObj.title}
          </h2>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            Estimated Day Spend: ₹${dayObj.estCost.toLocaleString('en-IN')}
          </span>
        </div>
        <span class="badge badge-local">Day ${dayObj.day}</span>
      </div>

      <!-- Activities Slots -->
      <div class="flow" style="margin-top: var(--space-4);">
        ${dayObj.activities.map((act) => buildActivitySlotHTML(act, dayObj.day, destination)).join('')}
      </div>

      <!-- Local Tip Callout -->
      <div style="background-color: var(--color-bg); padding: var(--space-3); border-radius: var(--radius-md); border-left: 3px solid var(--color-accent); font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-4);">
        <strong>💡 Local Host Tip:</strong> ${dayObj.localTip}
      </div>
    </article>
  `;
}

/**
 * Builds HTML for each individual Activity Slot
 */
function buildActivitySlotHTML(act, dayNumber, destination) {
  const isCrowded = act.crowdLevel === 'high' || act.crowdLevel === 'medium';

  return `
    <div class="card activity-slot" data-act-id="${act.id}" data-day="${dayNumber}" style="background-color: var(--color-bg-surface); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2);">
        <div>
          <span style="font-size: var(--font-size-xs); font-weight: 700; color: var(--color-primary); text-transform: uppercase;">
            ${act.slotName}
          </span>
          <h3 style="margin: var(--space-1) 0; font-size: var(--font-size-base); font-weight: 700;">
            ${act.name}
          </h3>
        </div>

        <div class="flex gap-2" style="align-items: center;">
          <span class="badge ${act.crowdLevel === 'low' ? 'badge-verified' : act.crowdLevel === 'medium' ? 'badge-local' : 'badge-danger'}">
            ${act.crowdLevel === 'low' ? '✓ Low Crowd' : act.crowdLevel === 'medium' ? 'Moderate Crowd' : '⚠️ Heavy Crowd'}
          </span>
          ${act.isHiddenGem ? '<span class="badge badge-local">💎 Hidden Gem</span>' : ''}
        </div>
      </div>

      <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-3);">
        ${act.description}
      </p>

      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2); font-size: var(--font-size-xs); color: var(--color-text-muted); padding-top: var(--space-2); border-top: 1px dashed var(--color-border);">
        <div class="flex gap-3" style="align-items: center;">
          <span>📍 ${act.area}</span>
          <span>⏱️ ${act.durationHours} hrs</span>
          <span>🚶 ${act.walkingLevel}</span>
          <strong style="color: var(--color-primary);">₹${act.cost} / person</strong>
        </div>

        <button type="button" class="btn btn-ghost btn-sm btn-swap-activity" data-act-id="${act.id}" data-day="${dayNumber}" style="min-height: 36px; padding: 0.25rem 0.6rem; font-size: var(--font-size-xs);">
          🔄 Swap Activity
        </button>
      </div>

      ${isCrowded ? `
        <div style="margin-top: var(--space-3); background-color: #FEF3C7; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-xs); color: #92400E; display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);">
          <span>🌿 <strong>Less Crowded Alternative:</strong> Consider visiting during dawn or swapping for ${destination.crowdPair?.offbeat || 'nearby quiet hamlets'}.</span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Binds interactivity for Swap Activity buttons and responsive grid
 */
function bindItineraryInteractions(container, itineraryData) {
  // Setup two-column layout styling for wider screens
  const updateLayout = () => {
    const grid = container.querySelector('#itinerary-two-column-grid');
    if (grid) {
      if (window.innerWidth >= 900) {
        grid.style.gridTemplateColumns = '2fr 1fr';
      } else {
        grid.style.gridTemplateColumns = '1fr';
      }
    }
  };
  updateLayout();
  window.addEventListener('resize', updateLayout);

  // Swap Activity Handlers
  const swapButtons = container.querySelectorAll('.btn-swap-activity');
  swapButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const currentActId = btn.dataset.actId;
      const dayNum = parseInt(btn.dataset.day, 10);
      const allActs = itineraryData.allDestinationActivities || [];

      // Find an activity not already on this day
      const targetDay = itineraryData.days.find((d) => d.day === dayNum);
      if (!targetDay) return;

      const currentDayActIds = targetDay.activities.map((a) => a.id);
      const candidates = allActs.filter((a) => !currentDayActIds.includes(a.id));

      if (candidates.length === 0) {
        window.YatraApp.showToast('All available activities are already in your plan!');
        return;
      }

      // Pick next alternative candidate
      const newAct = candidates[Math.floor(Math.random() * candidates.length)];
      const actSlotIndex = targetDay.activities.findIndex((a) => a.id === currentActId);

      if (actSlotIndex !== -1) {
        const oldAct = targetDay.activities[actSlotIndex];
        targetDay.activities[actSlotIndex] = {
          ...newAct,
          slotName: oldAct.slotName,
          slotKey: oldAct.slotKey
        };

        // Recalculate day cost
        const travellers = parseInt(store.getState().preferences?.travellers, 10) || 2;
        targetDay.estCost = targetDay.activities.reduce((acc, curr) => acc + (curr.cost * travellers), 0);

        // Recalculate total cost
        const totalActsCost = itineraryData.days.reduce((acc, d) => acc + d.estCost, 0);
        itineraryData.breakdown.activities = totalActsCost;
        itineraryData.totalCost = totalActsCost + itineraryData.breakdown.stay + itineraryData.breakdown.food + itineraryData.breakdown.transport;

        // Save back to store & re-render
        store.setState({ itinerary: itineraryData });
        container.innerHTML = buildItineraryHTML(itineraryData);
        bindItineraryInteractions(container, itineraryData);
        window.YatraApp.showToast(`Swapped with "${newAct.name}"!`);
      }
    });
  });

  // Initialize and Render Leaflet Map
  const mapElement = container.querySelector('#itinerary-map');
  if (mapElement) {
    const isSaral = document.documentElement.classList.contains('saral');
    const firstAct = itineraryData.days?.[0]?.activities?.[0];
    const initialCenter = (firstAct && firstAct.lat) ? [firstAct.lat, firstAct.lng] : [32.2432, 77.1892];

    const yatraMap = new YatraMap(mapElement, {
      center: initialCenter,
      zoom: 12,
      isSaral
    });

    const success = yatraMap.init();

    if (success) {
      let currentActiveDay = null; // null means all days
      let isCrowdMode = false;

      const refreshMap = () => {
        yatraMap.renderItinerary(itineraryData.days, currentActiveDay, isCrowdMode);
      };

      // Initial render
      refreshMap();

      // Day Filter Buttons
      const dayFilterBtns = container.querySelectorAll('.btn-map-day-filter');
      dayFilterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          dayFilterBtns.forEach(b => b.classList.remove('active', 'btn-primary'));
          btn.classList.add('active', 'btn-primary');

          const dayVal = btn.dataset.day;
          currentActiveDay = dayVal === 'all' ? null : parseInt(dayVal, 10);
          refreshMap();
        });
      });

      // Crowd Layer Toggle
      const crowdToggle = container.querySelector('#chk-crowd-layer');
      if (crowdToggle) {
        crowdToggle.addEventListener('change', (e) => {
          isCrowdMode = e.target.checked;
          refreshMap();
          if (isCrowdMode) {
            window.YatraApp.showToast('🚦 Crowd-aware mode: Green = Offbeat/Low crowd, Red = High crowd');
          }
        });
      }

      // Fit All Button
      const fitAllBtn = container.querySelector('#btn-map-fit-all');
      if (fitAllBtn) {
        fitAllBtn.addEventListener('click', () => {
          yatraMap.fitAll();
        });
      }
    }
  }
}
