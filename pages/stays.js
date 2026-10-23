/**
 * YatraLocal - Local Stays & Verified Guides Page (#/stays)
 * Pre-filtered by destination, tabs for Stays & Guides, comprehensive filters,
 * local-first ranking nudge, detail modal with simulated calendar,
 * and a sticky bottom booking bar reflecting real-time budget comparison.
 */

import { store } from '../js/store.js';
import { YatraMap, calculateDistanceKm } from '../js/map.js';
import { reviewsManager, renderReviewsContainer } from '../js/reviews.js';

export function renderStaysView() {
  const container = document.createElement('div');
  container.className = 'container';
  container.style.padding = 'var(--space-8) var(--space-4)';
  container.style.paddingBottom = '120px'; // Extra space for sticky bottom bar

  const state = store.getState();
  const prefs = state.preferences || {};
  let currentDest = (prefs.destination || 'manali').toLowerCase();
  if (currentDest.includes('manali')) currentDest = 'manali';
  else if (currentDest.includes('jaipur')) currentDest = 'jaipur';
  else if (currentDest.includes('varanasi')) currentDest = 'varanasi';
  else if (currentDest.includes('rishikesh')) currentDest = 'rishikesh';
  else if (currentDest.includes('hampi')) currentDest = 'hampi';
  else if (currentDest.includes('munnar')) currentDest = 'munnar';
  else currentDest = 'manali';
  const currentDays = parseInt(prefs.days, 10) || 3;
  const currentTravellers = parseInt(prefs.travellers, 10) || 2;
  const userBudget = parseInt(prefs.budget, 10) || 8000;

  // View Skeleton
  container.innerHTML = `
    <!-- Top Stepper -->
    <div class="stepper" aria-label="Trip planning step 3 of 4" style="margin-bottom: var(--space-8);">
      <div class="step-item completed">
        <div class="step-number">✓</div>
        <span class="step-label">1. Preferences</span>
      </div>
      <div class="step-item completed">
        <div class="step-number">✓</div>
        <span class="step-label">2. Itinerary</span>
      </div>
      <div class="step-item active">
        <div class="step-number">3</div>
        <span class="step-label">3. Stay & Guide</span>
      </div>
      <div class="step-item">
        <div class="step-number">4</div>
        <span class="step-label">4. Confirm</span>
      </div>
    </div>

    <!-- Header & Local-First Callout -->
    <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-6);">
      <div>
        <div class="flex gap-2" style="align-items: center; margin-bottom: var(--space-2);">
          <span class="badge badge-verified">Direct Community Connect</span>
          <span class="badge badge-local">Zero Middleman Fee</span>
        </div>
        <h1 style="margin: 0; font-size: clamp(1.75rem, 3.5vw, 2.4rem);">
          Local Stays & Verified Guides
        </h1>
        <p style="color: var(--color-text-muted); margin-top: var(--space-1); margin-bottom: 0;">
          Showing verified family homestays and community guides for <strong>${prefs.destinationName || 'your destination'}</strong>.
        </p>
      </div>

      <div>
        <a href="#/itinerary" class="btn btn-ghost btn-sm">← Back to Itinerary</a>
      </div>
    </div>

    <!-- Local-First Priority Banner -->
    <div class="card" style="margin-bottom: var(--space-6); background: linear-gradient(135deg, #FAF7F2 0%, #FFFDF9 100%); border-left: 4px solid var(--color-accent); padding: var(--space-4);">
      <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-2);">
        <div>
          <strong style="color: var(--color-accent-hover);">🌱 The YatraLocal Guarantee:</strong>
          <span style="font-size: var(--font-size-sm); color: var(--color-text-main);">
            We rank small family-owned properties above commercial chains. 100% of your stay fees stay within the local village economy.
          </span>
        </div>
        <span class="badge badge-local">Supports a Local Family</span>
      </div>
    </div>

    <!-- Tab Bar: Stays vs Guides & View Switcher -->
    <div class="flex-between" style="flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-6); align-items: center;">
      <div class="tab-list" role="tablist" style="margin-bottom: 0;">
        <button type="button" class="tab-button active" id="tab-btn-stays" role="tab" aria-selected="true" aria-controls="tab-panel-stays">
          🏡 Local Homestays & Stays (<span id="stays-count">--</span>)
        </button>
        <button type="button" class="tab-button" id="tab-btn-guides" role="tab" aria-selected="false" aria-controls="tab-panel-guides">
          🪪 Verified Local Guides (<span id="guides-count">--</span>)
        </button>
      </div>

      <!-- View Switcher (List vs Map) -->
      <div class="flex gap-2" style="background: var(--color-bg); padding: 4px; border-radius: var(--radius-md); border: 1.5px solid var(--color-border);" role="group" aria-label="View layout toggle">
        <button type="button" id="btn-view-list" class="btn btn-sm btn-primary" style="padding: 6px 14px; font-size: 0.85rem;" aria-pressed="true">
          📋 List View
        </button>
        <button type="button" id="btn-view-map" class="btn btn-sm btn-ghost" style="padding: 6px 14px; font-size: 0.85rem;" aria-pressed="false">
          🗺️ Map View
        </button>
      </div>
    </div>

    <!-- Filter & Sort Controls Bar -->
    <section class="card flow" style="margin-bottom: var(--space-8); padding: var(--space-4);">
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); align-items: flex-end;">
        
        <!-- Max Price Filter -->
        <div class="form-group" style="margin: 0;">
          <label class="form-label" for="filter-price">Max Price (₹): <strong id="price-display">₹2,500</strong></label>
          <input type="range" id="filter-price" min="800" max="3000" step="100" value="2500" style="width: 100%; cursor: pointer;" />
        </div>

        <!-- Sort Select -->
        <div class="form-group" style="margin: 0;">
          <label class="form-label" for="filter-sort">Sort By</label>
          <select id="filter-sort" class="form-select" style="min-height: 40px; padding: var(--space-2);">
            <option value="recommended">Recommended (Local-First)</option>
            <option value="price-low">Price: Low to High</option>
            <option value="rating">Rating: High to Low</option>
          </select>
        </div>

        <!-- Checkbox Filters -->
        <div class="flex gap-3" style="flex-wrap: wrap; align-items: center;">
          <label class="flex gap-2" style="align-items: center; cursor: pointer; font-size: var(--font-size-sm);">
            <input type="checkbox" id="filter-verified" checked style="width: 18px; height: 18px;" />
            <span>Verified only</span>
          </label>
          <label class="flex gap-2" style="align-items: center; cursor: pointer; font-size: var(--font-size-sm);">
            <input type="checkbox" id="filter-senior" ${prefs.accessibility?.seniorFriendly ? 'checked' : ''} style="width: 18px; height: 18px;" />
            <span>Senior-friendly</span>
          </label>
        </div>

        <!-- Reset Button -->
        <div>
          <button type="button" id="btn-reset-filters" class="btn btn-ghost btn-sm" style="width: 100%;">
            Reset Filters
          </button>
        </div>
      </div>
    </section>

    <!-- Content Panels Container -->
    <div id="stays-loading-state" class="flow" style="display: block;">
      <div class="skeleton skeleton-rect" style="height: 180px;"></div>
      <div class="skeleton skeleton-rect" style="height: 180px;"></div>
    </div>

    <!-- Map View Panel (Hidden initially) -->
    <section id="stays-map-panel" class="yatra-map-wrapper" style="display: none;" aria-label="Interactive Map of Local Stays and Guides">
      <div class="yatra-map-toolbar">
        <div class="flex gap-2" style="align-items: center; flex-wrap: wrap;">
          <strong style="color: var(--color-primary); font-size: var(--font-size-sm);" id="stays-map-title">
            🗺️ Local Stays & Guides Map
          </strong>
          <span class="badge badge-verified">Direct Host Payouts</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-stays-map-fit-all" style="padding: 4px 8px; font-size: 0.75rem;">
          ⛶ Fit All
        </button>
      </div>
      <div id="stays-map" class="yatra-map-container" role="region" aria-label="Interactive map showing verified homestays and guides"></div>
      <div style="background: var(--color-bg); padding: 8px 14px; font-size: 0.75rem; color: var(--color-text-muted); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); flex-wrap: wrap; gap: 4px;">
        <span>🏡 = Homestay • 🎓 = Local Guide • Click any pin to view details and calculate walking distance</span>
        <span>© OpenStreetMap contributors</span>
      </div>
    </section>

    <!-- Active Listings Grid -->
    <div id="listings-grid" class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); display: none;"></div>

    <!-- Empty State -->
    <div id="listings-empty-state" class="card flow" style="text-align: center; padding: var(--space-8); display: none;">
      <div style="font-size: 2.5rem;">🔍</div>
      <h3>No matches found in this area with current filters</h3>
      <p style="color: var(--color-text-muted);">Try raising the price ceiling or clearing the senior-friendly filter.</p>
      <div>
        <button type="button" id="empty-reset-btn" class="btn btn-primary">Reset All Filters</button>
      </div>
    </div>

    <!-- Footer Note -->
    <div style="text-align: center; margin-top: var(--space-8); color: var(--color-text-muted); font-size: var(--font-size-xs);">
      <p>ℹ️ All host and guide names are fictional representations for this hackathon prototype. <em>Sample data for demo.</em></p>
    </div>

    <!-- Sticky Bottom Continue to Booking Bar -->
    <div id="sticky-selection-bar" style="position: fixed; bottom: 0; left: 0; right: 0; background-color: var(--color-bg-surface); border-top: 2px solid var(--color-primary); box-shadow: 0 -4px 16px rgba(0,0,0,0.12); z-index: 800; padding: var(--space-3) var(--space-4); display: none;">
      <div class="container flex-between" style="flex-wrap: wrap; gap: var(--space-3); align-items: center;">
        <div class="flex gap-4" style="align-items: center; flex-wrap: wrap;">
          <div>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">Selected Experience:</span>
            <div id="bar-selected-summary" style="font-weight: 700; color: var(--color-text-main); font-size: var(--font-size-sm);">
              No stay or guide selected yet
            </div>
          </div>
          <div style="border-left: 1px solid var(--color-border); padding-left: var(--space-4);">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Trip Total vs Budget:</span>
            <div id="bar-price-summary" style="font-weight: 700; color: var(--color-primary); font-size: var(--font-size-base);">
              --
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <a href="#/booking" id="btn-continue-booking" class="btn btn-primary" style="font-size: var(--font-size-md);">
            Continue to Booking (Step 4) ➔
          </a>
        </div>
      </div>
    </div>
  `;

  // Fetch host data and seed reviews, then initialize interactions immediately
  Promise.all([
    fetch('data/hosts.json').then((resp) => {
      if (!resp.ok) throw new Error('Could not load hosts dataset');
      return resp.json();
    }),
    reviewsManager.loadSeedReviews()
  ])
    .then(([hostsData]) => {
      setupStaysAndGuidesApp(container, hostsData, currentDest, currentDays, currentTravellers, userBudget);
    })
    .catch((err) => {
      console.error(err);
      const loadingStateEl = container.querySelector('#stays-loading-state');
      if (loadingStateEl) {
        loadingStateEl.innerHTML = `
          <div class="card" style="border-color: var(--color-danger);">
            <p>Unable to load local stays data: ${err.message}</p>
          </div>
        `;
      }
    });

  return container;
}

/**
 * Controller for filtering, sorting, tab switching, and selection logic
 */
function setupStaysAndGuidesApp(container, hostsData, targetDest, days, travellers, budget) {
  let activeTab = 'stays'; // 'stays' | 'guides'
  let activeView = 'list'; // 'list' | 'map'
  const allStays = (hostsData.stays || []).filter((s) => s.destination === targetDest);
  const allGuides = (hostsData.guides || []).filter((g) => g.destination === targetDest);

  // Fallback to all if destination doesn't match
  const staysPool = allStays.length > 0 ? allStays : hostsData.stays;
  const guidesPool = allGuides.length > 0 ? allGuides : hostsData.guides;

  // Retrieve Day 1 first activity coordinate from store if available
  const itinerary = store.getState().itinerary;
  const firstAct = itinerary?.days?.[0]?.activities?.[0];
  const anchorCoord = (firstAct && firstAct.lat) ? [firstAct.lat, firstAct.lng] : null;

  // Update tab counts
  container.querySelector('#stays-count').textContent = staysPool.length;
  container.querySelector('#guides-count').textContent = guidesPool.length;

  const tabBtnStays = container.querySelector('#tab-btn-stays');
  const tabBtnGuides = container.querySelector('#tab-btn-guides');
  const btnViewList = container.querySelector('#btn-view-list');
  const btnViewMap = container.querySelector('#btn-view-map');
  const mapPanel = container.querySelector('#stays-map-panel');
  const priceSlider = container.querySelector('#filter-price');
  const priceDisplay = container.querySelector('#price-display');
  const sortSelect = container.querySelector('#filter-sort');
  const checkVerified = container.querySelector('#filter-verified');
  const checkSenior = container.querySelector('#filter-senior');
  const btnReset = container.querySelector('#btn-reset-filters');
  const emptyResetBtn = container.querySelector('#empty-reset-btn');

  const loadingEl = container.querySelector('#stays-loading-state');
  const gridEl = container.querySelector('#listings-grid');
  const emptyEl = container.querySelector('#listings-empty-state');
  const stickyBar = container.querySelector('#sticky-selection-bar');

  // Interactive Leaflet Map for Stays
  let yatraStaysMap = null;
  const mapContainer = container.querySelector('#stays-map');
  if (mapContainer) {
    const isSaral = document.documentElement.classList.contains('saral');
    const defaultCenter = anchorCoord || [32.2432, 77.1892];
    yatraStaysMap = new YatraMap(mapContainer, {
      center: defaultCenter,
      zoom: 12,
      isSaral
    });
    yatraStaysMap.init();

    // Fit all button
    container.querySelector('#btn-stays-map-fit-all')?.addEventListener('click', () => {
      yatraStaysMap.fitAll();
    });
  }

  // View toggle: List vs Map
  btnViewList?.addEventListener('click', () => {
    activeView = 'list';
    btnViewList.classList.add('btn-primary');
    btnViewList.classList.remove('btn-ghost');
    btnViewList.setAttribute('aria-pressed', 'true');
    btnViewMap.classList.remove('btn-primary');
    btnViewMap.classList.add('btn-ghost');
    btnViewMap.setAttribute('aria-pressed', 'false');

    mapPanel.style.display = 'none';
    renderFilteredListings();
  });

  btnViewMap?.addEventListener('click', () => {
    activeView = 'map';
    btnViewMap.classList.add('btn-primary');
    btnViewMap.classList.remove('btn-ghost');
    btnViewMap.setAttribute('aria-pressed', 'true');
    btnViewList.classList.remove('btn-primary');
    btnViewList.classList.add('btn-ghost');
    btnViewList.setAttribute('aria-pressed', 'false');

    mapPanel.style.display = 'block';
    if (yatraStaysMap) {
      yatraStaysMap.invalidateSize();
    }
    renderFilteredListings();
  });

  // Tab switching
  tabBtnStays.addEventListener('click', () => {
    activeTab = 'stays';
    tabBtnStays.classList.add('active');
    tabBtnStays.setAttribute('aria-selected', 'true');
    tabBtnGuides.classList.remove('active');
    tabBtnGuides.setAttribute('aria-selected', 'false');
    priceSlider.max = '3000';
    renderFilteredListings();
  });

  tabBtnGuides.addEventListener('click', () => {
    activeTab = 'guides';
    tabBtnGuides.classList.add('active');
    tabBtnGuides.setAttribute('aria-selected', 'true');
    tabBtnStays.classList.remove('active');
    tabBtnStays.setAttribute('aria-selected', 'false');
    priceSlider.max = '2000';
    renderFilteredListings();
  });

  // Filters change
  priceSlider.addEventListener('input', () => {
    priceDisplay.textContent = `₹${parseInt(priceSlider.value, 10).toLocaleString('en-IN')}`;
    renderFilteredListings();
  });

  sortSelect.addEventListener('change', renderFilteredListings);
  checkVerified.addEventListener('change', renderFilteredListings);
  checkSenior.addEventListener('change', renderFilteredListings);

  const resetFilters = () => {
    priceSlider.value = priceSlider.max;
    priceDisplay.textContent = `₹${parseInt(priceSlider.max, 10).toLocaleString('en-IN')}`;
    sortSelect.value = 'recommended';
    checkVerified.checked = false;
    checkSenior.checked = false;
    renderFilteredListings();
  };

  btnReset.addEventListener('click', resetFilters);
  emptyResetBtn.addEventListener('click', resetFilters);

  function renderFilteredListings() {
    const maxPrice = parseInt(priceSlider.value, 10);
    const sortBy = sortSelect.value;
    const reqVerified = checkVerified.checked;
    const reqSenior = checkSenior.checked;

    let items = activeTab === 'stays' ? [...staysPool] : [...guidesPool];

    // Filter by Price
    items = items.filter((item) => {
      const price = activeTab === 'stays' ? item.pricePerNight : item.pricePerDay;
      return price <= maxPrice;
    });

    // Filter by Verified
    if (reqVerified) {
      items = items.filter((item) => item.verified);
    }

    // Filter by Senior-Friendly
    if (reqSenior) {
      items = items.filter((item) => item.seniorFriendly);
    }

    // Sort items
    if (sortBy === 'price-low') {
      items.sort((a, b) => {
        const pA = activeTab === 'stays' ? a.pricePerNight : a.pricePerDay;
        const pB = activeTab === 'stays' ? b.pricePerNight : b.pricePerDay;
        return pA - pB;
      });
    } else if (sortBy === 'rating') {
      items.sort((a, b) => b.rating - a.rating);
    } else {
      // Recommended: Local-first + small family homestay nudge
      items.sort((a, b) => {
        const scoreA = (a.supportsLocalFamily ? 2 : 0) + (a.verified ? 1 : 0) + (a.rating / 5);
        const scoreB = (b.supportsLocalFamily ? 2 : 0) + (b.verified ? 1 : 0) + (b.rating / 5);
        return scoreB - scoreA;
      });
    }

    // Render cards
    loadingEl.style.display = 'none';
    if (items.length === 0) {
      gridEl.style.display = 'none';
      emptyEl.style.display = 'block';
    } else {
      emptyEl.style.display = 'none';
      gridEl.style.display = 'grid';
      gridEl.innerHTML = items.map((item) => buildHostCardHTML(item, activeTab, anchorCoord)).join('');
      bindCardInteractions(gridEl, items, activeTab);
    }

    // Update map if available
    if (yatraStaysMap) {
      yatraStaysMap.renderStaysAndGuides(items, {
        anchorCoord,
        onSelect: (selectedItem) => {
          openHostDetailModal(selectedItem, selectedItem.type || activeTab);
        }
      });
    }

    updateStickyBottomBar();
  }

  function bindCardInteractions(grid, items, type) {
    // Detail Modal click
    grid.querySelectorAll('.btn-view-details').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = items.find((x) => x.id === id);
        if (item) openHostDetailModal(item, item.type || type);
      });
    });

    // Select button click
    grid.querySelectorAll('.btn-select-host').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = items.find((x) => x.id === id);
        if (!item) return;

        const currentState = store.getState();
        const isStay = item.type === 'stay' || type === 'stay' || type === 'stays';
        if (isStay) {
          const isSelected = currentState.selectedStay?.id === id;
          store.setState({ selectedStay: isSelected ? null : item });
          window.YatraApp.showToast(isSelected ? `Removed "${item.name}"` : `Selected stay: "${item.name}"`);
        } else {
          const isSelected = currentState.selectedGuide?.id === id;
          store.setState({ selectedGuide: isSelected ? null : item });
          window.YatraApp.showToast(isSelected ? `Removed guide` : `Selected guide: "${item.name}"`);
        }

        renderFilteredListings();
      });
    });
  }

  function updateStickyBottomBar() {
    const currentState = store.getState();
    const stay = currentState.selectedStay;
    const guide = currentState.selectedGuide;

    if (!stay && !guide) {
      stickyBar.style.display = 'none';
      return;
    }

    stickyBar.style.display = 'block';
    const stayPart = stay ? `🏡 ${stay.name}` : 'No stay selected';
    const guidePart = guide ? ` • 🪪 Guide: ${guide.name}` : '';
    container.querySelector('#bar-selected-summary').textContent = `${stayPart}${guidePart}`;

    // Compute estimate
    const stayTotal = stay ? (stay.pricePerNight * Math.ceil(travellers / 2) * Math.max(1, days - 1)) : 0;
    const guideTotal = guide ? (guide.pricePerDay * days) : 0;
    const combinedTotal = stayTotal + guideTotal;

    const priceSummaryEl = container.querySelector('#bar-price-summary');
    priceSummaryEl.innerHTML = `
      ₹${combinedTotal.toLocaleString('en-IN')} 
      <span style="font-size: var(--font-size-xs); font-weight: normal; color: ${combinedTotal > budget ? 'var(--color-danger)' : 'var(--color-success)'};">
        (${combinedTotal <= budget ? '✓ Within' : '⚠️ Exceeds'} ₹${budget.toLocaleString('en-IN')} budget)
      </span>
    `;
  }

  // Initial render
  renderFilteredListings();
}

/**
 * Generates card HTML for Stays and Guides
 */
function buildHostCardHTML(item, type, anchorCoord = null) {
  const state = store.getState();
  const isStay = item.type === 'stay' || type === 'stay' || type === 'stays';
  const isSelected = isStay ? state.selectedStay?.id === item.id : state.selectedGuide?.id === item.id;

  const hostOffer = isStay ? store.getHostOffer(item.id) : null;
  const activeDiscount = hostOffer?.discountPercent || item.offPeakDiscountPercent;
  const activePrice = hostOffer?.discountedPrice || (isStay ? item.pricePerNight : item.pricePerDay);
  const activeRoomsEmpty = hostOffer?.roomsOffered !== undefined ? hostOffer.roomsOffered : item.roomsAvailableOffSeason;

  // Reviews metrics from reviewsManager
  const revMetrics = reviewsManager.getMetricsForTarget(item.id);
  const displayRating = revMetrics.totalReviews > 0 ? revMetrics.averageRating : (item.rating || 4.8);
  const displayCount = revMetrics.totalReviews > 0 ? revMetrics.totalReviews : (item.reviewsCount || 12);

  // Haversine distance calculation from Day 1 activity start
  let distanceBadge = '';
  if (anchorCoord && anchorCoord[0] && anchorCoord[1] && item.lat && item.lng) {
    const distKm = calculateDistanceKm(anchorCoord[0], anchorCoord[1], item.lat, item.lng);
    if (distKm != null) {
      distanceBadge = `
        <span class="badge" style="background: #E6F4F1; color: #0D5C5B; font-size: var(--font-size-xs);">
          📏 ${distKm} km from Day 1 start
        </span>
      `;
    }
  }

  return `
    <article class="card card-interactive flow" data-id="${item.id}" style="border: 2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <!-- Visual CSS Gradient Placeholder Banner -->
        <div style="background: ${item.photoPlaceholder?.bgGradient || 'var(--color-primary-light)'}; height: 110px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); margin-bottom: var(--space-4); position: relative; overflow: hidden;">
          <div style="font-size: 3rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
            ${item.photoPlaceholder?.icon || (isStay ? '🏡' : '🪪')}
          </div>
          ${activeDiscount ? `
            <div style="background-color: var(--color-accent); color: white; padding: 0.25rem 0.6rem; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; box-shadow: var(--shadow-sm);">
              🎉 ${activeDiscount}% Off-Peak Offer ${hostOffer ? '⚡ Live' : ''}
            </div>
          ` : ''}
        </div>

        <!-- Badges Row -->
        <div class="flex gap-2" style="flex-wrap: wrap; margin-bottom: var(--space-2);">
          ${item.verified ? '<span class="badge badge-verified">✓ Verified Local</span>' : ''}
          ${item.supportsLocalFamily ? '<span class="badge badge-local">📍 Supports a Local Family</span>' : ''}
          ${item.seniorFriendly ? '<span class="badge badge-verified">♿ Senior Friendly</span>' : ''}
          ${distanceBadge}
        </div>

        <!-- Title & Location -->
        <h3 style="margin: 0 0 var(--space-1) 0; font-size: var(--font-size-lg);">
          ${item.name}
        </h3>
        <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-3);">
          📍 ${item.area}
        </p>

        <!-- Rating & Reviews -->
        <div class="flex gap-2" style="align-items: center; font-size: var(--font-size-xs); margin-bottom: var(--space-3);">
          <span style="font-weight: 700; color: #D97706;">★ ${displayRating}</span>
          <span style="color: var(--color-text-muted);">(${displayCount} verified traveler reviews)</span>
        </div>

        <!-- Rooms Left Indicator for Stays -->
        ${isStay ? `
          <div style="background-color: var(--color-bg); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-xs); margin-bottom: var(--space-3); border: 1px solid var(--color-border);" class="flex-between">
            <span>🛏️ Rooms Available:</span>
            <strong>${activeRoomsEmpty} of ${item.roomsTotal} empty</strong>
          </div>
        ` : `
          <div style="background-color: var(--color-bg); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-xs); margin-bottom: var(--space-3); border: 1px solid var(--color-border);" class="flex-between">
            <span>🎓 Experience:</span>
            <strong>${item.yearsExperience} years licensed (${item.licenseNumber})</strong>
          </div>
        `}

        <!-- Snippet Story -->
        <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: var(--space-4);">
          ${isStay ? (hostOffer?.promoMessage || item.hostStory) : item.bioStory}
        </p>
      </div>

      <!-- Price & Actions Footer -->
      <div style="padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
        <div class="flex-between" style="align-items: center; margin-bottom: var(--space-3);">
          <div>
            <div style="font-size: 1.35rem; font-weight: 700; color: var(--color-primary);">
              ₹${activePrice.toLocaleString('en-IN')}
              <span style="font-size: var(--font-size-xs); font-weight: normal; color: var(--color-text-muted);">/${isStay ? 'night' : 'day'}</span>
            </div>
            ${item.originalPrice ? `
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-decoration: line-through;">
                ₹${item.originalPrice.toLocaleString('en-IN')}
              </div>
            ` : ''}
          </div>

          <button type="button" class="btn btn-ghost btn-sm btn-view-details" data-id="${item.id}" aria-label="View details for ${item.name}">
            Details ➔
          </button>
        </div>

        <button type="button" class="btn ${isSelected ? 'btn-secondary' : 'btn-primary'} btn-select-host" data-id="${item.id}" style="width: 100%;">
          ${isSelected ? '✓ Selected' : `Select ${isStay ? 'Stay' : 'Guide'}`}
        </button>
      </div>
    </article>
  `;
}

/**
 * Reusable modal for full host/guide details with simulated availability calendar
 */
function openHostDetailModal(item, type) {
  const isStay = item.type === 'stay' || type === 'stay' || type === 'stays';

  const content = `
    <div class="flow" style="font-size: var(--font-size-sm);">
      <div class="flex-between" style="align-items: flex-start; gap: var(--space-2);">
        <div>
          <span class="badge ${item.verified ? 'badge-verified' : 'badge-local'}">
            ${item.verified ? '✓ Verified Local Host' : 'Community Host'}
          </span>
          <h3 style="margin: var(--space-2) 0 0; font-size: var(--font-size-lg);">${item.name}</h3>
          <p style="color: var(--color-text-muted); margin: 0;">📍 ${item.area}</p>
        </div>
        <div style="text-align: right;">
          <strong style="font-size: 1.25rem; color: var(--color-primary);">
            ₹${(isStay ? item.pricePerNight : item.pricePerDay).toLocaleString('en-IN')}
          </strong>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">/${isStay ? 'night' : 'day'}</div>
        </div>
      </div>

      <!-- Host Personal Story -->
      <div style="background-color: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-md); border-left: 3px solid var(--color-primary);">
        <strong style="color: var(--color-primary);">About the Host:</strong>
        <p style="margin-top: var(--space-2); margin-bottom: 0; line-height: 1.6;">
          ${isStay ? item.hostStory : item.bioStory}
        </p>
      </div>

      <!-- Amenities / Specialties -->
      <div>
        <strong>${isStay ? 'Amenities & Senior Accessibility:' : 'Specialties & Expertise:'}</strong>
        <div class="flex gap-2" style="flex-wrap: wrap; margin-top: var(--space-2);">
          ${(isStay ? item.amenities : item.specialties).map((a) => `
            <span class="badge" style="background-color: var(--color-bg-subtle); color: var(--color-text-main); font-weight: 500;">✓ ${a}</span>
          `).join('')}
        </div>
      </div>

      <!-- Languages Spoken -->
      <div>
        <strong>Languages Spoken:</strong>
        <div class="flex gap-2" style="margin-top: var(--space-1);">
          ${item.languages.map((l) => `<span class="badge badge-local">${l}</span>`).join('')}
        </div>
      </div>

      <!-- Simulated 7-Day Availability Calendar -->
      <div>
        <div class="flex-between" style="align-items: center; margin-bottom: var(--space-2);">
          <strong>Simulated Live Availability (Next 7 Days):</strong>
          <span class="badge badge-demo">Simulated</span>
        </div>
        <div class="grid" style="grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;">
          ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => `
            <div style="background-color: ${idx === 5 ? '#FEE2E2' : '#E3F6EC'}; border: 1px solid var(--color-border); padding: 6px 2px; border-radius: var(--radius-sm); font-size: 11px;">
              <div>${day}</div>
              <strong style="color: ${idx === 5 ? '#C5221F' : '#1B7955'};">${idx === 5 ? 'Few' : 'Open'}</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Community Reviews Section (Phase 15) -->
      <div id="modal-host-reviews-container" style="margin-top: var(--space-4);"></div>

      <div style="padding-top: var(--space-4); border-top: 1px solid var(--color-border); text-align: right;">
        <button type="button" class="btn btn-primary" onclick="window.YatraApp.closeModal()">Close Details</button>
      </div>
    </div>
  `;

  window.YatraApp.openModal({
    title: item.name,
    content
  });

  // Mount reviews container into modal
  const revContainer = document.getElementById('modal-host-reviews-container');
  if (revContainer) {
    renderReviewsContainer(revContainer, item.id, isStay ? 'stay' : 'guide', item.name);
  }
}
