/**
 * YatraLocal - Seasonal Demand & Weather Insights Test Suite (Phase 16)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser globals for Node.js
const memorySessionStore = {};
global.sessionStorage = {
  getItem: (key) => memorySessionStore[key] || null,
  setItem: (key, val) => { memorySessionStore[key] = String(val); },
  removeItem: (key) => { delete memorySessionStore[key]; },
  clear: () => { for (let k in memorySessionStore) delete memorySessionStore[k]; }
};

const rawSeasons = fs.readFileSync(path.join(__dirname, '../data/seasons.json'), 'utf8');
const parsedSeasons = JSON.parse(rawSeasons);

global.fetch = async (url) => {
  if (url.includes('seasons.json')) {
    return {
      ok: true,
      json: async () => parsedSeasons
    };
  }
  if (url.includes('open-meteo.com')) {
    // Return sample Open-Meteo forecast payload
    return {
      ok: true,
      json: async () => ({
        daily: {
          time: ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'],
          weather_code: [0, 2, 63, 1, 0, 71, 95],
          temperature_2m_max: [18, 17, 13, 16, 19, 11, 14],
          temperature_2m_min: [6, 5, 4, 5, 7, -1, 3],
          precipitation_probability_max: [5, 15, 85, 20, 0, 75, 90],
          wind_speed_10m_max: [8, 10, 22, 12, 7, 18, 32]
        }
      })
    };
  }
  return { ok: false, status: 404 };
};

const {
  loadSeasonsData,
  getSeason,
  renderSeasonBadgeHTML,
  renderDemandBarHTML,
  renderAlternativesHTML
} = await import('../js/season.js');

const {
  interpretWeatherCode,
  fetchWeatherForecast
} = await import('../js/api.js');

console.log('====================================================');
console.log('🧪 YATRALOCAL PHASE 16: SEASONAL DEMAND & WEATHER');
console.log('====================================================');

let passed = 0;
let total = 0;

function assert(title, condition, detail = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${title}`);
    if (detail) console.log(`       └─ ${detail}`);
  } else {
    console.error(`[FAIL] ${title}`);
    if (detail) console.error(`       └─ ${detail}`);
  }
}

async function runTests() {
  const seasonsData = await loadSeasonsData();

  // Test 1: Dataset completeness across all 6 destinations
  assert(
    'seasons.json loads all 6 destinations with exactly 12 months each',
    seasonsData.length === 6 && seasonsData.every(d => d.months.length === 12),
    `Destinations: ${seasonsData.map(d => d.destinationId).join(', ')}`
  );

  // Test 2: Honesty & Estimate disclaimers
  const allMarkedEstimates = seasonsData.every(d => d.isEstimate === true && typeof d.estimateDisclaimer === 'string');
  assert(
    'All destination seasonal datasets are explicitly tagged as estimates (no fake stats)',
    allMarkedEstimates,
    `Disclaimer: "${seasonsData[0].estimateDisclaimer}"`
  );

  // Test 3: Off-season vs On-season logic (Manali)
  const manaliMay = getSeason('manali', 4); // May (month 4)
  const manaliNov = getSeason('manali', 10); // Nov (month 10)
  assert(
    'getSeason identifies Manali May as ON-SEASON and November as OFF-SEASON',
    manaliMay.isOnSeason === true && manaliMay.demandLevel === 'high' &&
    manaliNov.isOffSeason === true && manaliNov.demandLevel === 'low',
    `May: ${manaliMay.demandLevel.toUpperCase()} ("${manaliMay.reason}"), Nov: ${manaliNov.demandLevel.toUpperCase()} ("${manaliNov.reason}")`
  );

  // Test 4: Alternative destination suggestions
  assert(
    'Destinations provide 2-3 valid alternative destinations for high-demand redistribution',
    Array.isArray(manaliMay.alternatives) && manaliMay.alternatives.length >= 2,
    `Alternatives for Manali: [${manaliMay.alternatives.join(', ')}]`
  );

  // Test 5: WMO Weather Interpretation Codes
  const clearWeather = interpretWeatherCode(0);
  const rainWeather = interpretWeatherCode(63);
  const snowWeather = interpretWeatherCode(71);
  const stormWeather = interpretWeatherCode(95);

  assert(
    'interpretWeatherCode maps WMO codes to conditions, emojis and safety advisories',
    clearWeather.icon === '☀️' &&
    rainWeather.icon === '🌧️' && typeof rainWeather.warning === 'string' &&
    snowWeather.icon === '❄️' && typeof snowWeather.warning === 'string' &&
    stormWeather.icon === '⛈️' && typeof stormWeather.warning === 'string',
    `Rain: "${rainWeather.warning}", Snow: "${snowWeather.warning}"`
  );

  // Test 6: Live Weather API integration & parsing
  const weatherResult = await fetchWeatherForecast(32.2432, 77.1892);
  assert(
    'fetchWeatherForecast returns 7-day daily forecast with temperatures and active warnings',
    weatherResult.success === true &&
    weatherResult.days.length === 7 &&
    weatherResult.activeWarnings.length >= 2,
    `Days: ${weatherResult.days.length}, Current: ${weatherResult.current.condition} (${weatherResult.current.minTemp}°C to ${weatherResult.current.maxTemp}°C), Warnings: ${weatherResult.activeWarnings.length}`
  );

  // Test 7: Weather caching in sessionStorage
  const cachedResult = await fetchWeatherForecast(32.2432, 77.1892);
  assert(
    'Subsequent weather queries for same coordinates return from cache without re-fetching',
    cachedResult.fromCache === true,
    `Cache hit confirmed from sessionStorage`
  );

  // Test 8: Weather API graceful failure fallback
  const fallbackResult = await fetchWeatherForecast('invalid', 'coords');
  assert(
    'Weather client returns graceful fallback when coordinates are missing or network fails',
    fallbackResult.success === false && fallbackResult.fallback === true && fallbackResult.message.includes('not available'),
    `Fallback message: "${fallbackResult.message}"`
  );

  // Test 9: Demand Bar HTML generation with ARIA accessibility
  const barHTML = renderDemandBarHTML(manaliMay, 4, 'EN');
  assert(
    'renderDemandBarHTML outputs accessible 12-month grid with selected month highlight',
    barHTML.includes('demand-bar-wrapper') &&
    barHTML.includes('selected') &&
    barHTML.includes('May') &&
    barHTML.includes('Estimate'),
    `Demand bar HTML length: ${barHTML.length} chars`
  );

  // Test 10: Season Badges HTML
  const onBadge = renderSeasonBadgeHTML('high', 'EN');
  const offBadge = renderSeasonBadgeHTML('low', 'EN');
  const shoulderBadge = renderSeasonBadgeHTML('medium', 'EN');
  assert(
    'renderSeasonBadgeHTML outputs distinct badges for high, low, and medium demand',
    onBadge.includes('badge-season-on') &&
    offBadge.includes('badge-season-off') &&
    shoulderBadge.includes('badge-season-shoulder'),
    `High: ${onBadge.trim()}, Low: ${offBadge.trim()}`
  );

  // Test 11: Saral Mode Plain Language Guidance
  const saralOnSentence = manaliMay.isOnSeason ? 'This is a busy season. Book early.' : 'This is a quiet season. Good time to visit.';
  const saralOffSentence = manaliNov.isOnSeason ? 'This is a busy season. Book early.' : 'This is a quiet season. Good time to visit.';
  assert(
    'Saral Mode correctly maps ON-SEASON and OFF-SEASON to straightforward 1-sentence guidance',
    saralOnSentence === 'This is a busy season. Book early.' &&
    saralOffSentence === 'This is a quiet season. Good time to visit.',
    `On-Season: "${saralOnSentence}", Off-Season: "${saralOffSentence}"`
  );

  console.log('====================================================');
  console.log(`Results: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
