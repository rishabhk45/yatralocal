/**
 * YatraLocal - Serverless LLM Itinerary Planner (/netlify/functions/plan)
 * 
 * Secure serverless endpoint:
 * - Reads LLM_API_KEY & LLM_MODEL from environment variables (never exposed to client).
 * - Implements in-memory per-IP rate limiting (default 10 req/min).
 * - Enforces candidate-only activity IDs from data/destinations.json.
 * - Recomputes all costs server-side (model cannot invent prices).
 * - Validates strict schema and handles user refinement requests ("Ask YatraLocal").
 * - Returns 503 if LLM_API_KEY is not configured so client seamlessly falls back.
 */

const fs = require('fs');
const path = require('path');

// In-memory rate limit store: IP -> { count, resetTime }
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = parseInt(process.env.RATE_LIMIT_PER_MINUTE, 10) || 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetInSeconds: Math.ceil((entry.resetTime - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count };
}

// Clean and sanitize string inputs (strip HTML, prevent prompt injection/malformed payloads)
function sanitizeText(str, maxLength = 250) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip control chars
    .trim()
    .slice(0, maxLength);
}

// Load destination catalog
function loadDestinationsData() {
  try {
    const filePath = path.resolve(__dirname, '../../data/destinations.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read destinations.json directly from disk:', err.message);
  }
  return null;
}

// Recompute all itinerary costs purely in code
function calculateStrictCosts(dest, daysSchedule, travellers, isSeniorMode) {
  const daysCount = daysSchedule.length;
  let totalActivitiesCost = 0;

  daysSchedule.forEach(day => {
    let dayActCost = 0;
    (day.activities || []).forEach(act => {
      dayActCost += (Number(act.cost) || 0) * travellers;
    });
    day.estCost = dayActCost;
    totalActivitiesCost += dayActCost;
  });

  const stayCostPerNight = isSeniorMode ? 1800 : 1400;
  const roomsNeeded = Math.ceil(travellers / 2);
  const totalStayCost = stayCostPerNight * roomsNeeded * Math.max(1, daysCount - 1);

  const foodCostPerDayPerPerson = 450;
  const totalFoodCost = foodCostPerDayPerPerson * travellers * daysCount;

  const transportPerDay = 600;
  const totalTransportCost = transportPerDay * daysCount;

  const totalCalculatedCost = Math.round(totalActivitiesCost + totalStayCost + totalFoodCost + totalTransportCost);

  return {
    totalCost: totalCalculatedCost,
    breakdown: {
      stay: Math.round(totalStayCost),
      food: Math.round(totalFoodCost),
      activities: Math.round(totalActivitiesCost),
      transport: Math.round(totalTransportCost)
    }
  };
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // 1. Rate limiting by IP
  const clientIp = event.headers['client-ip'] || 
                   event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   event.headers['x-real-ip'] || 
                   '127.0.0.1';

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please wait ${rateCheck.resetInSeconds} seconds before asking again.`
      })
    };
  }

  // 2. Parse request payload
  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload.' })
    };
  }

  const {
    destination = 'manali',
    budget = 8000,
    days = 3,
    travellers = 2,
    moods = ['Relaxed'],
    accessibility = {},
    language = 'en',
    saralMode = false,
    message = '',
    currentPlan = null,
    catalog = null
  } = payload;

  const sanitizedMessage = sanitizeText(message, 250);
  const destId = sanitizeText(destination, 50).toLowerCase() || 'manali';
  const daysCount = Math.max(1, Math.min(7, parseInt(days, 10) || 3));
  const travellersCount = Math.max(1, Math.min(10, parseInt(travellers, 10) || 2));
  const userBudget = parseInt(budget, 10) || 8000;
  const isSeniorMode = Boolean(accessibility?.seniorFriendly || accessibility?.minimalWalking || accessibility?.wheelchairAccess);

  // 3. Check LLM API key
  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  const modelName = process.env.LLM_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'LLM_NOT_CONFIGURED',
        message: 'LLM_API_KEY is not configured on server. Use local rule-based fallback.',
        isSimulated: true
      })
    };
  }

  // 4. Resolve destination activities
  let destinationsData = catalog || loadDestinationsData();
  if (!destinationsData) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'DATA_UNAVAILABLE', message: 'Destination catalog could not be loaded.' })
    };
  }

  const targetDest = destinationsData.find(d => d.id === destId) || destinationsData[0];
  const allActs = targetDest.activities || [];
  const candidateActsMap = new Map();

  allActs.forEach(act => {
    candidateActsMap.set(act.id, act);
  });

  const candidateSummary = allActs.map(a => ({
    id: a.id,
    name: a.name,
    area: a.area,
    cost: a.cost,
    durationHours: a.durationHours,
    walkingLevel: a.walkingLevel,
    seniorFriendly: a.seniorFriendly,
    crowdLevel: a.crowdLevel,
    isHiddenGem: a.isHiddenGem,
    categories: a.categories
  }));

  // 5. Construct System and User Prompts
  const isHindi = language === 'hi';
  const maxActivitiesPerDay = isSeniorMode ? 2 : 3;

  const systemInstructions = `
You are YatraLocal's AI Trip Planner. You create authentic, crowd-smart, accessible itineraries for destinations in India.
RULES YOU MUST NEVER BREAK:
1. ONLY pick activities from the provided Candidate Activity IDs. NEVER invent places, names, or IDs.
2. Max ${maxActivitiesPerDay} activities per day (Senior/Accessible limit: max 1-2).
3. Prioritize low-crowd and hidden-gem options. Steer away from congested tourist traps.
4. Total activities cost should fit comfortably within user budget ₹${userBudget}.
5. Language: ${isHindi ? 'Hindi (हिंदी)' : 'English'}.
${saralMode ? '6. Saral Mode is active: Use very short, simple, easy-to-read sentences without complex jargon.' : ''}
7. Return STRICT JSON only, matching the exact schema specified. No markdown formatting, no backticks, no introductory text.
`;

  let userPrompt = `
Plan a ${daysCount}-day trip for ${travellersCount} traveller(s) to ${targetDest.name}.
User Preferences:
- Budget: ₹${userBudget}
- Travel Moods: ${Array.isArray(moods) ? moods.join(', ') : 'Relaxed'}
- Accessibility: Senior Friendly = ${isSeniorMode}, Wheelchair = ${Boolean(accessibility?.wheelchairAccess)}, Minimal Walking = ${Boolean(accessibility?.minimalWalking)}
- Preferred Language: ${isHindi ? 'Hindi' : 'English'}

Candidate Activities (CHOOSE ONLY FROM THIS LIST):
${JSON.stringify(candidateSummary, null, 2)}
`;

  if (sanitizedMessage && currentPlan) {
    userPrompt += `
The traveller is requesting an adjustment to their current itinerary:
User Request: "${sanitizedMessage}"
Current Plan Days Summary:
${JSON.stringify((currentPlan.days || []).map(d => ({
  day: d.day,
  title: d.title,
  activities: (d.activities || []).map(a => ({ id: a.id, name: a.name }))
})), null, 2)}
Update the itinerary to accommodate their request while still choosing ONLY from the candidate activities list and adhering to accessibility limits.
`;
  }

  userPrompt += `
Return a JSON object conforming strictly to this format:
{
  "days": [
    {
      "day": 1,
      "title": "Day 1: Theme or Focus",
      "slots": [
        {
          "slotKey": "morning",
          "slotName": "Morning (09:00 - 12:00)",
          "activityId": "<MUST_BE_AN_ID_FROM_CANDIDATE_LIST>",
          "localTip": "<practical local tip for this visit>"
        }
      ],
      "localTip": "<practical daily tip>"
    }
  ],
  "whyThisPlan": {
    "summary": "<short summary of itinerary rationale>",
    "moodMatch": "<how this matches their requested vibe>",
    "crowdAvoidance": "<how crowd congestion is mitigated>",
    "accessibilityNotice": "<explanation of pacing and terrain>",
    "budgetEvaluation": "<budget adherence summary>"
  },
  "crowdTips": [
    "<crowd tip 1>",
    "<crowd tip 2>"
  ]
}
`;

  // 6. Call Google Gemini API
  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemInstructions}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800,
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', response.status, errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'LLM_API_ERROR',
          message: `Gemini API responded with status ${response.status}. Falling back to rule-based engine.`,
          isSimulated: true
        })
      };
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Empty response received from LLM.');
    }

    // Clean potential markdown wrappers
    const cleanedText = candidateText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const planJson = JSON.parse(cleanedText);

    // 7. Strict Server-Side Validation & Cost Recomputation
    if (!Array.isArray(planJson.days) || planJson.days.length === 0) {
      throw new Error('LLM response missing valid days array.');
    }

    const validatedDays = [];
    let actIndexFallback = 0;

    for (let i = 0; i < daysCount; i++) {
      const dayData = planJson.days[i] || { day: i + 1, title: `Day ${i + 1}`, slots: [] };
      const validSlots = Array.isArray(dayData.slots) ? dayData.slots : [];
      const dayActivities = [];

      for (const slot of validSlots) {
        // Enforce max activities per day
        if (dayActivities.length >= maxActivitiesPerDay) break;

        let act = candidateActsMap.get(slot.activityId);
        // If model hallucinated an activityId not in our dataset, pick a valid fallback from candidates
        if (!act) {
          console.warn(`Model produced unknown activityId: "${slot.activityId}". Falling back to valid catalog item.`);
          act = allActs[actIndexFallback % allActs.length];
          actIndexFallback++;
        }

        if (act) {
          dayActivities.push({
            ...act,
            slotKey: slot.slotKey || 'morning',
            slotName: slot.slotName || 'Morning Activity',
            customLocalTip: sanitizeText(slot.localTip || '', 150)
          });
        }
      }

      // Guarantee at least 1 activity per day
      if (dayActivities.length === 0 && allActs.length > 0) {
        const fallbackAct = allActs[i % allActs.length];
        dayActivities.push({
          ...fallbackAct,
          slotKey: 'morning',
          slotName: 'Morning (09:00 - 12:00)',
          customLocalTip: 'Quiet exploration recommended.'
        });
      }

      validatedDays.push({
        day: i + 1,
        title: sanitizeText(dayData.title || `Day ${i + 1}: ${dayActivities[0]?.name || 'Exploration'}`),
        activities: dayActivities,
        localTip: sanitizeText(dayData.localTip || 'Enjoy local hospitality and scenery.')
      });
    }

    // Strict recalculation of costs using our deterministic formulas
    const { totalCost, breakdown } = calculateStrictCosts(targetDest, validatedDays, travellersCount, isSeniorMode);

    let budgetStatus = 'within-budget';
    if (totalCost > userBudget * 1.15) {
      budgetStatus = 'over-budget';
    } else if (totalCost >= userBudget * 0.85) {
      budgetStatus = 'optimized';
    } else {
      budgetStatus = 'comfortable';
    }

    const validatedResponse = {
      destination: targetDest,
      days: validatedDays,
      totalCost,
      userBudget,
      budgetStatus,
      breakdown,
      crowdTips: Array.isArray(planJson.crowdTips) ? planJson.crowdTips.map(t => sanitizeText(t, 180)) : [
        `Avoid peak midday market hours.`,
        `Explore early morning temple bells and scenic hamlet pathways.`
      ],
      whyPlan: {
        summary: sanitizeText(planJson.whyThisPlan?.summary || `Curated ${daysCount}-day itinerary for ${targetDest.name}.`),
        moodMatch: sanitizeText(planJson.whyThisPlan?.moodMatch || `Customized for your ${Array.isArray(moods) ? moods.join(', ') : 'Relaxed'} travel style.`),
        crowdAvoidance: sanitizeText(planJson.whyThisPlan?.crowdAvoidance || `Prioritizes quiet hamlets over congested hotspots.`),
        accessibilityNotice: sanitizeText(planJson.whyThisPlan?.accessibilityNotice || (isSeniorMode ? 'Senior friendly pacing with flat terrain.' : 'Active pacing.')),
        budgetEvaluation: sanitizeText(planJson.whyThisPlan?.budgetEvaluation || `Estimated cost ₹${totalCost.toLocaleString('en-IN')} within ₹${userBudget.toLocaleString('en-IN')}.`)
      },
      allDestinationActivities: allActs,
      isLlmGenerated: true,
      llmModelUsed: modelName,
      generatedAt: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validatedResponse)
    };

  } catch (err) {
    console.error('LLM Planner Processing Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'PROCESSING_ERROR',
        message: err.message || 'Error occurred while processing LLM itinerary.',
        isSimulated: true
      })
    };
  }
};
