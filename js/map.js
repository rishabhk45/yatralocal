/**
 * YatraLocal - Interactive Map Service (Leaflet + OpenStreetMap)
 * 
 * Capabilities:
 * 1. Safe detection of Leaflet CDN / offline fallback.
 * 2. Day-wise color-coded route rendering with polyline and numbered markers.
 * 3. Crowd-aware layer toggling (popular in red #C5221F, offbeat in green #1E6F5C).
 * 4. Stays and guides pin visualization with verified host callouts and click-to-drawer.
 * 5. Haversine distance calculator between geographic coordinates.
 * 6. External deep-link directions generator (Google Maps / OpenStreetMap, no API key).
 * 7. Saral Mode accessible map view (high-contrast large markers, simplified cards).
 * 8. Strict OpenStreetMap attribution compliance.
 */

// Haversine formula to compute great-circle distance in kilometers
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

// Generate external directions deep link without an API key
export function getDirectionsUrl(lat, lng, label = '', provider = 'google') {
  if (provider === 'osm') {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lat}%2C${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(label)}`;
}

// Palette for itinerary day routes
export const DAY_PALETTE = [
  '#0D5C5B', // Day 1: Deep Teal
  '#C85A17', // Day 2: Terracotta / Amber
  '#2563EB', // Day 3: Blue
  '#7C3AED', // Day 4: Purple
  '#059669', // Day 5: Emerald
  '#DB2777'  // Day 6+: Pink
];

export class YatraMap {
  /**
   * @param {HTMLElement|string} container - Element or container ID
   * @param {Object} options - Custom map options
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.options = Object.assign({
      center: [32.2432, 77.1892],
      zoom: 12,
      isSaral: false
    }, options);

    this.map = null;
    this.layers = {
      routes: [],
      markers: [],
      crowdLayer: null
    };
    this.isLeafletAvailable = typeof window !== 'undefined' && Boolean(window.L && window.L.map);
  }

  /**
   * Initializes Leaflet map or displays accessible offline fallback
   */
  init() {
    if (!this.container) return false;

    if (!this.isLeafletAvailable) {
      this.renderFallback('Interactive map engine is currently loading or offline. Standard list view with walking distances is active.');
      return false;
    }

    try {
      // Clear container contents
      this.container.innerHTML = '';

      this.map = window.L.map(this.container, {
        center: this.options.center,
        zoom: this.options.zoom,
        zoomControl: true,
        scrollWheelZoom: !this.options.isSaral
      });

      // Standard OpenStreetMap TileLayer with compulsory attribution
      const osmLayer = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors • <span style="color:#0D5C5B;font-weight:600;">YatraLocal</span>'
      });

      osmLayer.addTo(this.map);

      // Handle tile error gracefully
      osmLayer.on('tileerror', () => {
        console.warn('YatraLocal: Some OSM map tiles failed to load (offline or bandwidth limit).');
      });

      return true;
    } catch (err) {
      console.error('YatraLocal Map Init Error:', err);
      this.renderFallback('Map tiles temporarily unavailable. Distance details and directions are available below.');
      return false;
    }
  }

  /**
   * Fallback UI if CDN/network fails
   */
  renderFallback(message) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="map-fallback-banner" style="background:#FBF8F3;border:2px dashed #0D5C5B;border-radius:12px;padding:24px;text-align:center;color:#1F2937;">
        <div style="font-size:2rem;margin-bottom:8px;">🗺️</div>
        <h3 style="margin:0 0 6px 0;font-size:1.15rem;color:#0D5C5B;">Interactive Map Fallback</h3>
        <p style="margin:0 auto 12px auto;max-width:440px;font-size:0.875rem;color:#4B5563;">${message}</p>
        <span class="badge" style="background:#E6F4F1;color:#0D5C5B;font-weight:600;">Offline-Resilient List Mode Active</span>
      </div>
    `;
  }

  /**
   * Clear all active markers, polylines and overlays
   */
  clear() {
    if (!this.map) return;
    this.layers.markers.forEach(m => this.map.removeLayer(m));
    this.layers.routes.forEach(r => this.map.removeLayer(r));
    if (this.layers.crowdLayer) {
      this.map.removeLayer(this.layers.crowdLayer);
      this.layers.crowdLayer = null;
    }
    this.layers.markers = [];
    this.layers.routes = [];
  }

  /**
   * Render Day-Wise Itinerary on Map
   * @param {Array} days - List of day objects with activities
   * @param {number|null} activeDayNumber - Optional filter for single day
   * @param {boolean} crowdMode - Whether to shade crowd layer
   */
  renderItinerary(days = [], activeDayNumber = null, crowdMode = false) {
    if (!this.map) return;
    this.clear();

    const allLatLngs = [];
    const isSaral = this.options.isSaral;

    days.forEach((dayObj, dayIdx) => {
      const dayNum = dayObj.day || dayIdx + 1;
      if (activeDayNumber !== null && dayNum !== activeDayNumber) {
        return; // Filtered out
      }

      const dayColor = DAY_PALETTE[dayIdx % DAY_PALETTE.length];
      const routePoints = [];

      (dayObj.activities || []).forEach((act, actIdx) => {
        if (act.lat == null || act.lng == null) return;
        const latLng = [act.lat, act.lng];
        routePoints.push(latLng);
        allLatLngs.push(latLng);

        // Marker color: if crowdMode, red for high/medium crowd, green for low/hidden-gem
        let markerBg = dayColor;
        if (crowdMode) {
          markerBg = (act.crowdLevel === 'low' || act.isHiddenGem) ? '#1E6F5C' : '#C5221F';
        }

        const markerNumber = `${dayNum}.${actIdx + 1}`;
        const markerSize = isSaral ? 44 : 32;

        const iconHtml = `
          <div class="yatra-marker ${crowdMode ? 'crowd-mode' : ''}" style="
            background: ${markerBg};
            color: #FFFFFF;
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: ${isSaral ? '16px' : '12px'};
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            ${markerNumber}
          </div>
        `;

        const customIcon = window.L.divIcon({
          html: iconHtml,
          className: 'yatra-div-icon',
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
          popupAnchor: [0, -markerSize / 2]
        });

        const directionsGoogle = getDirectionsUrl(act.lat, act.lng, act.name, 'google');
        const directionsOsm = getDirectionsUrl(act.lat, act.lng, act.name, 'osm');

        const popupContent = `
          <div class="map-popup-card" style="font-family:var(--font-family-body, sans-serif);min-width:220px;padding:4px;">
            <div style="font-size:0.75rem;font-weight:700;color:${dayColor};text-transform:uppercase;margin-bottom:2px;">
              Day ${dayNum} • Stop ${actIdx + 1}
            </div>
            <h4 style="margin:0 0 6px 0;font-size:0.95rem;color:#111827;line-height:1.3;">${act.name}</h4>
            <div style="font-size:0.8rem;color:#4B5563;margin-bottom:6px;">
              📍 ${act.area || 'Scenic Destination'}
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
              <span class="badge" style="background:${act.crowdLevel === 'low' ? '#DCFCE7' : '#FEE2E2'};color:${act.crowdLevel === 'low' ? '#166534' : '#991B1B'};font-size:0.75rem;">
                ${act.crowdLevel === 'low' ? '🟢 Low Crowd' : '🔴 Popular / High Crowd'}
              </span>
              ${act.isHiddenGem ? '<span class="badge" style="background:#FEF3C7;color:#92400E;font-size:0.75rem;">💎 Offbeat Gem</span>' : ''}
              <span class="badge" style="background:#F3F4F6;color:#374151;font-size:0.75rem;">₹${act.cost || 0}</span>
            </div>
            ${crowdMode && (act.crowdLevel !== 'low') ? `
              <div style="background:#FEF2F2;border-left:3px solid #EF4444;padding:6px;border-radius:4px;font-size:0.75rem;color:#991B1B;margin-bottom:8px;">
                <strong>💡 Crowd-Avoidance Tip:</strong> Visit before 9:00 AM or consider nearby offbeat alternatives.
              </div>
            ` : ''}
            <div style="display:flex;gap:6px;border-top:1px solid #E5E7EB;padding-top:8px;">
              <a href="${directionsGoogle}" target="_blank" rel="noopener" class="btn btn-sm btn-primary" style="flex:1;text-align:center;text-decoration:none;font-size:0.75rem;padding:6px 8px;">
                🚗 Directions (Google)
              </a>
              <a href="${directionsOsm}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" style="text-align:center;text-decoration:none;font-size:0.75rem;padding:6px 8px;" title="OpenStreetMap Directions">
                OSM ↗
              </a>
            </div>
          </div>
        `;

        const marker = window.L.marker(latLng, { icon: customIcon }).bindPopup(popupContent);
        marker.addTo(this.map);
        this.layers.markers.push(marker);
      });

      // Draw polyline connecting day's sequential stops
      if (routePoints.length > 1) {
        const polyline = window.L.polyline(routePoints, {
          color: dayColor,
          weight: isSaral ? 5 : 3.5,
          opacity: 0.85,
          dashArray: '6, 6'
        }).addTo(this.map);
        this.layers.routes.push(polyline);
      }
    });

    if (allLatLngs.length > 0) {
      this.fitAll(allLatLngs);
    }
  }

  /**
   * Render Local Stays & Guides on Map
   * @param {Array} items - Homestay and Guide objects
   * @param {Object} options - { onSelect: Function, anchorCoord: [lat, lng] }
   */
  renderStaysAndGuides(items = [], options = {}) {
    if (!this.map) return;
    this.clear();

    const allLatLngs = [];
    const isSaral = this.options.isSaral;
    const anchor = options.anchorCoord || null; // First activity of itinerary for distance

    items.forEach((item) => {
      if (item.lat == null || item.lng == null) return;
      const latLng = [item.lat, item.lng];
      allLatLngs.push(latLng);

      const isStay = item.type === 'stay';
      const isVerified = Boolean(item.verified);
      const iconEmoji = isStay ? '🏡' : '🎓';
      const bg = isStay ? (isVerified ? '#0D5C5B' : '#0369A1') : '#C85A17';
      const markerSize = isSaral ? 44 : 36;

      const iconHtml = `
        <div class="yatra-host-marker" style="
          background: ${bg};
          color: #FFFFFF;
          width: ${markerSize}px;
          height: ${markerSize}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSaral ? '20px' : '16px'};
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          cursor: pointer;
        ">
          ${iconEmoji}
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'yatra-div-icon',
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
        popupAnchor: [0, -markerSize / 2]
      });

      // Calculate distance from anchor if provided
      let distanceBadge = '';
      if (anchor && anchor[0] && anchor[1]) {
        const distKm = calculateDistanceKm(anchor[0], anchor[1], item.lat, item.lng);
        if (distKm != null) {
          distanceBadge = `
            <div style="font-size:0.75rem;color:#0D5C5B;background:#E6F4F1;padding:3px 6px;border-radius:4px;display:inline-block;margin-bottom:6px;">
              📏 <strong>${distKm} km</strong> from Day 1 start
            </div>
          `;
        }
      }

      const directionsUrl = getDirectionsUrl(item.lat, item.lng, item.name, 'google');

      const popupContent = `
        <div class="map-popup-card" style="font-family:var(--font-family-body, sans-serif);min-width:240px;padding:4px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span class="badge" style="background:${isStay ? '#E6F4F1' : '#FEF3C7'};color:${isStay ? '#0D5C5B' : '#92400E'};font-size:0.7rem;">
              ${isStay ? 'Homestay' : 'Local Guide'}
            </span>
            ${isVerified ? '<span class="badge" style="background:#DCFCE7;color:#166534;font-size:0.7rem;">✓ Verified Local</span>' : ''}
          </div>
          <h4 style="margin:0 0 4px 0;font-size:1rem;color:#111827;">${item.name}</h4>
          <div style="font-size:0.8rem;color:#4B5563;margin-bottom:6px;">📍 ${item.area}</div>
          ${distanceBadge}
          <div style="font-size:0.85rem;font-weight:700;color:#0D5C5B;margin-bottom:8px;">
            ${isStay ? `₹${item.pricePerNight} <span style="font-weight:400;font-size:0.75rem;">/ night</span>` : `₹${item.pricePerDay} <span style="font-weight:400;font-size:0.75rem;">/ day</span>`}
          </div>
          <div style="display:flex;gap:6px;border-top:1px solid #E5E7EB;padding-top:8px;">
            <button type="button" class="btn btn-sm btn-primary btn-popup-select" data-id="${item.id}" data-type="${item.type}" style="flex:1;padding:6px;font-size:0.75rem;">
              View Details ➔
            </button>
            <a href="${directionsUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" style="text-decoration:none;font-size:0.75rem;padding:6px 8px;">
              Directions ↗
            </a>
          </div>
        </div>
      `;

      const marker = window.L.marker(latLng, { icon: customIcon }).bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.querySelector(`.btn-popup-select[data-id="${item.id}"]`);
        if (btn && typeof options.onSelect === 'function') {
          btn.addEventListener('click', () => {
            options.onSelect(item);
          }, { once: true });
        }
      });

      marker.addTo(this.map);
      this.layers.markers.push(marker);
    });

    if (allLatLngs.length > 0) {
      this.fitAll(allLatLngs);
    }
  }

  /**
   * Fit map viewport to surround all coordinates
   */
  fitAll(latLngs = null) {
    if (!this.map) return;
    const target = latLngs || this.layers.markers.map(m => m.getLatLng());
    if (target.length === 0) return;

    try {
      const bounds = window.L.latLngBounds(target);
      this.map.fitBounds(bounds, {
        padding: [35, 35],
        maxZoom: 15,
        animate: true
      });
    } catch (err) {
      console.warn('YatraLocal: fitAll bounds computation fallback:', err);
    }
  }

  /**
   * Recalculate container size (essential after tab/modal toggle)
   */
  invalidateSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }
}
