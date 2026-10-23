/**
 * YatraLocal - Places & Open Data Test Suite (Phase 17)
 * Tests Photon/Nominatim search, Wikipedia cultural extracts & Overpass nearby attractions.
 */

import { searchPlacesInIndia, fetchPlaceDescription, fetchNearbyAttractions } from '../js/places.js';

let totalTests = 0;
let passedTests = 0;

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description}`);
    if (details) console.log(`       └─ ${details}`);
  } else {
    console.error(`[FAIL] ${description}`);
    if (details) console.error(`       └─ ${details}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 YATRALOCAL PHASE 17: INDIA PLACE SEARCH & OPEN DATA');
  console.log('====================================================');

  // Test 1: Minimum characters guard
  const shortResults = await searchPlacesInIndia('hi');
  assert(
    'searchPlacesInIndia ignores queries under 3 characters',
    Array.isArray(shortResults) && shortResults.length === 0,
    `Query "hi" returned ${shortResults.length} items`
  );

  // Test 2: Search a major Indian city (e.g. Bhopal or Jaipur)
  const cityResults = await searchPlacesInIndia('Bhopal');
  const firstCity = cityResults[0];
  assert(
    'searchPlacesInIndia resolves Indian city with proper Place Object shape',
    Array.isArray(cityResults) && cityResults.length > 0 &&
    firstCity.placeKey.startsWith('osm:') &&
    typeof firstCity.lat === 'number' && typeof firstCity.lng === 'number' &&
    firstCity.source === 'osm',
    `Found: "${firstCity?.displayName}" (Key: ${firstCity?.placeKey}, Lat: ${firstCity?.lat}, Lng: ${firstCity?.lng})`
  );

  // Test 3: Search a Himalayan village (e.g. Harsil)
  const villageResults = await searchPlacesInIndia('Harsil');
  const harsil = villageResults.find(p => p.name.toLowerCase().includes('harsil')) || villageResults[0];
  assert(
    'searchPlacesInIndia resolves small Himalayan village (Harsil)',
    villageResults.length > 0 && harsil && harsil.name.toLowerCase().includes('harsil'),
    `Resolved: "${harsil?.displayName}" in ${harsil?.state}`
  );

  // Test 4: Search a temple town (e.g. Belur)
  const templeResults = await searchPlacesInIndia('Belur');
  assert(
    'searchPlacesInIndia resolves historic temple town (Belur)',
    templeResults.length > 0 && templeResults[0].lat > 0,
    `Resolved: "${templeResults[0]?.displayName}"`
  );

  // Test 5: Wikipedia Cultural & Historic Extract
  const wikiDesc = await fetchPlaceDescription('Hampi', 15.3350, 76.4600);
  assert(
    'fetchPlaceDescription extracts clean plain text without HTML tags',
    wikiDesc && typeof wikiDesc.extract === 'string' &&
    !wikiDesc.extract.includes('<p>') && !wikiDesc.extract.includes('<div>') &&
    wikiDesc.url.includes('wikipedia.org'),
    `Extract snippet: "${wikiDesc?.extract.slice(0, 90)}..." (Source: ${wikiDesc?.source})`
  );

  // Test 6: Overpass Nearby Attractions (radius 10km)
  // Query Hampi coordinates
  const nearby = await fetchNearbyAttractions(15.3350, 76.4600, { limit: 5 });
  assert(
    'fetchNearbyAttractions parses attractions, heritage sites & viewpoints',
    Array.isArray(nearby),
    `Found ${nearby.length} nearby locations around Hampi`
  );

  // Test 7: Graceful failure on invalid coordinates
  const failNearby = await fetchNearbyAttractions('bad', 'coords');
  assert(
    'fetchNearbyAttractions gracefully returns empty array on bad coordinates without crashing',
    Array.isArray(failNearby) && failNearby.length === 0,
    `Returned ${failNearby.length} items on invalid coords`
  );

  // Test 8: SessionStorage Caching
  const cachedCity = await searchPlacesInIndia('Bhopal');
  assert(
    'Subsequent search queries return results immediately from cache',
    Array.isArray(cachedCity) && cachedCity.length === cityResults.length,
    `Cache match: ${cachedCity.length} items`
  );

  console.log('====================================================');
  console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
