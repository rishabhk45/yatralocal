/**
 * YatraLocal - LLM Trip Planner Provider (Gemini API with Seamless Fallback)
 * 
 * Capabilities:
 * 1. Calls the serverless /netlify/functions/plan or /api/plan endpoint with 15s timeout and 1 retry.
 * 2. Automatically falls back to local deterministic rule-based engine when:
 *    - Serverless endpoint is unreachable or 404/503 (e.g. running static serve without serverless)
 *    - LLM_API_KEY is not configured
 *    - Timeout occurs (>15s)
 * 3. Client-side validation: verifies activity IDs exist in catalog and recomputes all costs.
 * 4. Transparently badges itinerary as "✨ AI-Generated (Gemini)" or "Simulated AI (offline fallback)".
 * 5. Supports "Ask YatraLocal" conversational refinement ("make day 2 more relaxed", etc.).
 */

import { generateItinerary } from './itinerary.js';
import { store } from './store.js';

// Clean user input
export function sanitizeClientInput(str, maxLength = 200) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '')
    .trim()
    .slice(0, maxLength);
}

// Fetch destination activities catalog
async function fetchDestinationsCatalog() {
  const candidates = ['data/destinations.json', '../data/destinations.json', '/data/destinations.json'];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
  }
  throw new Error('Unable to load destinations catalog');
}

// Strict Client-Side Validation and Cost Recalculation
function validateAndRecalculatePlan(planData, catalog, preferences) {
  const destId = (preferences.destination || 'manali').toLowerCase();
  const dest = catalog.find(d => d.id === destId) || catalog[0];
  const allActs = dest.activities || [];
  const actsMap = new Map(allActs.map(a => [a.id, a]));

  const days = Array.isArray(planData.days) ? planData.days : [];
  const travellers = Math.max(1, parseInt(preferences.travellers, 10) || 2);
  const userBudget = parseInt(preferences.budget, 10) || 8000;
  const isSenior = Boolean(preferences.accessibility?.seniorFriendly || preferences.accessibility?.minimalWalking);

  let totalActivitiesCost = 0;
  let fallbackIndex = 0;

  const validatedDays = days.map((dayObj, dIdx) => {
    const rawActivities = dayObj.activities || [];
    const validActivities = [];

    rawActivities.forEach((act, aIdx) => {
      let matched = actsMap.get(act.id);
      if (!matched) {
        // Unknown ID produced by LLM — map to valid catalog activity
        matched = allActs[fallbackIndex % allActs.length];
        fallbackIndex++;
      }
      validActivities.push({
        ...matched,
        slotName: act.slotName || (aIdx === 0 ? 'Morning (09:00 - 12:00)' : aIdx === 1 ? 'Afternoon (13:30 - 16:30)' : 'Evening (17:30 - 19:30)'),
        slotKey: act.slotKey || (aIdx === 0 ? 'morning' : aIdx === 1 ? 'afternoon' : 'evening'),
        customLocalTip: sanitizeClientInput(act.customLocalTip || act.localTip || '')
      });
      totalActivitiesCost += matched.cost * travellers;
    });

    const dayEstCost = validActivities.reduce((acc, curr) => acc + (curr.cost * travellers), 0);

    return {
      day: dIdx + 1,
      title: sanitizeClientInput(dayObj.title || `Day ${dIdx + 1}: ${validActivities[0]?.name || 'Exploration'}`),
      activities: validActivities,
      estCost: dayEstCost,
      localTip: sanitizeClientInput(dayObj.localTip || 'Enjoy local authentic village hospitality.')
    };
  });

  // Calculate real stay, food and transport costs purely in code
  const stayCostPerNight = isSenior ? 1800 : 1400;
  const roomsNeeded = Math.ceil(travellers / 2);
  const totalStayCost = stayCostPerNight * roomsNeeded * Math.max(1, validatedDays.length - 1);
  const totalFoodCost = 450 * travellers * validatedDays.length;
  const totalTransportCost = 600 * validatedDays.length;
  const totalCalculatedCost = Math.round(totalActivitiesCost + totalStayCost + totalFoodCost + totalTransportCost);

  let budgetStatus = 'within-budget';
  if (totalCalculatedCost > userBudget * 1.15) {
    budgetStatus = 'over-budget';
  } else if (totalCalculatedCost >= userBudget * 0.85) {
    budgetStatus = 'optimized';
  } else {
    budgetStatus = 'comfortable';
  }

  return {
    ...planData,
    destination: dest,
    days: validatedDays,
    totalCost: totalCalculatedCost,
    userBudget,
    budgetStatus,
    breakdown: {
      stay: Math.round(totalStayCost),
      food: Math.round(totalFoodCost),
      activities: Math.round(totalActivitiesCost),
      transport: Math.round(totalTransportCost)
    },
    allDestinationActivities: allActs
  };
}

// Low-level fetcher with timeout and fallback endpoints
async function callServerlessPlanApi(payload, timeoutMs = 15000) {
  const endpoints = ['/.netlify/functions/plan', '/api/plan', 'http://localhost:8888/.netlify/functions/plan'];
  let lastError = null;

  for (const url of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (response.ok) {
        return await response.json();
      }

      // If server responded with 503 (key missing) or 429 (rate limit) or 502
      const errJson = await response.json().catch(() => null);
      if (response.status === 429) {
        throw new Error(errJson?.message || 'Rate limit reached. Please wait a moment.');
      }
      if (response.status === 503) {
        console.info('[LLM Provider] LLM_API_KEY not configured on server. Transitioning to deterministic fallback.');
        return null; // Signals fallback
      }

      lastError = new Error(errJson?.message || `Endpoint ${url} failed with status ${response.status}`);
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.warn(`[LLM Provider] Request to ${url} timed out after ${timeoutMs}ms`);
      }
      lastError = err;
    }
  }

  // If endpoints are unreachable (e.g. running plain npx serve), fallback
  return null;
}

export const llmPlanProvider = {
  isSimulated: false,

  /**
   * Generates a new itinerary via LLM with 1 retry and fallback to deterministic engine
   */
  async getItinerary(preferences) {
    const catalog = await fetchDestinationsCatalog();
    const currentLang = (store.getState().language || 'EN').toLowerCase();
    const isSaral = typeof document !== 'undefined' && document.documentElement.classList.contains('saral');

    const payload = {
      destination: preferences.destination || 'manali',
      budget: preferences.budget || 8000,
      days: preferences.days || 3,
      travellers: preferences.travellers || 2,
      moods: preferences.moods || ['Relaxed'],
      accessibility: preferences.accessibility || {},
      language: currentLang,
      saralMode: isSaral,
      catalog
    };

    let serverResult = null;
    let attempts = 0;
    const maxAttempts = 2; // Initial + 1 retry

    while (attempts < maxAttempts && !serverResult) {
      attempts++;
      try {
        serverResult = await callServerlessPlanApi(payload, 15000);
        if (serverResult) break;
      } catch (err) {
        console.warn(`[LLM Provider] Attempt ${attempts} failed:`, err.message);
        if (attempts >= maxAttempts) break;
      }
    }

    if (serverResult && serverResult.isLlmGenerated && Array.isArray(serverResult.days)) {
      const validated = validateAndRecalculatePlan(serverResult, catalog, preferences);
      return {
        ...validated,
        isLlmGenerated: true,
        providerName: 'gemini'
      };
    }

    // Deterministic Rule-Based Fallback
    console.info('[LLM Provider] Using deterministic rule-based itinerary engine.');
    const fallbackPlan = generateItinerary(preferences, catalog);
    return {
      ...fallbackPlan,
      isLlmGenerated: false,
      providerName: 'rule-based'
    };
  },

  /**
   * Refines an existing itinerary with a user request ("Ask YatraLocal")
   */
  async refineItinerary(userMessage, currentPlan, preferences) {
    const cleanMsg = sanitizeClientInput(userMessage, 200);
    if (!cleanMsg) throw new Error('Please enter a question or request.');

    const catalog = await fetchDestinationsCatalog();
    const currentLang = (store.getState().language || 'EN').toLowerCase();
    const isSaral = typeof document !== 'undefined' && document.documentElement.classList.contains('saral');

    const payload = {
      destination: preferences.destination || 'manali',
      budget: preferences.budget || currentPlan.userBudget || 8000,
      days: preferences.days || currentPlan.days.length || 3,
      travellers: preferences.travellers || 2,
      moods: preferences.moods || ['Relaxed'],
      accessibility: preferences.accessibility || {},
      language: currentLang,
      saralMode: isSaral,
      message: cleanMsg,
      currentPlan,
      catalog
    };

    const serverResult = await callServerlessPlanApi(payload, 15000);

    if (serverResult && serverResult.isLlmGenerated && Array.isArray(serverResult.days)) {
      const validated = validateAndRecalculatePlan(serverResult, catalog, preferences);
      return {
        ...validated,
        isLlmGenerated: true,
        providerName: 'gemini'
      };
    }

    // Client-side smart conversational adjustment if LLM server is offline
    console.info('[LLM Provider] Offline refinement fallback.');
    const updatedPlan = JSON.parse(JSON.stringify(currentPlan));
    const dest = catalog.find(d => d.id === (preferences.destination || 'manali').toLowerCase()) || catalog[0];
    const allActs = dest.activities || [];

    const lower = cleanMsg.toLowerCase();
    if (lower.includes('relax') || lower.includes('chill') || lower.includes('slow')) {
      // Reduce activities on each day to maximum 1 or 2
      updatedPlan.days.forEach(d => {
        if (d.activities.length > 1) {
          d.activities = [d.activities[0]];
        }
        d.localTip = 'Relaxed village pacing applied: Enjoy leisurely herbal tea and mountain views.';
      });
    } else if (lower.includes('food') || lower.includes('eat') || lower.includes('dish')) {
      // Find food or cultural activities
      const foodActs = allActs.filter(a => a.categories.some(c => c.toLowerCase().includes('food') || c.toLowerCase().includes('culture')));
      if (foodActs.length > 0 && updatedPlan.days[0]) {
        updatedPlan.days[0].activities[0] = {
          ...foodActs[0],
          slotName: 'Morning Food & Culture Walk',
          slotKey: 'morning'
        };
      }
    } else if (lower.includes('temple') || lower.includes('spiritual')) {
      const spiritActs = allActs.filter(a => a.categories.some(c => c.toLowerCase().includes('spiritual')));
      if (spiritActs.length > 0 && updatedPlan.days[0]) {
        updatedPlan.days[0].activities[0] = {
          ...spiritActs[0],
          slotName: 'Morning Spiritual Darshan',
          slotKey: 'morning'
        };
      }
    }

    const validatedFallback = validateAndRecalculatePlan(updatedPlan, catalog, preferences);
    return {
      ...validatedFallback,
      isLlmGenerated: false,
      providerName: 'rule-based-refinement'
    };
  }
};

// Aliased default export
export default llmPlanProvider;
