/**
 * YatraLocal - Seasonality & Demand Engine (/js/season.js)
 * 
 * Provides:
 * 1. 12-month demand intelligence (Low = OFF-SEASON, Medium = SHOULDER, High = ON-SEASON).
 * 2. Visual 12-month demand bars with accessible ARIA labels.
 * 3. On-season crowd advisories + Open-Meteo live weather integration.
 * 4. Off-season host offer promotions & peaceful hamlet highlights.
 * 5. Less-crowded alternative destination suggestions.
 * 6. Saral mode plain-language reassurance with bilingual speech output.
 */

import { fetchWeatherForecast } from './api.js';

let seasonsCache = null;

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
];

const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_SHORT_HI = ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सितं', 'अक्टू', 'नव', 'दिसं'];

/**
 * Loads /data/seasons.json with caching
 */
export async function loadSeasonsData() {
  if (seasonsCache) return seasonsCache;

  const candidateUrls = [
    'data/seasons.json',
    '../data/seasons.json',
    '/data/seasons.json'
  ];

  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        seasonsCache = await resp.json();
        return seasonsCache;
      }
    } catch (_) {}
  }

  console.warn('[SeasonEngine] Using fallback seasons dataset');
  return [];
}

/**
 * Normalizes destination ID string (handles 'Manali', 'manali', 'manali, himachal pradesh')
 */
export function normalizeDestinationId(dest) {
  if (!dest) return 'manali';
  const str = String(dest).toLowerCase().trim();
  if (str.includes('manali')) return 'manali';
  if (str.includes('varanasi') || str.includes('kashi')) return 'varanasi';
  if (str.includes('jaipur')) return 'jaipur';
  if (str.includes('rishikesh')) return 'rishikesh';
  if (str.includes('hampi')) return 'hampi';
  if (str.includes('munnar')) return 'munnar';
  return 'manali';
}

/**
 * Synchronously retrieves season data from loaded cache
 */
export function getSeason(destinationId, month = null, seasonsList = null) {
  const normId = normalizeDestinationId(destinationId);
  const dataList = seasonsList || seasonsCache || [];
  const destData = dataList.find(d => d.destinationId === normId) || {
    destinationId: normId,
    destinationName: normId.charAt(0).toUpperCase() + normId.slice(1),
    isEstimate: true,
    estimateDisclaimer: 'Seasonality is an estimate based on general travel patterns, not live booking data.',
    alternatives: ['rishikesh', 'munnar'],
    months: []
  };

  const currentMonthIdx = (typeof month === 'number' && month >= 0 && month <= 11)
    ? month
    : new Date().getMonth();

  const monthRecord = (destData.months || []).find(m => m.month === currentMonthIdx) || {
    month: currentMonthIdx,
    name: MONTH_NAMES_EN[currentMonthIdx],
    demandLevel: 'medium',
    reason: 'Typical seasonal travel patterns'
  };

  const level = monthRecord.demandLevel || 'medium';

  return {
    destinationId: normId,
    destinationName: destData.destinationName,
    state: destData.state || '',
    month: currentMonthIdx,
    monthName: MONTH_NAMES_EN[currentMonthIdx],
    demandLevel: level,
    reason: monthRecord.reason,
    isOnSeason: level === 'high',
    isOffSeason: level === 'low',
    isShoulder: level === 'medium',
    isEstimate: true,
    estimateDisclaimer: destData.estimateDisclaimer,
    alternatives: destData.alternatives || [],
    allMonths: destData.months || []
  };
}

/**
 * Generates an accessible, color-coded Season Badge
 */
export function renderSeasonBadgeHTML(demandLevel, lang = 'EN') {
  const isHi = lang === 'HI';
  if (demandLevel === 'low') {
    return `
      <span class="badge badge-season-off" role="status" aria-label="${isHi ? 'ऑफ-सीजन: कम भीड़ और बेहतर छूट' : 'Off-season: fewer crowds'}">
        🟢 ${isHi ? 'ऑफ-सीजन: शांत वातावरण' : 'Off-season: fewer crowds'}
      </span>
    `;
  } else if (demandLevel === 'high') {
    return `
      <span class="badge badge-season-on" role="status" aria-label="${isHi ? 'ऑन-सीजन: भारी मांग और भीड़' : 'On-season: high demand'}">
        🔴 ${isHi ? 'ऑन-सीजन: भारी मांग' : 'On-season: high demand'}
      </span>
    `;
  }
  return `
    <span class="badge badge-season-shoulder" role="status" aria-label="${isHi ? 'मध्यम सीजन: संतुलित भीड़' : 'Shoulder: moderate crowds'}">
      🟡 ${isHi ? 'मध्यम सीजन: संतुलित' : 'Shoulder: moderate'}
    </span>
  `;
}

/**
 * Renders an accessible 12-Month Demand Bar chart (CSS only, zero libs)
 */
export function renderDemandBarHTML(seasonInfo, selectedMonth = null, lang = 'EN') {
  const isHi = lang === 'HI';
  const selMonth = selectedMonth ?? seasonInfo.month ?? new Date().getMonth();
  const months = seasonInfo.allMonths || [];

  return `
    <div class="demand-bar-wrapper" role="region" aria-label="${isHi ? '12 महीने का पर्यटन मांग चार्ट' : '12-month demand outlook'}">
      <div class="flex-between" style="align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 4px;">
        <span style="font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted); text-transform: uppercase;">
          🗓️ ${isHi ? '12 महीने का पर्यटन मांग चक्र (अनुमान)' : '12-Month Demand Cycle (Estimate)'}
        </span>
        <div class="flex gap-2" style="font-size: 0.72rem; color: var(--color-text-muted);">
          <span>🟢 ${isHi ? 'कम' : 'Low'}</span>
          <span>🟡 ${isHi ? 'मध्यम' : 'Mid'}</span>
          <span>🔴 ${isHi ? 'अधिक' : 'High'}</span>
        </div>
      </div>

      <div class="demand-bar-grid">
        ${months.map((m) => {
          const isSelected = m.month === selMonth;
          const levelClass = m.demandLevel === 'low' ? 'bar-low' : (m.demandLevel === 'high' ? 'bar-high' : 'bar-mid');
          const heightPct = m.demandLevel === 'low' ? '32%' : (m.demandLevel === 'high' ? '92%' : '60%');
          const shortName = isHi ? MONTH_SHORT_HI[m.month] : MONTH_SHORT_EN[m.month];
          const fullName = isHi ? MONTH_NAMES_HI[m.month] : MONTH_NAMES_EN[m.month];

          return `
            <div class="demand-bar-col ${isSelected ? 'selected' : ''}" title="${fullName}: ${m.demandLevel.toUpperCase()} demand (${m.reason})">
              <div class="demand-bar-track">
                <div class="demand-bar-fill ${levelClass}" style="height: ${heightPct};" aria-hidden="true"></div>
              </div>
              <span class="demand-bar-label ${isSelected ? 'active-label' : ''}">${shortName}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 8px; line-height: 1.4;">
        ℹ️ ${seasonInfo.estimateDisclaimer || 'Seasonality is an estimate based on general travel patterns, not live booking data.'}
      </div>
    </div>
  `;
}

/**
 * Renders Less-Crowded Alternative Destinations Cards for On-Season
 */
export function renderAlternativesHTML(alternativeIds = [], allDestinations = [], lang = 'EN') {
  const isHi = lang === 'HI';
  if (!alternativeIds || alternativeIds.length === 0) return '';

  const matched = alternativeIds.map(id => {
    return allDestinations.find(d => d.id === id) || {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      state: 'India',
      crowdBadge: 'Less Crowded Alternative'
    };
  });

  return `
    <div style="margin-top: var(--space-4);">
      <h4 style="margin: 0 0 var(--space-2) 0; font-size: 1rem; color: #1E3A8A;">
        🌿 ${isHi ? 'कम भीड़-भाड़ वाले शांत विकल्प:' : 'Consider a Quieter Alternative:'}
      </h4>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3);">
        ${matched.map(alt => `
          <div class="card" style="padding: var(--space-3); border: 1.5px solid #BFDBFE; background-color: #F8FAFC;">
            <div class="flex-between">
              <strong style="color: var(--color-primary);">${alt.name}</strong>
              <span class="badge badge-verified" style="font-size: 0.72rem;">${alt.state}</span>
            </div>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 4px 0 var(--space-2) 0;">
              ${alt.crowdBadge || 'Peaceful Hamlets & Verified Local Stays'}
            </p>
            <a href="#/plan?destination=${alt.id}" class="btn btn-outline btn-sm" style="width: 100%; text-align: center; font-size: 0.8rem; padding: 4px 8px;">
              ${isHi ? `योजना बदलें (${alt.name}) ➔` : `Switch Plan to ${alt.name} ➔`}
            </a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Renders Live Open-Meteo Weather Advisory Widget
 */
export function renderWeatherWidgetHTML(weatherData, lang = 'EN') {
  const isHi = lang === 'HI';

  if (!weatherData || weatherData.fallback) {
    return `
      <div style="background-color: #FEF3C7; border: 1.5px solid #FCD34D; border-radius: var(--radius-md); padding: var(--space-3); margin-top: var(--space-3);">
        <div class="flex gap-2" style="align-items: center;">
          <span>⚠️</span>
          <div>
            <strong style="color: #92400E; font-size: var(--font-size-xs);">${isHi ? 'लाइव मौसम उपलब्ध नहीं है' : 'Live weather not available right now'}</strong>
            <p style="margin: 2px 0 0; color: #78350F; font-size: 0.75rem;">
              ${isHi ? 'पहाड़ी क्षेत्रों में मौसम तेजी से बदलता है। यात्रा से पहले स्थानीय प्रशासन से संपर्क करें।' : 'Mountain weather changes rapidly. Check local road passes before departing.'}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  const days = weatherData.days || [];
  const warnings = weatherData.activeWarnings || [];

  return `
    <div class="weather-widget-box" style="background: linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%); border: 1.5px solid #BAE6FD; border-radius: var(--radius-md); padding: var(--space-4); margin-top: var(--space-4);">
      <div class="flex-between" style="align-items: center; margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2);">
        <div>
          <span class="badge" style="background: #E0F2FE; color: #0369A1; font-weight: 700; font-size: 0.75rem;">
            🌤️ ${isHi ? '7-दिवसीय लाइव पूर्वानुमान' : '7-Day Live Weather Forecast'}
          </span>
          <h4 style="margin: 4px 0 0; font-size: 1.05rem; color: #0369A1;">
            ${weatherData.current?.condition || 'Fair Weather'} (${weatherData.current?.minTemp}°C – ${weatherData.current?.maxTemp}°C)
          </h4>
        </div>
        <div style="font-size: 0.72rem; color: var(--color-text-muted);">
          <a href="${weatherData.attributionUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--color-text-muted); text-decoration: underline;">
            ${weatherData.attribution}
          </a>
        </div>
      </div>

      <!-- Weather Alerts if Any -->
      ${warnings.length > 0 ? `
        <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); margin-bottom: var(--space-3);">
          <strong style="color: #991B1B; font-size: var(--font-size-xs);">⚠️ ${isHi ? 'सफर सावधानी:' : 'Travel Caution:'}</strong>
          <ul style="margin: 2px 0 0 16px; padding: 0; color: #7F1D1D; font-size: 0.75rem;">
            ${warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- 7-Day Forecast Strip -->
      <div class="weather-days-strip">
        ${days.slice(0, 7).map(d => `
          <div class="weather-day-chip">
            <span class="weather-day-name">${d.dayLabel.split(',')[0]}</span>
            <span class="weather-icon">${d.icon}</span>
            <span class="weather-temps">${d.maxTemp}° / ${d.minTemp}°</span>
            ${d.precipProb > 25 ? `
              <span class="weather-precip" title="Precipitation Probability">💧${d.precipProb}%</span>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
