/**
 * YatraLocal - Weather & External Forecast API Client (/js/api.js)
 * 
 * Powered by Open-Meteo Free Forecast API (No API Key Required).
 * Features:
 * 1. 5-second AbortController timeout with 1 automatic retry.
 * 2. 15-minute sessionStorage caching to prevent repetitive network requests.
 * 3. WMO Weather Interpretation Code (WW) mapping to human labels, icons & safety alerts.
 * 4. Graceful offline/error fallback; never crashes the UI.
 * 5. Transparent attribution: "Weather data: Open-Meteo".
 */

const CACHE_PREFIX = 'yl_weather_cache_';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TIMEOUT_MS = 5000; // 5 seconds

/**
 * Maps WMO weather interpretation codes to readable conditions and icons
 */
export function interpretWeatherCode(code) {
  const c = Number(code);
  if (c === 0) {
    return { condition: 'Clear Sky', icon: '☀️', warning: null };
  } else if (c === 1 || c === 2) {
    return { condition: 'Mainly Clear / Partly Cloudy', icon: '🌤️', warning: null };
  } else if (c === 3) {
    return { condition: 'Overcast', icon: '☁️', warning: null };
  } else if (c === 45 || c === 48) {
    return { condition: 'Fog & Mist', icon: '🌫️', warning: 'Dense morning fog expected: allow extra driving time on mountain trails.' };
  } else if (c >= 51 && c <= 55) {
    return { condition: 'Drizzle', icon: '🌦️', warning: 'Light drizzle: carry an umbrella or light rain poncho.' };
  } else if (c >= 61 && c <= 65) {
    return {
      condition: c >= 63 ? 'Moderate to Heavy Rain' : 'Light Rain',
      icon: '🌧️',
      warning: 'Rain expected: check local road conditions and carry rain gear.'
    };
  } else if (c >= 71 && c <= 77) {
    return {
      condition: 'Snowfall',
      icon: '❄️',
      warning: 'Snowfall expected: pack thermal layers, sturdy boots, and check pass accessibility.'
    };
  } else if (c >= 80 && c <= 82) {
    return {
      condition: 'Rain Showers',
      icon: '🌧️',
      warning: 'Passing rain showers: consider indoor museum visits during afternoons.'
    };
  } else if (c >= 85 && c <= 86) {
    return {
      condition: 'Snow Showers',
      icon: '🌨️',
      warning: 'Intermittent snow showers: slippery mountain walking trails.'
    };
  } else if (c >= 95 && c <= 99) {
    return {
      condition: 'Thunderstorm',
      icon: '⛈️',
      warning: 'Thunderstorm advisory: avoid open ridge treks and stay near covered shelters.'
    };
  }
  return { condition: 'Fair Weather', icon: '🌤️', warning: null };
}

/**
 * Fetches 7-day weather forecast from Open-Meteo with caching, timeout & retry
 */
export async function fetchWeatherForecast(lat, lng, { retryCount = 1 } = {}) {
  const numLat = Number(lat);
  const numLng = Number(lng);

  if (isNaN(numLat) || isNaN(numLng)) {
    return {
      success: false,
      fallback: true,
      message: 'Coordinates not provided; live weather not available right now.',
      attribution: 'Weather data: Open-Meteo'
    };
  }

  // 1. Check sessionStorage cache
  const cacheKey = `${CACHE_PREFIX}${numLat.toFixed(4)}_${numLng.toFixed(4)}`;
  if (typeof sessionStorage !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return {
            ...parsed.data,
            fromCache: true
          };
        }
      }
    } catch (_) {
      // Ignore cache storage errors
    }
  }

  // 2. Fetch with AbortController timeout & 1 retry
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${numLat}&longitude=${numLng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

  let lastError = null;
  const attempts = 1 + Math.max(0, retryCount);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

    try {
      const response = await fetch(url, {
        signal: controller ? controller.signal : undefined,
        headers: { 'Accept': 'application/json' }
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP ${response.status}`);
      }

      const raw = await response.json();
      const daily = raw.daily || {};
      const dates = daily.time || [];

      // Process 7-day daily forecast
      const daysForecast = dates.map((dateStr, idx) => {
        const code = daily.weather_code?.[idx] ?? 0;
        const maxTemp = Math.round(daily.temperature_2m_max?.[idx] ?? 22);
        const minTemp = Math.round(daily.temperature_2m_min?.[idx] ?? 14);
        const precipProb = daily.precipitation_probability_max?.[idx] ?? 0;
        const windSpeed = Math.round(daily.wind_speed_10m_max?.[idx] ?? 8);
        const { condition, icon, warning } = interpretWeatherCode(code);

        const dateObj = new Date(dateStr);
        const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        return {
          date: dateStr,
          dayLabel,
          code,
          condition,
          icon,
          maxTemp,
          minTemp,
          precipProb,
          windSpeed,
          warning
        };
      });

      // Extract active warnings across the 7-day window
      const activeWarnings = daysForecast
        .map(d => d.warning)
        .filter(Boolean)
        .filter((w, i, arr) => arr.indexOf(w) === i); // unique

      const result = {
        success: true,
        fallback: false,
        attribution: 'Weather data: Open-Meteo',
        attributionUrl: 'https://open-meteo.com/',
        coordinates: { lat: numLat, lng: numLng },
        current: daysForecast[0] || null,
        days: daysForecast,
        activeWarnings,
        timestamp: Date.now()
      };

      // Store in sessionStorage cache
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: result
          }));
        } catch (_) {}
      }

      return result;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;
      // Wait 300ms before retrying if attempts left
      if (attempt < attempts) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  // Graceful failure fallback: never throws, preserves full UI stability
  return {
    success: false,
    fallback: true,
    message: 'Live weather not available right now',
    detail: lastError ? lastError.message : 'Network timeout or offline',
    attribution: 'Weather data: Open-Meteo'
  };
}
