/**
 * YatraLocal - India-Wide Place Detail Page (#/place/<placeKey>)
 * 
 * Features:
 * 1. Community/OSM label: "Community/OSM data. Details may be incomplete."
 * 2. Leaflet map pin with external directions deep link (Google Maps / OpenStreetMap).
 * 3. Cultural & historical overview from Wikipedia REST API.
 * 4. 7-Day live weather forecast from Open-Meteo.
 * 5. Nearby attractions, viewpoints, heritage & waterfalls from Overpass API (radius 10km).
 * 6. Shared community reviews backed by Supabase with authenticated submission.
 * 7. "Plan a Trip Here" CTA initiating the Crowd-Smart Itinerary planner.
 */

import { store } from '../js/store.js';
import { YatraMap, getDirectionsUrl } from '../js/map.js';
import { fetchPlaceDescription, fetchNearbyAttractions } from '../js/places.js';
import { fetchWeatherForecast } from '../js/api.js';
import { renderReviewsContainer } from '../js/reviews.js';

export function renderPlaceView(placeKeyFromRoute = null) {
  const container = document.createElement('div');
  container.className = 'container';
  container.style.padding = 'var(--space-6) var(--space-4)';

  // Resolve Place Object from active store or placeKey
  const state = store.getState();
  let place = state.activePlace;

  if (!place && placeKeyFromRoute) {
    try {
      const saved = sessionStorage.getItem(`yl_place_cache_${placeKeyFromRoute}`);
      if (saved) place = JSON.parse(saved);
    } catch (_) {}
  }

  // Fallback demo place if accessed directly without state
  if (!place) {
    place = {
      placeKey: placeKeyFromRoute || 'osm:node:harsil',
      name: 'Harsil',
      displayName: 'Harsil, Uttarkashi, Uttarakhand, India',
      state: 'Uttarakhand',
      district: 'Uttarkashi',
      lat: 31.0374,
      lng: 78.7369,
      source: 'osm',
      category: 'village'
    };
  }

  const isCurated = place.source === 'curated';

  container.innerHTML = `
    <div style="max-width: 1080px; margin: 0 auto;" class="flow">
      <!-- Breadcrumb Navigation -->
      <nav aria-label="Breadcrumb" style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-2);">
        <a href="#/" style="color: var(--color-primary); text-decoration: none;">Home</a> ›
        <a href="#/plan" style="color: var(--color-primary); text-decoration: none;">Plan</a> ›
        <span>${escapeHTML(place.name)}</span>
      </nav>

      <!-- Header & Attribution Badges -->
      <div class="flex-between" style="align-items: flex-start; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-4);">
        <div>
          <div class="flex gap-2" style="align-items: center; margin-bottom: var(--space-2); flex-wrap: wrap;">
            ${isCurated 
              ? '<span class="badge badge-verified">✨ Curated Yatra Destination</span>' 
              : '<span class="badge badge-demo" style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;">🌐 Community / OpenStreetMap Data</span>'
            }
            <span class="badge badge-outline">${escapeHTML(place.category || 'Destination')}</span>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              ${escapeHTML(place.district ? `${place.district}, ` : '')}${escapeHTML(place.state || 'India')}
            </span>
          </div>

          <h1 style="margin: 0; font-size: clamp(1.8rem, 3.5vw, 2.5rem); color: var(--color-primary);">
            ${escapeHTML(place.name)}
          </h1>
          <p style="margin: 4px 0 0; color: var(--color-text-muted); font-size: var(--font-size-sm);">
            ${escapeHTML(place.displayName || `${place.name}, ${place.state}, India`)}
          </p>
        </div>

        <div class="flex gap-2" style="flex-wrap: wrap;">
          <a href="${getDirectionsUrl(place.lat, place.lng, place.name)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
            🧭 Get Directions ↗
          </a>
          <button type="button" id="btn-plan-for-place" class="btn btn-primary btn-sm">
            🗓️ Plan a Trip Here ➔
          </button>
        </div>
      </div>

      <!-- Non-Curated Community Notice -->
      ${!isCurated ? `
        <div style="background-color: #F8FAFC; border-left: 4px solid #3B82F6; padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); margin-bottom: var(--space-4); font-size: var(--font-size-xs); color: #334155;">
          <strong>ℹ️ Community Open Data:</strong> This place is sourced live from OpenStreetMap. Details, trail accessibility, and local transport may vary. We do not invent mock hosts, commercial prices, or unverified claims for community entries.
        </div>
      ` : ''}

      <!-- Main Layout Grid: Map (Left) + Overview/Weather (Right) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-6);">
        <!-- Interactive Leaflet Map -->
        <div class="card" style="padding: 0; overflow: hidden; height: 380px; position: relative;">
          <div id="place-map-canvas" style="width: 100%; height: 100%; min-height: 380px;"></div>
        </div>

        <!-- Wiki Extract & Weather Summary -->
        <div class="flow">
          <!-- Wikipedia Overview Card -->
          <div class="card" id="place-wiki-card" style="padding: var(--space-4);">
            <div class="flex-between" style="align-items: center; margin-bottom: var(--space-2);">
              <h3 style="margin: 0; font-size: 1.1rem; color: var(--color-primary);">📖 Place Information</h3>
              <span style="font-size: 0.75rem; color: var(--color-text-muted);">Source: Wikipedia</span>
            </div>
            <div id="place-wiki-content" style="font-size: var(--font-size-sm); line-height: 1.6; color: var(--color-text-main);">
              <div class="skeleton skeleton-text" style="width: 90%;"></div>
              <div class="skeleton skeleton-text" style="width: 75%;"></div>
              <div class="skeleton skeleton-text" style="width: 60%;"></div>
            </div>
          </div>

          <!-- Live Weather Card -->
          <div class="card" id="place-weather-card" style="padding: var(--space-4);">
            <div class="flex-between" style="align-items: center; margin-bottom: var(--space-2);">
              <h3 style="margin: 0; font-size: 1.1rem; color: var(--color-primary);">🌦️ Live Weather Forecast</h3>
              <span style="font-size: 0.75rem; color: var(--color-text-muted);">Weather data: Open-Meteo</span>
            </div>
            <div id="place-weather-content" style="font-size: var(--font-size-sm);">
              <div class="skeleton skeleton-rect" style="height: 60px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Nearby Things to See (Overpass API) -->
      <section class="card flow" id="place-attractions-section" style="padding: var(--space-5); margin-bottom: var(--space-6);">
        <div class="flex-between" style="align-items: center; flex-wrap: wrap; gap: var(--space-2);">
          <div>
            <h3 style="margin: 0; font-size: 1.25rem; color: var(--color-primary);">
              🏞️ Nearby Things to See & Explore (Within 10 km)
            </h3>
            <p style="margin: 2px 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted);">
              Authentic heritage landmarks, scenic viewpoints, local museums, and waterfalls from OpenStreetMap.
            </p>
          </div>
          <span class="badge badge-outline">Live Overpass Query</span>
        </div>

        <div id="place-attractions-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-3); margin-top: var(--space-3);">
          <div class="skeleton skeleton-rect" style="height: 90px;"></div>
          <div class="skeleton skeleton-rect" style="height: 90px;"></div>
          <div class="skeleton skeleton-rect" style="height: 90px;"></div>
        </div>
      </section>

      <!-- Supabase Community Reviews Container -->
      <section class="card flow" id="place-reviews-section" style="padding: var(--space-5);">
        <div id="place-reviews-container"></div>
      </section>
    </div>
  `;

  // Bind Asynchronous Modules & Map
  setTimeout(async () => {
    // 1. Initialize Leaflet Map
    const mapCanvas = container.querySelector('#place-map-canvas');
    if (mapCanvas && typeof L !== 'undefined') {
      try {
        const map = L.map(mapCanvas).setView([place.lat, place.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Main Place Pin
        const placeMarker = L.marker([place.lat, place.lng]).addTo(map);
        placeMarker.bindPopup(`<strong>${escapeHTML(place.name)}</strong><br>${escapeHTML(place.state)}`).openPopup();

        // 2. Load Nearby Attractions from Overpass & add markers to map
        loadNearbyAttractions(place, container, map);
      } catch (err) {
        console.warn('[YatraLocal] Leaflet init fallback:', err.message);
        if (mapCanvas) {
          mapCanvas.innerHTML = `
            <div style="padding: 24px; text-align: center; color: var(--color-text-muted);">
              <p>📍 Coordinates: ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}</p>
              <a href="${getDirectionsUrl(place.lat, place.lng, place.name)}" target="_blank" class="btn btn-outline btn-sm">Open in OpenStreetMap</a>
            </div>
          `;
        }
      }
    }

    // 3. Load Wikipedia description
    loadWikiDescription(place, container);

    // 4. Load Open-Meteo live weather
    loadWeather(place, container);

    // 5. Load Shared Reviews (Supabase)
    const reviewsBox = container.querySelector('#place-reviews-container');
    if (reviewsBox) {
      renderReviewsContainer(reviewsBox, place.placeKey, 'place', place.name);
    }

    // 6. Bind "Plan a Trip Here" CTA
    const planBtn = container.querySelector('#btn-plan-for-place');
    if (planBtn) {
      planBtn.addEventListener('click', () => {
        store.setState({
          preferences: {
            ...store.getState().preferences,
            destination: place.name,
            customPlace: place
          }
        });
        window.location.hash = '#/plan';
      });
    }
  }, 50);

  return container;
}

async function loadWikiDescription(place, container) {
  const contentEl = container.querySelector('#place-wiki-content');
  if (!contentEl) return;

  try {
    const data = await fetchPlaceDescription(place.name, place.lat, place.lng);
    if (data && data.extract) {
      contentEl.innerHTML = `
        <p style="margin: 0 0 var(--space-2);">${escapeHTML(data.extract)}</p>
        <a href="${data.url}" target="_blank" rel="noopener noreferrer" style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: bold; text-decoration: none;">
          Read more on ${data.source} ↗
        </a>
      `;
    } else {
      contentEl.innerHTML = `<p style="margin: 0; color: var(--color-text-muted);">No detailed encyclopedic article found for ${escapeHTML(place.name)}. Sourced from OpenStreetMap records.</p>`;
    }
  } catch (err) {
    contentEl.innerHTML = `<p style="margin: 0; color: var(--color-text-muted);">Place overview unavailable right now.</p>`;
  }
}

async function loadWeather(place, container) {
  const contentEl = container.querySelector('#place-weather-content');
  if (!contentEl) return;

  try {
    const weather = await fetchWeatherForecast(place.lat, place.lng);
    if (weather.success && weather.current) {
      contentEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 2rem;">${weather.current.icon}</span>
            <div>
              <strong style="display: block; font-size: 1.1rem; color: var(--color-primary);">${weather.current.condition}</strong>
              <span style="color: var(--color-text-muted); font-size: var(--font-size-xs);">${weather.current.minTemp}°C to ${weather.current.maxTemp}°C</span>
            </div>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            7-day conditions updated
          </div>
        </div>
      `;
    } else {
      contentEl.innerHTML = `<p style="margin: 0; color: var(--color-text-muted);">${weather.message || 'Live weather not available right now.'}</p>`;
    }
  } catch (_) {
    contentEl.innerHTML = `<p style="margin: 0; color: var(--color-text-muted);">Live weather forecast not available right now.</p>`;
  }
}

async function loadNearbyAttractions(place, container, map = null) {
  const gridEl = container.querySelector('#place-attractions-grid');
  if (!gridEl) return;

  try {
    const attractions = await fetchNearbyAttractions(place.lat, place.lng, { radiusMeters: 10000, limit: 12 });
    if (attractions && attractions.length > 0) {
      gridEl.innerHTML = '';
      attractions.forEach(act => {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.padding = 'var(--space-3)';
        item.style.border = '1px solid var(--color-border)';
        item.style.backgroundColor = '#FAFAFA';

        item.innerHTML = `
          <div class="flex gap-2" style="align-items: center; margin-bottom: 4px;">
            <span style="font-size: 1.2rem;">${act.icon}</span>
            <strong style="font-size: 0.9rem; color: var(--color-primary); line-height: 1.3;">${escapeHTML(act.name)}</strong>
          </div>
          <span style="display: inline-block; font-size: 0.72rem; color: var(--color-text-muted); margin-bottom: 4px;">
            ${escapeHTML(act.category)}
          </span>
          <div style="text-align: right;">
            <a href="${getDirectionsUrl(act.lat, act.lng, act.name)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: var(--color-primary); font-weight: bold; text-decoration: none;">
              Locate ↗
            </a>
          </div>
        `;
        gridEl.appendChild(item);

        // Add marker to map
        if (map && typeof L !== 'undefined') {
          const actMarker = L.circleMarker([act.lat, act.lng], {
            radius: 6,
            color: '#0D5C5B',
            fillColor: '#10B981',
            fillOpacity: 0.8,
            weight: 2
          }).addTo(map);
          actMarker.bindPopup(`<strong>${act.icon} ${escapeHTML(act.name)}</strong><br><small>${escapeHTML(act.category)}</small>`);
        }
      });
    } else {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 16px; text-align: center; color: var(--color-text-muted); font-size: var(--font-size-sm);">
          No specific tourist points marked in OpenStreetMap within 10 km. A serene, offbeat destination to explore with local guides!
        </div>
      `;
    }
  } catch (err) {
    gridEl.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 16px; text-align: center; color: var(--color-text-muted); font-size: var(--font-size-sm);">
        Nearby attractions data temporarily unavailable.
      </div>
    `;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
