/**
 * YatraLocal - India-Wide Place Search & Open Data Engine (/js/places.js)
 * 
 * Powered by:
 * 1. Photon API (photon.komoot.io) with India bounding box (68.1,6.7,97.4,35.7)
 * 2. Nominatim OpenStreetMap fallback adhering to fair-use rate policy (1 req/sec)
 * 3. Wikipedia REST API for clean plain-text cultural/historical extracts
 * 4. Overpass API for nearby heritage, attractions, viewpoints & waterfalls
 * 5. Open-Meteo for 7-day live mountain & plains forecasts
 */

const PHOTON_URL = 'https://photon.komoot.io/api/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const WIKIPEDIA_URL = 'https://en.wikipedia.org/w/api.php';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const SEARCH_CACHE_PREFIX = 'yl_place_search_';
const OVERPASS_CACHE_PREFIX = 'yl_overpass_';
const WIKI_CACHE_PREFIX = 'yl_wiki_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let lastNominatimRequestTime = 0;

/**
 * Searches places across India using Photon API with Nominatim fallback
 */
export async function searchPlacesInIndia(query, { signal = null, timeoutMs = 5000 } = {}) {
  const cleanQ = (query || '').trim();
  if (cleanQ.length < 3) return [];

  // Check sessionStorage cache
  const cacheKey = `${SEARCH_CACHE_PREFIX}${cleanQ.toLowerCase()}`;
  if (typeof sessionStorage !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const item = JSON.parse(cached);
        if (Date.now() - item.time < CACHE_TTL_MS) {
          return item.results;
        }
      }
    } catch (_) {}
  }

  // 1. Try Photon API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Bounding box for India: roughly [minLng, minLat, maxLng, maxLat] = [68.1, 6.7, 97.4, 35.7]
    const photonEndpoint = `${PHOTON_URL}?q=${encodeURIComponent(cleanQ)}&bbox=68.1,6.7,97.4,35.7&limit=10`;

    const res = await fetch(photonEndpoint, {
      signal: signal || controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const parsed = data.features
          .filter(f => {
            const p = f.properties || {};
            const country = (p.country || '').toLowerCase();
            return country === 'india' || country === 'in' || !p.country; // Photon sometimes leaves country blank within bbox
          })
          .map(f => {
            const p = f.properties || {};
            const coords = f.geometry && f.geometry.coordinates ? f.geometry.coordinates : [0, 0];
            const osmType = p.osm_type ? p.osm_type.toLowerCase() : 'node';
            const osmId = p.osm_id || Math.random().toString(36).substring(2, 9);
            const name = p.name || cleanQ;
            const state = p.state || '';
            const district = p.district || p.county || '';
            const type = p.osm_value || p.type || 'place';

            return {
              placeKey: `osm:${osmType}:${osmId}`,
              name,
              displayName: [name, district, state, 'India'].filter(Boolean).join(', '),
              state,
              district,
              lat: coords[1],
              lng: coords[0],
              source: 'osm',
              category: type,
              attribution: 'OpenStreetMap contributors via Photon'
            };
          });

        if (parsed.length > 0) {
          cacheResults(cacheKey, parsed);
          return parsed;
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('[YatraLocal] Photon search failed, falling back to Nominatim:', err.message);
  }

  // 2. Fallback to Nominatim (with strict 1 req/sec rate limit)
  try {
    const now = Date.now();
    const elapsed = now - lastNominatimRequestTime;
    if (elapsed < 1000) {
      await new Promise(r => setTimeout(r, 1000 - elapsed));
    }
    lastNominatimRequestTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const nominatimEndpoint = `${NOMINATIM_URL}?q=${encodeURIComponent(cleanQ)}&countrycodes=in&format=json&addressdetails=1&limit=6`;
    const res = await fetch(nominatimEndpoint, {
      signal: signal || controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const parsed = data.map(item => {
          const addr = item.address || {};
          const osmType = item.osm_type || 'node';
          const osmId = item.osm_id;
          const name = item.name || cleanQ;
          const state = addr.state || '';
          const district = addr.state_district || addr.county || addr.district || '';

          return {
            placeKey: `osm:${osmType}:${osmId}`,
            name,
            displayName: item.display_name || `${name}, ${state}, India`,
            state,
            district,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            source: 'osm',
            category: item.type || item.class || 'place',
            attribution: '© OpenStreetMap contributors'
          };
        });

        cacheResults(cacheKey, parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[YatraLocal] Nominatim fallback failed:', err.message);
  }

  return [];
}

function cacheResults(key, data) {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(key, JSON.stringify({ time: Date.now(), results: data }));
    } catch (_) {}
  }
}

/**
 * Fetches Wikipedia/Wikivoyage cultural extract for a place
 */
export async function fetchPlaceDescription(placeName, lat = null, lng = null) {
  if (!placeName) return null;
  const cacheKey = `${WIKI_CACHE_PREFIX}${placeName.toLowerCase()}`;

  if (typeof sessionStorage !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}
  }

  // 1. Try Title Search
  try {
    const url = `${WIKIPEDIA_URL}?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(placeName)}&format=json&origin=*`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.query && data.query.pages) {
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId && pageId !== '-1' && pages[pageId].extract) {
          const result = {
            extract: pages[pageId].extract.slice(0, 480) + (pages[pageId].extract.length > 480 ? '...' : ''),
            title: pages[pageId].title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pages[pageId].title)}`,
            source: 'Wikipedia'
          };
          if (typeof sessionStorage !== 'undefined') {
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(result));
            } catch (_) {}
          }
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('[YatraLocal] Wikipedia title search failed:', err.message);
  }

  // 2. Geo-Search fallback if coordinates provided
  if (lat && lng) {
    try {
      const geoUrl = `${WIKIPEDIA_URL}?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=8000&ggslimit=1&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.query && data.query.pages) {
          const pageId = Object.keys(data.query.pages)[0];
          if (pageId) {
            const page = data.query.pages[pageId];
            const result = {
              extract: page.extract ? (page.extract.slice(0, 480) + '...') : `Historical region near ${placeName}.`,
              title: page.title,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
              source: 'Wikipedia'
            };
            if (typeof sessionStorage !== 'undefined') {
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify(result));
              } catch (_) {}
            }
            return result;
          }
        }
      }
    } catch (_) {}
  }

  return {
    extract: `${placeName} is a local destination documented in OpenStreetMap.`,
    title: placeName,
    url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(placeName)}`,
    source: 'OpenStreetMap'
  };
}

/**
 * Fetches nearby attractions, viewpoints, museums & waterfalls from Overpass API (radius 10km)
 */
export async function fetchNearbyAttractions(lat, lng, { radiusMeters = 10000, limit = 15 } = {}) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return [];

  const cacheKey = `${OVERPASS_CACHE_PREFIX}${numLat.toFixed(3)}_${numLng.toFixed(3)}`;
  if (typeof sessionStorage !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const item = JSON.parse(cached);
        if (Date.now() - item.time < CACHE_TTL_MS) return item.data;
      }
    } catch (_) {}
  }

  const query = `
    [out:json][timeout:6];
    (
      node["tourism"~"attraction|viewpoint|museum|artwork"](around:${radiusMeters},${numLat},${numLng});
      node["historic"](around:${radiusMeters},${numLat},${numLng});
      node["natural"~"waterfall|peak|cave_entrance"](around:${radiusMeters},${numLat},${numLng});
    );
    out body ${limit};
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.elements)) {
        const attractions = json.elements
          .map(el => {
            const tags = el.tags || {};
            const name = tags.name || tags['name:en'] || tags['name:hi'];
            if (!name) return null;

            let category = 'Attraction';
            let icon = '📍';
            if (tags.tourism === 'viewpoint') { category = 'Scenic Viewpoint'; icon = '🌄'; }
            else if (tags.tourism === 'museum') { category = 'Local Museum'; icon = '🏛️'; }
            else if (tags.historic) { category = 'Heritage Site (' + (tags.historic || 'historic') + ')'; icon = '🏰'; }
            else if (tags.natural === 'waterfall') { category = 'Waterfall'; icon = '💧'; }
            else if (tags.natural === 'peak') { category = 'Mountain Peak'; icon = '⛰️'; }

            return {
              id: `osm_act_${el.id}`,
              name,
              category,
              icon,
              lat: el.lat,
              lng: el.lon,
              tags: Object.keys(tags).filter(k => !k.startsWith('name') && tags[k].length < 20).slice(0, 3)
            };
          })
          .filter(Boolean)
          .slice(0, limit);

        if (typeof sessionStorage !== 'undefined') {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: attractions }));
          } catch (_) {}
        }
        return attractions;
      }
    }
  } catch (err) {
    console.warn('[YatraLocal] Overpass API query failed or timed out:', err.message);
  }

  // Graceful fallback: return empty list or general nature exploration point
  return [];
}
