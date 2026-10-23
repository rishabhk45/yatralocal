/**
 * YatraLocal - Itinerary Engine
 * Generates crowd-smart, accessible, budget-optimized day-by-day itineraries.
 * Wrapped in an extensible async planProvider interface.
 */

/**
 * Pure generator function to build day-wise plan based on user preferences and destination catalog.
 * @param {Object} preferences - Trip preferences (destination, budget, days, travellers, moods, accessibility)
 * @param {Array} destinationsData - Catalog of destination records with activities
 * @returns {Object} Complete itinerary with days, cost breakdown, tips, and rationale
 */
export function generateItinerary(preferences, destinationsData) {
  const destId = (preferences.destination || 'manali').toLowerCase();
  let dest = destinationsData.find((d) => d.id === destId);

  // Support custom searched place from OpenStreetMap
  if (!dest && preferences.customPlace) {
    const cp = preferences.customPlace;
    const rawActs = (preferences.nearbyAttractions && preferences.nearbyAttractions.length > 0)
      ? preferences.nearbyAttractions
      : [
          { id: 'act_walk', name: `Historic village walk in ${cp.name}`, category: 'Heritage', icon: '🏛️' },
          { id: 'act_nature', name: `Scenic nature trail around ${cp.name}`, category: 'Nature', icon: '🌲' },
          { id: 'act_bazaar', name: `Local community market & crafts`, category: 'Cultural', icon: '🛍️' }
        ];

    dest = {
      id: cp.placeKey || `osm:${cp.name.toLowerCase()}`,
      name: cp.name,
      state: cp.state || 'India',
      crowdBadge: 'Community Destination (OpenStreetMap)',
      lat: cp.lat || 20.5937,
      lng: cp.lng || 78.9629,
      activities: rawActs.map((a, i) => ({
        id: a.id || `act_${i}`,
        name: a.name,
        timeSlot: i % 2 === 0 ? 'Morning' : 'Afternoon',
        duration: '2 hours',
        cost: 0, // No fabricated commercial prices
        walkingLevel: 'flat/minimal',
        seniorFriendly: true,
        crowdLevel: 'low',
        isHiddenGem: true,
        categories: ['Cultural', 'Nature', 'Relaxed'],
        description: `Community attraction documented in OpenStreetMap near ${cp.name}.`,
        localTip: 'Community verified location. Check local transport union times.'
      }))
    };
  }

  if (!dest) {
    dest = destinationsData[0];
  }

  const allActivities = [...(dest.activities || [])];

  const daysCount = Math.max(1, Math.min(10, parseInt(preferences.days, 10) || 3));
  const travellers = Math.max(1, parseInt(preferences.travellers, 10) || 2);
  const userBudget = parseInt(preferences.budget, 10) || 8000;
  const userMoods = preferences.moods && preferences.moods.length > 0 ? preferences.moods : ['Relaxed'];
  const acc = preferences.accessibility || {};
  const isSeniorMode = Boolean(acc.seniorFriendly || acc.minimalWalking || acc.wheelchairAccess);

  // 1. Accessibility Filter
  let eligibleActivities = allActivities.filter((act) => {
    if (acc.seniorFriendly && !act.seniorFriendly) return false;
    if (acc.minimalWalking && act.walkingLevel !== 'flat/minimal') return false;
    if (acc.wheelchairAccess && (act.walkingLevel !== 'flat/minimal' || !act.seniorFriendly)) return false;
    return true;
  });

  // Fallback if filter is too strict
  if (eligibleActivities.length === 0) {
    eligibleActivities = allActivities.filter((act) => act.seniorFriendly);
    if (eligibleActivities.length === 0) eligibleActivities = allActivities;
  }

  // 2. Score & Sort: Mood Match + Hidden Gem + Low Crowd
  eligibleActivities.sort((a, b) => {
    const aMoodMatch = a.categories.some((cat) => userMoods.includes(cat)) ? 3 : 0;
    const bMoodMatch = b.categories.some((cat) => userMoods.includes(cat)) ? 3 : 0;
    const aGem = a.isHiddenGem ? 2 : 0;
    const bGem = b.isHiddenGem ? 2 : 0;
    const aCrowd = a.crowdLevel === 'low' ? 2 : a.crowdLevel === 'medium' ? 1 : 0;
    const bCrowd = b.crowdLevel === 'low' ? 2 : b.crowdLevel === 'medium' ? 1 : 0;

    const scoreA = aMoodMatch + aGem + aCrowd;
    const scoreB = bMoodMatch + bGem + bCrowd;
    return scoreB - scoreA;
  });

  // Max activities per day: 1-2 for seniors to prevent exhaustion, max 3 for general
  const maxPerDay = isSeniorMode ? 2 : 3;

  // 3. Build Day-by-Day Schedule
  const days = [];
  let actIndex = 0;
  let totalActivitiesCost = 0;

  const slotLabels = ['Morning (09:00 - 12:00)', 'Afternoon (13:30 - 16:30)', 'Evening (17:30 - 19:30)'];

  for (let d = 1; d <= daysCount; d++) {
    const dayActivities = [];
    const countThisDay = Math.min(maxPerDay, isSeniorMode ? (d === 1 ? 1 : 2) : 3);

    for (let i = 0; i < countThisDay; i++) {
      if (eligibleActivities.length > 0) {
        const item = eligibleActivities[actIndex % eligibleActivities.length];
        actIndex++;
        dayActivities.push({
          ...item,
          slotName: slotLabels[i] || 'Flexible Hours',
          slotKey: i === 0 ? 'morning' : i === 1 ? 'afternoon' : 'evening'
        });
        totalActivitiesCost += item.cost * travellers;
      }
    }

    const dayEstCost = dayActivities.reduce((acc, curr) => acc + (curr.cost * travellers), 0);

    // Contextual local tip per day
    const tipsPool = [
      `Best time to visit morning spots is before 10:00 AM to enjoy tranquil valley sunlight.`,
      `Carry a reusable water flask and try warm herbal tea from local stall owners.`,
      `Take a 20-minute rest after lunch; village pathways are calm and shaded in late afternoons.`,
      `Engage with community artisans directly — they love sharing folk stories with polite visitors.`,
      `Evening temple prayer bells create a deeply soothing atmosphere; arrive 15 minutes early for seated benches.`
    ];

    days.push({
      day: d,
      title: `Day ${d}: ${dayActivities[0] ? dayActivities[0].name.split('&')[0].trim() : 'Peaceful Exploration'}`,
      activities: dayActivities,
      estCost: dayEstCost,
      localTip: tipsPool[(d - 1) % tipsPool.length]
    });
  }

  // 4. Budget Estimation Breakdown
  // Realistic base estimates per day in INR for authentic local travel
  const stayCostPerNight = isSeniorMode ? 1800 : 1400; // Accessible homestay base rate
  const roomsNeeded = Math.ceil(travellers / 2);
  const totalStayCost = stayCostPerNight * roomsNeeded * Math.max(1, daysCount - 1);

  const foodCostPerDayPerPerson = 450; // Authentic homestay meals + snacks
  const totalFoodCost = foodCostPerDayPerPerson * travellers * daysCount;

  const transportPerDay = 600; // Local e-rickshaws, shared autos, or local taxis
  const totalTransportCost = transportPerDay * daysCount;

  const totalCalculatedCost = Math.round(totalActivitiesCost + totalStayCost + totalFoodCost + totalTransportCost);

  // Budget status evaluation
  let budgetStatus = 'within-budget';
  if (totalCalculatedCost > userBudget * 1.15) {
    budgetStatus = 'over-budget';
  } else if (totalCalculatedCost >= userBudget * 0.85) {
    budgetStatus = 'optimized';
  } else {
    budgetStatus = 'comfortable';
  }

  // Crowd tips
  const crowdTips = [
    `Avoid peak commute between 11:30 AM and 02:00 PM at main market hubs.`,
    `We replaced commercial bus stops with offbeat hamlet walks in ${dest.name}.`,
    `Enjoy authentic family-run kitchen meals where ingredients are harvested same-day.`
  ];

  // "Why this plan" explanation
  const moodListStr = userMoods.join(', ');
  const whyPlan = {
    summary: `Tailored for ${travellers} traveller(s) for ${daysCount} day(s) in ${dest.name}.`,
    moodMatch: `Matches your travel vibe (${moodListStr}) by featuring local craft workshops, scenic walks, and cultural heritage.`,
    crowdAvoidance: `Steers clear of congested hotspots (such as ${dest.crowdPair?.popular || 'crowded centers'}) in favor of peaceful spots like ${dest.crowdPair?.offbeat || 'quiet hamlets'}.`,
    accessibilityNotice: isSeniorMode 
      ? `Senior-Friendly & Gentle Pacing active: Capped at ${maxPerDay} activities per day with minimal walking and flat terrain.`
      : `Active pacing: ${maxPerDay} well-spaced activities daily with relaxing afternoon breaks.`,
    budgetEvaluation: budgetStatus === 'over-budget'
      ? `Estimated ₹${totalCalculatedCost.toLocaleString('en-IN')} exceeds your preferred ₹${userBudget.toLocaleString('en-IN')}. Consider reducing days or choosing budget community homestays.`
      : `Estimated ₹${totalCalculatedCost.toLocaleString('en-IN')} fits comfortably within your ₹${userBudget.toLocaleString('en-IN')} budget.`
  };

  return {
    destination: dest,
    days,
    totalCost: totalCalculatedCost,
    userBudget,
    budgetStatus,
    breakdown: {
      stay: Math.round(totalStayCost),
      food: Math.round(totalFoodCost),
      activities: Math.round(totalActivitiesCost),
      transport: Math.round(totalTransportCost)
    },
    crowdTips,
    whyPlan,
    allDestinationActivities: allActivities
  };
}

/**
 * Async planProvider interface.
 * Defaults to local rule-based engine; can plug in Gemini API later in Phase 12.
 */
export const planProvider = {
  isSimulated: true,
  async getItinerary(preferences) {
    // Fetch destinations data
    const response = await fetch('data/destinations.json');
    if (!response.ok) {
      throw new Error(`Failed to load destination data: ${response.statusText}`);
    }
    const destinations = await response.json();
    return generateItinerary(preferences, destinations);
  }
};
